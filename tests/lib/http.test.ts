import { describe, it, expect } from "vitest";
import { jsonError, readErrorMessage } from "@/lib/http";

describe("jsonError", () => {
  it("carries the message in the shape every client parses", async () => {
    const res = jsonError("Application not found.", 404);

    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ error: "Application not found." });
  });
});

describe("readErrorMessage", () => {
  it("returns the message the server sent", async () => {
    const res = Response.json({ error: "Add a job description." }, { status: 400 });

    await expect(readErrorMessage(res, "fallback")).resolves.toBe(
      "Add a job description.",
    );
  });

  // A 502 from a proxy that never reached the app carries an HTML error page,
  // not our shape — showing it raw would put markup in front of the user.
  it("falls back when the body isn't JSON", async () => {
    const res = new Response("<html>Bad Gateway</html>", { status: 502 });

    await expect(readErrorMessage(res, "fallback")).resolves.toBe("fallback");
  });

  it("falls back on an empty body", async () => {
    await expect(
      readErrorMessage(new Response(null, { status: 500 }), "fallback"),
    ).resolves.toBe("fallback");
  });

  it("falls back when JSON arrives without a usable error string", async () => {
    const blank = Response.json({ error: "   " }, { status: 400 });
    const wrongType = Response.json({ error: { code: 7 } }, { status: 400 });
    const absent = Response.json({ ok: false }, { status: 400 });

    await expect(readErrorMessage(blank, "fallback")).resolves.toBe("fallback");
    await expect(readErrorMessage(wrongType, "fallback")).resolves.toBe("fallback");
    await expect(readErrorMessage(absent, "fallback")).resolves.toBe("fallback");
  });
});
