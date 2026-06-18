// Seeds the public demo account with sample applications + a resume so the
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
config({ quiet: true });
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Keep in sync with lib/demo.ts
const DEMO_EMAIL = "demo@jobtracker.app";
const DEMO_PASSWORD = "demotracker2026";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ORIGIN = process.env.BETTER_AUTH_URL ?? BASE_URL;

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

// 3. A resume version with extractable text (drives the skill-gap demo).
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
  `INSERT INTO "resume_version"(id,"userId",label,content,"createdAt") VALUES ($1,$2,$3,$4,now())`,
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
  `INSERT INTO "resume_version"(id,"userId",label,content,"createdAt") VALUES ($1,$2,$3,$4,now())`,
  ["demo_resume_2", userId, "Frontend-focused v1", frontendResumeContent],
  ["Text", "Text", "Text", "Text"],
);

// 4. Applications across statuses; one carries a pre-computed JD analysis so
//    the AI section renders even without an API key.
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
  { id: "demo_app_1", company: "Acme Corp", role: "Senior Backend Engineer", status: "INTERVIEW", jd: seniorJd, deadline: "2026-06-25" },
  { id: "demo_app_2", company: "Globex", role: "Full-Stack Developer", status: "APPLIED", jd: "Full-stack role using React, Next.js and Node.js. TypeScript required.", deadline: "2026-07-01" },
  { id: "demo_app_3", company: "Initech", role: "Platform Engineer", status: "OFFER", jd: null, deadline: null },
  { id: "demo_app_4", company: "Hooli", role: "Frontend Engineer", status: "SAVED", jd: frontendJd, deadline: "2026-06-20" },
  { id: "demo_app_5", company: "Stark Industries", role: "DevOps Engineer", status: "REJECTED", jd: null, deadline: null },
  { id: "demo_app_6", company: "Wayne Enterprises", role: "Software Engineer", status: "APPLIED", jd: null, deadline: "2026-06-10" },
];

for (const app of apps) {
  await ex(
    `INSERT INTO "application"(id,"userId",company,role,status,"jobDescription","deadline","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5::"ApplicationStatus",$6,$7,now(),now())`,
    [app.id, userId, app.company, app.role, app.status, app.jd, app.deadline],
    ["Text", "Text", "Text", "Text", "Text", "Text", "Date"],
  );
}

// Pre-computed analysis for the Senior Backend Engineer role.
const analysis = {
  summary: "Senior backend role designing and scaling core REST APIs on Kubernetes and AWS.",
  seniority: "senior",
  requiredSkills: ["TypeScript", "Node.js", "PostgreSQL", "REST APIs", "Kubernetes", "AWS"],
  niceToHave: ["GraphQL", "Kafka"],
};
await ex(
  `UPDATE "application" SET analysis = $1::jsonb, "analyzedAt" = now() WHERE id = $2`,
  [JSON.stringify(analysis), "demo_app_1"],
  ["Text", "Text"],
);

// Pre-computed analysis for the Frontend Engineer role.
const frontendAnalysis = {
  summary: "Frontend role focused on React, Next.js, and Tailwind CSS to build performant UIs.",
  seniority: "mid",
  requiredSkills: ["React", "Next.js", "Tailwind CSS", "Redux", "Figma"],
  niceToHave: ["Accessibility", "Jest", "Cypress"],
};
await ex(
  `UPDATE "application" SET analysis = $1::jsonb, "analyzedAt" = now() WHERE id = $2`,
  [JSON.stringify(frontendAnalysis), "demo_app_4"],
  ["Text", "Text"],
);

console.log(`Seeded demo account ${DEMO_EMAIL}: ${apps.length} applications + 2 resumes.`);
await conn.dispose?.();
