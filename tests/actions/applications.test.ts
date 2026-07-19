import { describe, it, expect, vi, beforeEach } from "vitest";

const updateMany = vi.fn();
const deleteMany = vi.fn();
const findFirst = vi.fn();
const create = vi.fn();
const count = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: { application: { updateMany, deleteMany, findFirst, create, count } },
}));

const getSession = vi.fn();
vi.mock("@/server/get-session", () => ({ getSession: () => getSession() }));

class RedirectError extends Error {}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

class AiError extends Error {}
const analyzeJobDescription = vi.fn();
const embedText = vi.fn();
const embedDocument = vi.fn();
const extractApplicationFields = vi.fn();
vi.mock("@/server/ai-client", () => ({
  analyzeJobDescription: (...a: unknown[]) => analyzeJobDescription(...a),
  embedText: (...a: unknown[]) => embedText(...a),
  embedDocument: (...a: unknown[]) => embedDocument(...a),
  extractApplicationFields: (...a: unknown[]) => extractApplicationFields(...a),
  AiError,
}));

const checkAiRateLimit = vi.fn();
vi.mock("@/server/rate-limit", () => ({
  checkAiRateLimit: () => checkAiRateLimit(),
}));

const matchSkillsSemantic = vi.fn();
vi.mock("@/server/semantic-skills", () => ({
  matchSkillsSemantic: (...a: unknown[]) => matchSkillsSemantic(...a),
}));

const getResumeText = vi.fn();
const hasResumeWithText = vi.fn();
vi.mock("@/server/data/resumes", () => ({
  getResumeText: (...a: unknown[]) => getResumeText(...a),
  hasResumeWithText: (...a: unknown[]) => hasResumeWithText(...a),
}));

const saveJdEmbedding = vi.fn();
const saveResumeEmbedding = vi.fn();
const getResumesNeedingEmbedding = vi.fn();
vi.mock("@/server/data/embeddings", () => ({
  saveJdEmbedding: (...a: unknown[]) => saveJdEmbedding(...a),
  saveResumeEmbedding: (...a: unknown[]) => saveResumeEmbedding(...a),
  getResumesNeedingEmbedding: (...a: unknown[]) =>
    getResumesNeedingEmbedding(...a),
}));

// sha256("Senior TS role") — precomputed so the hash-skip test can pin a
// matching stored hash without importing the hashing module.
const JD_TEXT = "Senior TS role";
const { sha256 } = await import("@/server/hash");
const JD_HASH = sha256(JD_TEXT);
const { EMBEDDING_MODEL } = await import("@/server/ai/models");

const OWNER = "user-owner";
const { MAX_APPLICATIONS } = await import("@/server/data/applications");
const { analysisCacheHash } = await import("@/server/analysis-cache");
const {
  createApplication,
  updateApplicationStatus,
  saveTailoredBullets,
  saveInterviewPrep,
  deleteApplication,
  analyzeApplication,
  computeResumeFit,
  autofillFromJd,
} = await import("@/actions/applications");

function applicationFormData(): FormData {
  const formData = new FormData();
  formData.set("company", "Acme");
  formData.set("role", "Senior Engineer");
  formData.set("status", "SAVED");
  formData.set("jobUrl", "");
  formData.set("jobDescription", "");
  formData.set("deadline", "");
  formData.set("notes", "");
  return formData;
}

beforeEach(() => {
  updateMany.mockReset().mockResolvedValue({ count: 1 });
  deleteMany.mockReset().mockResolvedValue({ count: 1 });
  findFirst.mockReset();
  create.mockReset().mockResolvedValue({ id: "app-new" });
  count.mockReset().mockResolvedValue(0);
  getSession.mockReset().mockResolvedValue({ user: { id: OWNER } });
  analyzeJobDescription.mockReset();
  embedText.mockReset().mockResolvedValue([0.1, 0.2]);
  embedDocument.mockReset().mockResolvedValue([0.3, 0.4]);
  checkAiRateLimit.mockReset().mockResolvedValue(true);
  matchSkillsSemantic.mockReset().mockResolvedValue({ matched: [] });
  getResumeText.mockReset().mockResolvedValue("");
  hasResumeWithText.mockReset().mockResolvedValue(true);
  saveJdEmbedding.mockReset().mockResolvedValue(undefined);
  saveResumeEmbedding.mockReset().mockResolvedValue(undefined);
  getResumesNeedingEmbedding.mockReset().mockResolvedValue([]);
  extractApplicationFields.mockReset().mockResolvedValue({
    company: "Acme Corp",
    role: "Senior Engineer",
    deadline: "2026-08-15",
  });
});

