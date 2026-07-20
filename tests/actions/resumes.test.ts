import { describe, it, expect, vi, beforeEach } from "vitest";

const getSession = vi.fn();
vi.mock("@/server/get-session", () => ({
  getSession: () => getSession(),
  requireSession: async () => {
    const session = await getSession();
    if (!session) throw new RedirectError("/sign-in");
    return session;
  },
}));

const getResumeFileUrl = vi.fn();
const deleteResumeForUser = vi.fn();
vi.mock("@/server/data/resumes", () => ({
  getResumeFileUrl: (...a: unknown[]) => getResumeFileUrl(...a),
  deleteResumeForUser: (...a: unknown[]) => deleteResumeForUser(...a),
}));

const del = vi.fn();
vi.mock("@vercel/blob", () => ({ del: (...a: unknown[]) => del(...a) }));

class RedirectError extends Error {}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { deleteResume } = await import("@/actions/resumes");

const OWNER = "user-owner";
const BLOB_URL = "https://blob.example/resumes/owner/cv.pdf";

async function redirectOf(promise: Promise<unknown>): Promise<string> {
  const err = await promise.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(RedirectError);
  return (err as Error).message;
}

beforeEach(() => {
  deleteResumeForUser.mockReset().mockResolvedValue(undefined);
  getSession.mockReset().mockResolvedValue({ user: { id: OWNER } });
  getResumeFileUrl.mockReset().mockResolvedValue({ fileUrl: BLOB_URL });
  del.mockReset().mockResolvedValue(undefined);
});

describe("deleteResume", () => {
  it("sends an unauthenticated caller to sign-in, touching nothing", async () => {
    getSession.mockResolvedValue(null);

    expect(await redirectOf(deleteResume("r-1"))).toBe("/sign-in");
    expect(getResumeFileUrl).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    expect(deleteResumeForUser).not.toHaveBeenCalled();
  });

  // The lookup is the ownership boundary: someone else's id must look exactly
  // like a missing one, and must never reach the blob or the row.
  it("scopes the lookup to the caller and deletes nothing on a miss", async () => {
    getResumeFileUrl.mockResolvedValue(null);

    expect(await redirectOf(deleteResume("someone-elses"))).toBe(
      "/dashboard/resumes",
    );
    expect(getResumeFileUrl).toHaveBeenCalledWith("someone-elses", OWNER);
    expect(del).not.toHaveBeenCalled();
    expect(deleteResumeForUser).not.toHaveBeenCalled();
  });

  it("removes the blob and the row, both scoped to the caller", async () => {
    expect(await redirectOf(deleteResume("r-1"))).toBe("/dashboard/resumes");

    expect(del).toHaveBeenCalledWith(BLOB_URL);
    expect(deleteResumeForUser).toHaveBeenCalledWith("r-1", OWNER);
  });

  // A blob that outlives its row is billed forever, but a blob store outage
  // must not strand the user with a resume they cannot delete. The row wins.
  it("still deletes the row when the blob store fails", async () => {
    del.mockRejectedValue(new Error("blob store unreachable"));

    expect(await redirectOf(deleteResume("r-1"))).toBe("/dashboard/resumes");
    expect(deleteResumeForUser).toHaveBeenCalledWith("r-1", OWNER);
  });

  it("deletes a row whose upload never produced a blob", async () => {
    getResumeFileUrl.mockResolvedValue({ fileUrl: null });

    expect(await redirectOf(deleteResume("r-1"))).toBe("/dashboard/resumes");
    expect(del).not.toHaveBeenCalled();
    expect(deleteResumeForUser).toHaveBeenCalledWith("r-1", OWNER);
  });
});
