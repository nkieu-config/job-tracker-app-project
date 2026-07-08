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
import { loadWebEnv } from "./load-web-env.mjs";

loadWebEnv();
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Keep in sync with src/lib/constants/demo
const DEMO_EMAIL = "demo@jobtracker.app";
const DEMO_PASSWORD = "demotracker2026";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ORIGIN = process.env.BETTER_AUTH_URL ?? BASE_URL;

const inDays = (n) =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const url = new URL(process.env.DIRECT_URL ?? process.env.DATABASE_URL);
url.searchParams.set("sslmode", "require");
url.searchParams.set("uselibpqcompat", "true");
const pool = new pg.Pool({ connectionString: url.toString() });
const adapter = new PrismaPg(pool);
const conn = await adapter.connect();
const ex = (sql, args = [], argTypes = []) => conn.executeRaw({ sql, args, argTypes });
const q = (sql, args = [], argTypes = []) => conn.queryRaw({ sql, args, argTypes });

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
  const r = await q(`SELECT id FROM "user" WHERE email = $1`, [DEMO_EMAIL], ["Text"]);
  userId = (r.rows ?? r)[0]?.[0];
}
if (!userId) {
  console.error("Could not resolve the demo user id.");
  process.exit(1);
}

// 2. Reset the demo user's data (idempotent re-seed).
await ex(`DELETE FROM "application" WHERE "userId" = $1`, [userId], ["Text"]);
await ex(`DELETE FROM "resume_version" WHERE "userId" = $1`, [userId], ["Text"]);

// 3. Resume versions with extractable text (drives the skill-gap demo).
const resumeContent = `Jordan Lee — Software Engineer

SKILLS
TypeScript, JavaScript, Node.js, React, Next.js, PostgreSQL, Prisma, Docker, AWS, Git, REST APIs

EXPERIENCE
Backend Engineer, Globex (2023–2025)
- Built and maintained Node.js + TypeScript services backed by PostgreSQL.
- Designed REST APIs serving 2M+ requests/day; cut p95 latency by 35%.
- Containerised services with Docker and deployed on AWS.

Full-Stack Developer, Initech (2021–2023)
- Shipped React/Next.js features end to end.
- Introduced Prisma and database migrations to the team.

EDUCATION
B.Sc. Computer Science`;
await ex(
  `INSERT INTO "resume_version"(id,"userId",label,content,"createdAt") VALUES ($1,$2,$3,$4,now() - interval '30 days')`,
  ["demo_resume_1", userId, "Backend-focused v2", resumeContent],
  ["Text", "Text", "Text", "Text"],
);

const frontendResumeContent = `Jordan Lee — Frontend Engineer

SKILLS
React, Next.js, TypeScript, JavaScript, Tailwind CSS, HTML5, CSS3, Redux, Figma

EXPERIENCE
Frontend Developer, Initech (2023–2025)
- Built responsive user interfaces using React and Tailwind CSS.
- Collaborated with designers in Figma to implement pixel-perfect UI.
- Improved Core Web Vitals and accessibility scores.

Junior Developer, Globex (2021–2023)
- Maintained legacy React applications and migrated to Next.js.
- Developed reusable UI component libraries.

EDUCATION
B.Sc. Computer Science`;

await ex(
  `INSERT INTO "resume_version"(id,"userId",label,content,"createdAt") VALUES ($1,$2,$3,$4,now() - interval '45 days')`,
  ["demo_resume_2", userId, "Frontend-focused v1", frontendResumeContent],
  ["Text", "Text", "Text", "Text"],
);

// 4. Applications spread across every status so the kanban board looks alive.
//    Deadlines are relative to today so "Upcoming deadlines" is never empty.
const seniorJd = `We are hiring a Senior Backend Engineer to design and scale our core APIs.

Requirements:
- Strong TypeScript and Node.js
- Deep PostgreSQL experience
- Designing and operating REST APIs at scale
- Kubernetes and AWS in production

Nice to have: GraphQL, Kafka.`;

const frontendJd = `We are looking for a passionate Frontend Engineer to build beautiful and performant user interfaces.

Requirements:
- Deep expertise in React and Next.js
- Proficiency with modern CSS frameworks (Tailwind CSS preferred)
- Experience with state management (Redux, Zustand)
- Eye for design and experience working closely with Figma

Nice to have: Accessibility (a11y) expertise, testing with Jest/Cypress.`;

const apps = [
  { id: "demo_app_1", company: "Acme Corp", role: "Senior Backend Engineer", status: "INTERVIEW", jd: seniorJd, deadline: inDays(5), ageDays: 12, notes: "Referred by Sam. Recruiter call went well — system design round next." },
  { id: "demo_app_2", company: "Globex", role: "Full-Stack Developer", status: "APPLIED", jd: "Full-stack role using React, Next.js and Node.js. TypeScript required.", deadline: inDays(9), ageDays: 8, notes: null },
  { id: "demo_app_3", company: "Initech", role: "Platform Engineer", status: "OFFER", jd: null, deadline: inDays(3), ageDays: 25, notes: "Offer received — responding by Friday. Negotiating base salary." },
  { id: "demo_app_4", company: "Hooli", role: "Frontend Engineer", status: "SAVED", jd: frontendJd, deadline: inDays(7), ageDays: 3, notes: null },
  { id: "demo_app_5", company: "Stark Industries", role: "DevOps Engineer", status: "REJECTED", jd: null, deadline: null, ageDays: 30, notes: "Rejected after final round — asked for feedback." },
  { id: "demo_app_6", company: "Wayne Enterprises", role: "Software Engineer", status: "APPLIED", jd: null, deadline: inDays(1), ageDays: 6, notes: null },
  { id: "demo_app_7", company: "Pied Piper", role: "Backend Engineer (Node.js)", status: "APPLIED", jd: "Backend engineer role. Node.js, Express, MongoDB, Docker.", deadline: inDays(12), ageDays: 4, notes: null },
  { id: "demo_app_8", company: "Aviato", role: "Senior Full-Stack Engineer", status: "INTERVIEW", jd: "Senior full-stack: React, Node.js, PostgreSQL, AWS. Lead a small team.", deadline: inDays(2), ageDays: 15, notes: "Technical round on Thursday — review system design notes." },
  { id: "demo_app_9", company: "Raviga", role: "Software Engineer, Payments", status: "SAVED", jd: null, deadline: inDays(14), ageDays: 1, notes: null },
  { id: "demo_app_10", company: "Umbrella Corp", role: "Site Reliability Engineer", status: "SAVED", jd: null, deadline: null, ageDays: 2, notes: null },
  { id: "demo_app_11", company: "Massive Dynamic", role: "Staff Engineer", status: "REJECTED", jd: null, deadline: null, ageDays: 40, notes: null },
];