const LONG_JD =
  "We are hiring a Senior Backend Engineer at Acme Corp to build our platform.";

describe("autofillFromJd", () => {
  it("returns extracted fields for a substantial job description", async () => {
    const res = await autofillFromJd(LONG_JD);
    expect(res.fields).toEqual({
      company: "Acme Corp",
      role: "Senior Engineer",
      deadline: "2026-08-15",
    });
    expect(extractApplicationFields).toHaveBeenCalledWith(LONG_JD, OWNER);
  });

  it("refuses a too-short description without calling the model", async () => {
    const res = await autofillFromJd("Backend dev");
    expect(res.error).toMatch(/fuller job description/i);
    expect(extractApplicationFields).not.toHaveBeenCalled();
  });

  it("stops when the AI budget is exhausted", async () => {
    checkAiRateLimit.mockResolvedValue(false);
    const res = await autofillFromJd(LONG_JD);
    expect(res.error).toMatch(/rate limit/i);
    expect(extractApplicationFields).not.toHaveBeenCalled();
  });

  it("surfaces an AiError message", async () => {
    extractApplicationFields.mockRejectedValue(new AiError("The AI service failed."));
    const res = await autofillFromJd(LONG_JD);
    expect(res.error).toBe("The AI service failed.");
  });

  it("redirects to sign-in without a session", async () => {
    getSession.mockResolvedValue(null);
    await expect(autofillFromJd(LONG_JD)).rejects.toBeInstanceOf(RedirectError);
  });
});

const whereOf = (mock: typeof updateMany) => mock.mock.calls[0][0].where;

describe("createApplication", () => {
  it("refuses to create past MAX_APPLICATIONS and does not touch the table", async () => {
    count.mockResolvedValue(MAX_APPLICATIONS);

    const state = await createApplication({}, applicationFormData());

    expect(state.error).toMatch(/limit of 500 applications/);
    expect(create).not.toHaveBeenCalled();
  });

  it("counts only the caller's own applications against the cap", async () => {
    count.mockResolvedValue(MAX_APPLICATIONS);

    await createApplication({}, applicationFormData());

    expect(count).toHaveBeenCalledWith({ where: { userId: OWNER } });
  });

  it("creates when the user is below the cap", async () => {
    count.mockResolvedValue(MAX_APPLICATIONS - 1);

    await expect(
      createApplication({}, applicationFormData()),
    ).rejects.toThrow(RedirectError);

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ company: "Acme", userId: OWNER }),
    });
  });
});

describe("ownership scoping", () => {
  it("scopes updateApplicationStatus to the caller's userId", async () => {
    await updateApplicationStatus("app-1", "OFFER");
    expect(whereOf(updateMany)).toEqual({ id: "app-1", userId: OWNER });
  });

  it("scopes saveTailoredBullets to the caller's userId", async () => {
    await saveTailoredBullets("app-1", "exp", "- bullet");
    expect(whereOf(updateMany)).toEqual({ id: "app-1", userId: OWNER });
  });

  it("scopes saveInterviewPrep to the caller's userId", async () => {
    await saveInterviewPrep("app-1", "prep");
    expect(whereOf(updateMany)).toEqual({ id: "app-1", userId: OWNER });
  });

  it("scopes deleteApplication to the caller's userId", async () => {
    await expect(deleteApplication("app-1")).rejects.toBeInstanceOf(
      RedirectError,
    );
    expect(whereOf(deleteMany)).toEqual({ id: "app-1", userId: OWNER });
  });
});

describe("another user's row", () => {
  it("reports not-found rather than succeeding when nothing matched", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(updateApplicationStatus("someone-elses", "OFFER")).resolves
      .toEqual({ error: "Application not found." });
    await expect(saveTailoredBullets("someone-elses", "e", "b")).resolves.toEqual(
      { error: "Application not found." },
    );
    await expect(saveInterviewPrep("someone-elses", "p")).resolves.toEqual({
      error: "Application not found.",
    });
  });
});

