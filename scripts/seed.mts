// Seeds the public demo account with sample applications + resumes so the
// live demo never shows an empty dashboard.
//
// Requires the app server to be running (for correct Better Auth password
// hashing on sign-up) and DATABASE_URL/DIRECT_URL in the environment:
//
//   npm run start &     # or: npm run dev
//   npm run seed
//
// Override the target with BASE_URL (defaults to http://localhost:3000).
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(rootDir, ".env"), quiet: true });
process.env.AI_USAGE_DISABLED = "1";

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import type { ArgType } from "@prisma/driver-adapter-utils";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/constants/demo";
import { analysisCacheHash } from "@/server/analysis-cache";
import { buildPipelineSnapshot, aggregateSkillGaps } from "@/lib/insights";
import { coachSnapshotHash } from "@/server/coach";
import { matchSkills, canonicalSkill } from "@/lib/skills";
import { sha256 } from "@/server/hash";
import { EMBEDDING_MODEL } from "@/server/ai/models";
import {
  storedJdAnalysisSchema,
  type StoredJdAnalysis,
} from "@/lib/schemas/jd-analysis";
import type { ApplicationStatus } from "@/lib/schemas/application";
import {
  RESUMES,
  APPS,
  ANALYSES,
  COACH_ADVICE,
  TAILORED,
  INTERVIEW_PREP,
} from "./seed-data.mjs";

// Prisma 7 wants a descriptor object per bound argument, not a type-name
// string. The old .mjs script passed strings and only worked because mapArg
// fell through to a passthrough for them.
const TEXT: ArgType = { scalarType: "string", arity: "scalar" };
const INT: ArgType = { scalarType: "int", arity: "scalar" };
const DATE: ArgType = { scalarType: "datetime", arity: "scalar" };

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ORIGIN = process.env.BETTER_AUTH_URL ?? BASE_URL;

const inDays = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const directUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!directUrl) throw new Error("DIRECT_URL or DATABASE_URL must be set");
const url = new URL(directUrl);
// Neon needs TLS and does not always spell it out in the connection string, so
// require it when the URL is silent — but never overrule an explicit choice.
// That is what lets CI seed a plain, TLS-less Postgres container with
// `?sslmode=disable` instead of failing to connect at all.
if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
url.searchParams.set("uselibpqcompat", "true");
const pool = new pg.Pool({ connectionString: url.toString() });
const adapter = new PrismaPg(pool);
const conn = await adapter.connect();
type SqlArgs = Parameters<typeof conn.executeRaw>[0];
const ex = (sql: string, args: SqlArgs["args"] = [], argTypes: SqlArgs["argTypes"] = []) =>
  conn.executeRaw({ sql, args, argTypes });
const q = (sql: string, args: SqlArgs["args"] = [], argTypes: SqlArgs["argTypes"] = []) =>
  conn.queryRaw({ sql, args, argTypes });

// The demo data ships with hand-written analyses and coach advice, but their
// load-bearing claims are derived and asserted here rather than trusted: the
// skill matches come from the real matcher over the real resume text, and the
// seed fails loudly if the coach's focus skill stops being the top gap or the
// README's "5 of 6 skills matched" walkthrough stops being true.
const resumeCorpus = [...RESUMES]
  .sort((a, b) => a.ageDays - b.ageDays)
  .map((r) => r.content)
  .join("\n");

const storedAnalyses: Record<string, StoredJdAnalysis> = {};
for (const [id, extraction] of Object.entries(ANALYSES)) {
  const app = APPS.find((a) => a.id === id);
  if (!app?.jd) throw new Error(`ANALYSES entry ${id} has no matching app with a JD`);
  const { matched } = matchSkills(extraction.requiredSkills, resumeCorpus);
  storedAnalyses[id] = storedJdAnalysisSchema.parse({
    ...extraction,
    skillMatches: matched,
  });
}

const acme = storedAnalyses.demo_app_1;
const acmeMissing = acme.requiredSkills.filter(
  (s) => !acme.skillMatches?.includes(s),
);
if (acmeMissing.length !== 1 || canonicalSkill(acmeMissing[0]) !== "kubernetes") {
  throw new Error(
    `demo_app_1 must match all required skills except Kubernetes (README walkthrough) — got missing: [${acmeMissing.join(", ")}]`,
  );
}

const gaps = aggregateSkillGaps(Object.values(storedAnalyses));
if (
  !gaps[0] ||
  canonicalSkill(gaps[0].skill) !== canonicalSkill(COACH_ADVICE.focusSkill)
) {
  throw new Error(
    `Coach focusSkill "${COACH_ADVICE.focusSkill}" is not the top aggregated gap — gaps: ${gaps
      .slice(0, 4)
      .map((g) => `${g.skill}:${g.count}`)
      .join(", ")}`,
  );
}

// 1. Ensure the demo user exists (sign up via the server for correct hashing).
let userId;
try {
  const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ name: "Demo User", email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });
  const body = await res.json().catch(() => ({}));
  userId = body?.user?.id;
} catch {
  console.error(`Could not reach ${BASE_URL} — is the server running?`);
  process.exit(1);
}
if (!userId) {
  const r = await q(`SELECT id FROM "user" WHERE email = $1`, [DEMO_EMAIL], [TEXT]);
  userId = (r.rows ?? r)[0]?.[0];
}
if (!userId) {
  console.error("Could not resolve the demo user id.");
  process.exit(1);
}