for (const app of apps) {
  await ex(
    `INSERT INTO "application"(id,"userId",company,role,status,"jobDescription","deadline",notes,"createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5::"ApplicationStatus",$6,$7,$8,now() - ($9 * interval '1 day'),now())`,
    [app.id, userId, app.company, app.role, app.status, app.jd, app.deadline, app.notes, app.ageDays],
    ["Text", "Text", "Text", "Text", "Text", "Text", "Date", "Text", "Int32"],
  );
}

// 5. Pre-baked AI results so every feature demos instantly, no API key needed.
//    skillMatches mirrors what the semantic matcher would store at analyze time.
const analysis = {
  summary: "Senior backend role designing and scaling core REST APIs on Kubernetes and AWS.",
  seniority: "senior",
  requiredSkills: ["TypeScript", "Node.js", "PostgreSQL", "REST APIs", "Kubernetes", "AWS"],
  niceToHave: ["GraphQL", "Kafka"],
  skillMatches: ["TypeScript", "Node.js", "PostgreSQL", "REST APIs", "AWS"],
};
await ex(
  `UPDATE "application" SET analysis = $1::jsonb, "analyzedAt" = now() WHERE id = $2`,
  [JSON.stringify(analysis), "demo_app_1"],
  ["Text", "Text"],
);

const frontendAnalysis = {
  summary: "Frontend role focused on React, Next.js, and Tailwind CSS to build performant UIs.",
  seniority: "mid",
  requiredSkills: ["React", "Next.js", "Tailwind CSS", "Redux", "Figma"],
  niceToHave: ["Accessibility", "Jest", "Cypress"],
  skillMatches: ["React", "Next.js", "Tailwind CSS", "Redux", "Figma"],
};
await ex(
  `UPDATE "application" SET analysis = $1::jsonb, "analyzedAt" = now() WHERE id = $2`,
  [JSON.stringify(frontendAnalysis), "demo_app_4"],
  ["Text", "Text"],
);

const tailoredExperience = "Maintained node.js services at Globex, fixed bugs and helped with deployments.";
const tailoredBullets = `- Operated and maintained high-performance Node.js services, ensuring continuous availability for critical backend operations.
- Diagnosed and resolved complex production issues, improving system stability and p95 latency.
- Streamlined the deployment pipeline, supporting reliable releases across environments.`;
await ex(
  `UPDATE "application" SET "tailoredExperience" = $1, "tailoredBullets" = $2, "tailoredAt" = now() WHERE id = $3`,
  [tailoredExperience, tailoredBullets, "demo_app_1"],
  ["Text", "Text", "Text"],
);

const interviewPrep = `Technical questions
- How would you design a REST API that serves millions of requests per day on Node.js and PostgreSQL?
  Strong answers cover: API contract design, connection pooling, caching layers, read replicas, pagination, and monitoring.
- How do you approach database schema changes on a live PostgreSQL system?
  Strong answers cover: backwards-compatible migrations, deploy order, locking behaviour, and rollback plans.
- What does a production-ready Kubernetes deployment look like for a Node.js service?
  Strong answers cover: liveness/readiness probes, resource limits, horizontal pod autoscaling, and rolling updates.
- How do you keep TypeScript types honest at service boundaries?
  Strong answers cover: schema validation (e.g. Zod), generated clients, and runtime checks on external input.
- Describe how you would debug elevated p95 latency in an API.
  Strong answers cover: tracing, database query analysis, event-loop blocking, and load-testing hypotheses.

Behavioral questions
- Tell me about a time you led a technical decision that others disagreed with.
  Strong answers cover: trade-off analysis, stakeholder communication, and measurable outcomes.
- Describe a production incident you owned end to end.
  Strong answers cover: detection, mitigation, root cause, and the follow-up that prevented recurrence.
- How do you mentor less experienced engineers?
  Strong answers cover: code review culture, pairing, and growing ownership.

Questions to ask the interviewer
- What does the on-call rotation and incident culture look like for this team?
- Which part of the API platform is under the most scaling pressure right now?
- How do you measure success for this role in the first six months?`;
await ex(
  `UPDATE "application" SET "interviewPrep" = $1, "interviewPrepAt" = now() WHERE id = $2`,
  [interviewPrep, "demo_app_1"],
  ["Text", "Text"],
);

console.log(`Seeded demo account ${DEMO_EMAIL}: ${apps.length} applications + 2 resumes.`);
await conn.dispose?.();