describe("unauthenticated callers", () => {
  it("redirects to sign-in before touching the database", async () => {
    getSession.mockResolvedValue(null);

    await expect(updateApplicationStatus("app-1", "OFFER")).rejects.toBeInstanceOf(
      RedirectError,
    );
    await expect(saveTailoredBullets("app-1", "e", "b")).rejects.toBeInstanceOf(
      RedirectError,
    );
    await expect(deleteApplication("app-1")).rejects.toBeInstanceOf(RedirectError);

    expect(updateMany).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});

describe("status validation", () => {
  it("rejects a status outside the enum without writing", async () => {
    const result = await updateApplicationStatus(
      "app-1",
      "DROP TABLE" as never,
    );
    expect(result).toEqual({ error: "Invalid status." });
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("analyzeApplication", () => {
  beforeEach(() => {
    findFirst.mockResolvedValue({
      id: "app-1",
      userId: OWNER,
      jobDescription: JD_TEXT,
    });
    analyzeJobDescription.mockResolvedValue({
      requiredSkills: ["TypeScript"],
      niceToHave: [],
      seniority: "senior",
      summary: "role",
    });
  });

  it("requires a job description before spending the AI budget", async () => {
    findFirst.mockResolvedValue({ id: "app-1", jobDescription: "  " });
    const res = await analyzeApplication("app-1", {}, new FormData());
    expect(res).toEqual({ error: "Add a job description before analyzing." });
    expect(checkAiRateLimit).not.toHaveBeenCalled();
    expect(analyzeJobDescription).not.toHaveBeenCalled();
  });

  it("returns the rate-limit error without calling the model", async () => {
    checkAiRateLimit.mockResolvedValue(false);
    const res = await analyzeApplication("app-1", {}, new FormData());
    expect(res.error).toMatch(/rate limit/i);
    expect(analyzeJobDescription).not.toHaveBeenCalled();
  });

  it("stores the analysis scoped to the caller and reports success", async () => {
    const res = await analyzeApplication("app-1", {}, new FormData());
    expect(res).toEqual({ success: true });
    const write = updateMany.mock.calls[0][0];
    expect(write.where).toEqual({ id: "app-1", userId: OWNER });
    expect(write.data.analysis.requiredSkills).toEqual(["TypeScript"]);
    expect(write.data.analysisHash).toBe(analysisCacheHash(JD_TEXT));
  });

  const CACHED_ANALYSIS = {
    summary: "role",
    seniority: "senior",
    requiredSkills: ["TypeScript", "Kubernetes"],
    niceToHave: [],
    skillMatches: ["TypeScript"],
  };

  const cachedApp = () => ({
    id: "app-1",
    userId: OWNER,
    jobDescription: JD_TEXT,
    analysisHash: analysisCacheHash(JD_TEXT),
    analysis: CACHED_ANALYSIS,
  });

  it("skips the model call and refreshes skill matches on an unchanged JD", async () => {
    findFirst.mockResolvedValue(cachedApp());
    getResumeText.mockResolvedValue("TypeScript and Kubernetes daily");
    matchSkillsSemantic.mockResolvedValue({
      matched: ["TypeScript", "Kubernetes"],
    });

    const res = await analyzeApplication("app-1", {}, new FormData());

    expect(res).toEqual({ success: true });
    expect(analyzeJobDescription).not.toHaveBeenCalled();
    expect(matchSkillsSemantic).toHaveBeenCalledWith(
      ["TypeScript", "Kubernetes"],
      "TypeScript and Kubernetes daily",
      OWNER,
    );
    const write = updateMany.mock.calls[0][0];
    expect(write.data.analysis.skillMatches).toEqual([
      "TypeScript",
      "Kubernetes",
    ]);
  });

  it("is a free no-op on an unchanged JD with no resume text", async () => {
    findFirst.mockResolvedValue(cachedApp());
    getResumeText.mockResolvedValue("");

    const res = await analyzeApplication("app-1", {}, new FormData());

    expect(res).toEqual({ success: true });
    expect(checkAiRateLimit).not.toHaveBeenCalled();
    expect(analyzeJobDescription).not.toHaveBeenCalled();
    expect(matchSkillsSemantic).not.toHaveBeenCalled();
    const write = updateMany.mock.calls[0][0];
    expect(write.data.analysis.skillMatches).toBeUndefined();
  });

  it("still enforces the AI budget before refreshing matches on a cache hit", async () => {
    findFirst.mockResolvedValue(cachedApp());
    getResumeText.mockResolvedValue("resume text");
    checkAiRateLimit.mockResolvedValue(false);

    const res = await analyzeApplication("app-1", {}, new FormData());

    expect(res.error).toMatch(/rate limit/i);
    expect(matchSkillsSemantic).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("re-runs the full analysis when the stored hash doesn't match", async () => {
    findFirst.mockResolvedValue({ ...cachedApp(), analysisHash: "stale" });
    const res = await analyzeApplication("app-1", {}, new FormData());
    expect(res).toEqual({ success: true });
    expect(analyzeJobDescription).toHaveBeenCalled();
  });

  it("re-runs the full analysis when the cached analysis fails validation", async () => {
    findFirst.mockResolvedValue({ ...cachedApp(), analysis: { bad: true } });
    await analyzeApplication("app-1", {}, new FormData());
    expect(analyzeJobDescription).toHaveBeenCalled();
  });

  it("merges semantic skill matches when the user has resume text", async () => {
    getResumeText.mockResolvedValue("I know TypeScript");
    matchSkillsSemantic.mockResolvedValue({ matched: ["TypeScript"] });
    await analyzeApplication("app-1", {}, new FormData());
    const write = updateMany.mock.calls[0][0];
    expect(write.data.analysis.skillMatches).toEqual(["TypeScript"]);
  });

  it("surfaces an AiError message and writes nothing", async () => {
    analyzeJobDescription.mockRejectedValue(new AiError("model down"));
    const res = await analyzeApplication("app-1", {}, new FormData());
    expect(res).toEqual({ error: "model down" });
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("computeResumeFit", () => {
  beforeEach(() => {
    findFirst.mockResolvedValue({
      id: "app-1",
      userId: OWNER,
      jobDescription: JD_TEXT,
      jdEmbeddingHash: null,
      jdEmbeddingModel: null,
    });
    hasResumeWithText.mockResolvedValue(true);
    getResumesNeedingEmbedding.mockResolvedValue([
      { id: "r-1", content: "resume text" },
    ]);
  });

  it("requires a readable resume before embedding", async () => {
    hasResumeWithText.mockResolvedValue(false);
    const res = await computeResumeFit("app-1", {}, new FormData());
    expect(res.error).toMatch(/resume/i);
    expect(checkAiRateLimit).not.toHaveBeenCalled();
  });

  it("skips the AI call and budget when JD and resumes are already current", async () => {
    findFirst.mockResolvedValue({
      id: "app-1",
      userId: OWNER,
      jobDescription: JD_TEXT,
      jdEmbeddingHash: JD_HASH,
      jdEmbeddingModel: EMBEDDING_MODEL,
    });
    getResumesNeedingEmbedding.mockResolvedValue([]);
    const res = await computeResumeFit("app-1", {}, new FormData());
    expect(res).toEqual({ success: true });
    expect(checkAiRateLimit).not.toHaveBeenCalled();
    expect(embedText).not.toHaveBeenCalled();
  });

  it("re-embeds the JD when only the model changed", async () => {
    findFirst.mockResolvedValue({
      id: "app-1",
      userId: OWNER,
      jobDescription: JD_TEXT,
      jdEmbeddingHash: JD_HASH,
      jdEmbeddingModel: "some-old-model",
    });
    getResumesNeedingEmbedding.mockResolvedValue([]);
    await computeResumeFit("app-1", {}, new FormData());
    expect(embedText).toHaveBeenCalledWith(JD_TEXT, "RETRIEVAL_QUERY", OWNER);
    expect(saveJdEmbedding).toHaveBeenCalledWith(
      "app-1",
      OWNER,
      [0.1, 0.2],
      JD_HASH,
    );
  });

  it("embeds pending resumes and saves each scoped to the caller", async () => {
    findFirst.mockResolvedValue({
      id: "app-1",
      userId: OWNER,
      jobDescription: JD_TEXT,
      jdEmbeddingHash: JD_HASH,
      jdEmbeddingModel: EMBEDDING_MODEL,
    });
    const res = await computeResumeFit("app-1", {}, new FormData());
    expect(res).toEqual({ success: true });
    expect(embedText).not.toHaveBeenCalled();
    expect(embedDocument).toHaveBeenCalledWith(
      "resume text",
      "RETRIEVAL_DOCUMENT",
      OWNER,
    );
    expect(saveResumeEmbedding).toHaveBeenCalledWith("r-1", OWNER, [0.3, 0.4]);
  });

  it("returns the rate-limit error before any embedding work", async () => {
    checkAiRateLimit.mockResolvedValue(false);
    const res = await computeResumeFit("app-1", {}, new FormData());
    expect(res.error).toMatch(/rate limit/i);
    expect(embedText).not.toHaveBeenCalled();
    expect(embedDocument).not.toHaveBeenCalled();
  });
});