await ex(`UPDATE "user" SET "emailVerified" = true WHERE id = $1`, [userId], [TEXT]);

// 2. Reset the demo user's data (idempotent re-seed).
await ex(`DELETE FROM "application" WHERE "userId" = $1`, [userId], [TEXT]);
await ex(`DELETE FROM "resume_version" WHERE "userId" = $1`, [userId], [TEXT]);

// 3. Resume versions with extractable text (drives the skill-gap demo).
for (const resume of RESUMES) {
  await ex(
    `INSERT INTO "resume_version"(id,"userId",label,content,"createdAt")
     VALUES ($1,$2,$3,$4,now() - ($5 * interval '1 day'))`,
    [resume.id, userId, resume.label, resume.content, resume.ageDays],
    [TEXT, TEXT, TEXT, TEXT, INT],
  );
}

// 4. Applications spread across every status so the kanban board looks alive.
//    Deadlines are relative to today so "Upcoming deadlines" is never empty.
for (const app of APPS) {
  await ex(
    `INSERT INTO "application"(id,"userId",company,role,status,"jobDescription","deadline",notes,"jobUrl","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5::"ApplicationStatus",$6,$7,$8,$9,now() - ($10 * interval '1 day'),now())`,
    [
      app.id,
      userId,
      app.company,
      app.role,
      app.status,
      app.jd,
      app.deadlineInDays == null ? null : inDays(app.deadlineInDays),
      app.notes,
      app.jobUrl,
      app.ageDays,
    ],
    [TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, INT],
  );
}

// 5. Pre-baked AI results so every feature demos instantly, no API key needed.
for (const [id, stored] of Object.entries(storedAnalyses)) {
  const app = APPS.find((a) => a.id === id)!;
  await ex(
    `UPDATE "application" SET analysis = $1::jsonb, "analysisHash" = $2, "analyzedAt" = now() WHERE id = $3`,
    [JSON.stringify(stored), analysisCacheHash(app.jd!.trim()), id],
    [TEXT, TEXT, TEXT],
  );
}

await ex(
  `UPDATE "application" SET "tailoredExperience" = $1, "tailoredBullets" = $2, "tailoredAt" = now() WHERE id = $3`,
  [TAILORED.experience, TAILORED.bullets, TAILORED.applicationId],
  [TEXT, TEXT, TEXT],
);

for (const [id, prep] of Object.entries(INTERVIEW_PREP)) {
  await ex(
    `UPDATE "application" SET "interviewPrep" = $1, "interviewPrepAt" = now() WHERE id = $2`,
    [prep, id],
    [TEXT, TEXT],
  );
}

// The coach hash is computed from the same snapshot the dashboard builds, so
// the demo shows the advice populated and current — not a "regenerate" prompt.
const coachSnapshot = buildPipelineSnapshot(
  APPS.map((a) => ({
    status: a.status as ApplicationStatus,
    analysis: storedAnalyses[a.id] ?? null,
  })),
);
await ex(
  `UPDATE "user" SET "coachAdvice" = $1::jsonb, "coachHash" = $2, "coachAt" = now() WHERE id = $3`,
  [JSON.stringify(COACH_ADVICE), coachSnapshotHash(coachSnapshot), userId],
  [TEXT, TEXT, TEXT],
);

// 6. Embeddings, when a key is available: pre-computing them keeps the
//    resume-fit ranking populated from the first page view after a reseed
//    instead of empty until someone spends AI budget on a compute click.
const appsWithJd = APPS.filter((a) => a.jd);
if (process.env.GEMINI_API_KEY) {
  const { embedText, embedDocument } = await import("@/server/ai-client");
  for (const app of appsWithJd) {
    const jd = app.jd!.trim();
    const vector = await embedText(jd, "RETRIEVAL_QUERY");
    await ex(
      `UPDATE "application" SET "jdEmbedding" = $1::vector, "jdEmbeddingHash" = $2, "jdEmbeddingModel" = $3 WHERE id = $4`,
      [`[${vector.join(",")}]`, sha256(jd), EMBEDDING_MODEL, app.id],
      [TEXT, TEXT, TEXT, TEXT],
    );
  }
  for (const resume of RESUMES) {
    const vector = await embedDocument(resume.content, "RETRIEVAL_DOCUMENT");
    await ex(
      `UPDATE "resume_version" SET "embedding" = $1::vector, "embeddingModel" = $2 WHERE id = $3`,
      [`[${vector.join(",")}]`, EMBEDDING_MODEL, resume.id],
      [TEXT, TEXT, TEXT],
    );
  }
  console.log(
    `Embedded ${appsWithJd.length} job descriptions + ${RESUMES.length} resumes (${EMBEDDING_MODEL}).`,
  );
} else {
  console.log(
    "GEMINI_API_KEY not set — skipped embeddings; resume-fit stays empty until computed in-app.",
  );
}

console.log(
  `Seeded demo account ${DEMO_EMAIL}: ${APPS.length} applications (${Object.keys(storedAnalyses).length} analyzed) + ${RESUMES.length} resumes.`,
);
await conn.dispose?.();
