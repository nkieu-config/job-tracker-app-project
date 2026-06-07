# Job Tracker

Smart job application tracker with AI-powered JD analysis and resume tailoring.
Built to track real job applications — and to showcase a full-stack + AI skill set.

> Status: **Phase 1** — email/password auth, protected dashboard, deployed.

## Tech stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **UI:** Tailwind CSS v4
- **Database:** PostgreSQL (Neon) + Prisma 7 (driver adapter `@prisma/adapter-pg`)
- **Auth:** Better Auth _(phase 1)_
- **Storage:** Vercel Blob _(phase 3)_
- **AI:** Google Gemini — generation + embeddings _(phases 4–5)_

## Local setup

```bash
# 1. Install dependencies (also runs `prisma generate` via postinstall)
npm install

# 2. Configure environment
cp .env.example .env
#    then set DATABASE_URL to your Neon connection string

# 3. Apply the database schema (once DATABASE_URL points at a real DB)
npx prisma migrate dev

# 4. Run the dev server
npm run dev
```

Open http://localhost:3000.

## Environment variables

See [.env.example](.env.example) for the full list. Through phase 1:

- `DATABASE_URL` / `DIRECT_URL` — Neon Postgres connection strings.
- `BETTER_AUTH_SECRET` — random secret (`openssl rand -base64 32`).
- `BETTER_AUTH_URL` — `http://localhost:3000` locally; the deployment URL in prod.

`.env` is gitignored — never commit real secrets.

## Deploy (GitHub → Vercel → Neon)

1. **Neon:** create a free Postgres project, copy the pooled `DATABASE_URL`.
2. **GitHub:** push this repo.
3. **Vercel:** import the GitHub repo. In **Project → Settings → Environment
   Variables**, add `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, and
   `BETTER_AUTH_URL` (set to your production URL). Every push then deploys
   automatically.
4. Run the first migration against the Neon database:
   ```bash
   npx prisma migrate deploy
   ```

## Notes for contributors / AI agents

- This uses **Next.js 16** and **Prisma 7**, both of which differ from older
  conventions. Prisma 7 requires a driver adapter (see [lib/prisma.ts](lib/prisma.ts))
  and stores the datasource URL in [prisma.config.ts](prisma.config.ts), not in
  the schema. The Prisma client is generated to `app/generated/prisma`
  (gitignored; regenerated on install).
- See [job_tracker_build_plan.md](job_tracker_build_plan.md) for the full
  phase-by-phase build plan.
