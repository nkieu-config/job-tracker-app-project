<div align="center">

# 💼 Job Tracker

### The job hunt is a data problem. I built the tool to solve mine.

**An AI-powered job-application tracker that analyzes job descriptions, scores your resume against them with vector embeddings, and tailors your bullets — built as my capstone project, used in my real job search.**

[![CI](https://github.com/nkieu-config/job-tracker-app-project/actions/workflows/ci.yml/badge.svg)](https://github.com/nkieu-config/job-tracker-app-project/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/Live_demo-▲_Vercel-black)](https://job-tracker-app-project.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Postgres + pgvector](https://img.shields.io/badge/Postgres-pgvector-4169E1?logo=postgresql&logoColor=white)
![Prisma 7](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![Gemini 2.5](https://img.shields.io/badge/AI-Gemini_2.5-8E75B2?logo=googlegemini&logoColor=white)

### [▶ Open the live demo](https://job-tracker-app-project.vercel.app) — one click, no sign-up

Click **“Try Live Demo”** on the homepage for a fully populated dashboard
(or sign in manually: `demo@jobtracker.app` / `demotracker2026`).

<br />

<img src="docs/screenshots/dashboard.png" alt="Dashboard showing application pipeline, response and interview rates, and upcoming deadlines" width="820" />

</div>

---

## The story

I was a graduating student staring down my first job search, tracking twenty applications in a spreadsheet. Every new posting meant the same manual loop: re-read the job description, guess which skills I was missing, decide which of my three resume versions fit best, and rewrite my bullets to match — with no way to tell if any of it was working.

That loop is exactly the kind of problem software should solve. So for my graduation project I built the tool I wished I had: a tracker where the pipeline is a Kanban board instead of spreadsheet rows, and where the tedious parts — skill-gap analysis, resume-to-JD matching, bullet rewriting, interview prep — are done by AI in seconds instead of by me at 1 a.m.

The result is this app, which I now use to run the very job search it was built for. If you're reading this as a recruiter: the product *is* the cover letter. 🙂

## What it does

**Track the pipeline.** Full application CRUD with a drag-and-drop Kanban board (Saved → Applied → Interview → Offer → Rejected), optimistic updates, deadlines, notes, URL-synced search and filters, and a dashboard with response/interview rates and upcoming deadlines.

**Then let the AI do the tedious parts:**

| | |
| --- | --- |
| **🔍 JD analysis + semantic skill gap** — Gemini extracts required skills, nice-to-haves, and seniority from a job description, then matches them against your resume in two layers: exact/alias matching first, embedding similarity for paraphrases second. | <img src="docs/screenshots/jd-analysis.png" alt="Required skills tagged as matched or missing against the resume" width="400" /> |
| **📊 Resume fit score (pgvector)** — embeds the JD and every resume version, then ranks them by cosine similarity in Postgres, labeled with Strong/Moderate/Weak fit bands and an explanation of the math. | <img src="docs/screenshots/resume-fit.png" alt="Resume versions ranked by cosine similarity to the job description" width="400" /> |
| **✍️ Bullet tailoring (streamed live)** — rewrites your experience into resume bullets tuned to the JD, streamed token-by-token with one-click copy and regenerate. | <img src="docs/screenshots/tailor.png" alt="Resume bullets tailored to the job description" width="400" /> |

Plus **🎤 AI interview prep** (likely technical + behavioral questions generated from the JD, streamed), **📄 resume version management** (PDF upload with text extraction, stored privately), and email/password auth with every row scoped to its owner.

## Engineering highlights

The parts I'd want a technical interviewer to look at:

- **AI as a self-contained, typed module.** All Gemini access lives behind a single `lib/ai/` module (analysis, embeddings, streaming) called only from Server Actions and Route Handlers, so the API key stays server-side and the AI surface has one clear boundary. Request/response shapes are defined once as Zod schemas in `src/lib/schemas/` and reused for both prompting and validation.
- **Defense-in-depth auth.** Middleware does an optimistic cookie check, but every page, Server Action, and route handler independently re-verifies the session and scopes queries by `userId` — middleware is never the only gate (see CVE-2025-29927, a Next.js middleware bypass that this design survives).
- **The LLM is treated as untrusted input.** The JSON schema Gemini must follow is *derived from* a Zod schema, and the response is re-validated with that same schema — malformed model output becomes an explicit, recoverable error, never a crashed page.
- **Vector search in the database, not the app.** Embeddings live in Postgres `vector(768)` columns behind an HNSW index; resume ranking is one raw-SQL cosine-distance query (`<=>`), not an application-side similarity loop.
- **The AI is measured, not assumed.** An [evaluation harness](evals/) scores each AI feature with real metrics — precision/recall/F1 on JD skill extraction, an ablation proving the embedding layer lifts skill-match recall **+8.3%** over lexical-only, and an LLM-as-judge pass (relevance/grounding + hallucination rate) on tailored bullets. `npm run eval` regenerates the scorecard.
- **Streaming end to end.** Tailored bullets and interview questions stream token-by-token — Gemini's chunk iterator is piped straight into a Route Handler `ReadableStream` → browser — so output appears in under a second.
- **Production paper cuts, actually fixed.** Serverless connection pooling via the Neon driver adapter, a broken transitive kysely release pinned with an npm override, Prisma 7's engine removal, Next 16's `middleware` → `proxy` rename — the full list with solutions is in [docs/architecture.md](docs/architecture.md#challenges--solutions).

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions, Route Handlers) + TypeScript |
| AI | Gemini 2.5 Flash + `gemini-embedding-001`, called in-process from `lib/ai/` |
| Database | PostgreSQL (Neon) + Prisma 7 + pgvector |
| Auth | Better Auth (sessions in Postgres) |
| UI | Tailwind CSS v4, semantic design tokens ([design system](docs/DESIGN.md)) |
| Storage | Vercel Blob (private) |
| Quality | Zod validation end-to-end · Vitest + Testing Library · AI eval harness · GitHub Actions CI |
| Infra | Vercel |

## Architecture at a glance

```
Browser ──▶ Next.js (auth, CRUD, pgvector queries, AI) ──▶ Postgres + Vercel Blob
                    │
                    │  lib/ai/ (in-process)
                    ▼
                Gemini API
```

Full diagram, decision rationale, and the challenges-and-solutions log: **[docs/architecture.md](docs/architecture.md)**

## Run it locally

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, GEMINI_API_KEY, etc.
npx prisma migrate dev
npm run dev      # http://localhost:3000
```

Full environment-variable reference, scripts, and demo seeding: **[docs/setup.md](docs/setup.md)**

## Documentation

| Doc | What's inside |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | System design, key decisions, challenges & solutions |
| [docs/setup.md](docs/setup.md) | Local setup, env vars, scripts, demo account |
| [docs/deploy.md](docs/deploy.md) | Step-by-step deploy: Neon → Vercel |
| [docs/manual-qa.md](docs/manual-qa.md) | 14-step click-through smoke test |
| [evals/](evals/) | AI evaluation harness — methodology + scorecard |
| [docs/DESIGN.md](docs/DESIGN.md) | Design system: tokens, typography, components |

## About me

I'm **Natthachak** — a new-grad software developer who likes building products end to end: from the Postgres schema to the streaming UX. This project is my graduation capstone and the tool behind my own job search.

- GitHub: [@nkieu-config](https://github.com/nkieu-config)
- Email: [natthachak55@gmail.com](mailto:natthachak55@gmail.com)

If you're hiring — [try the demo](https://job-tracker-app-project.vercel.app), then let's talk.

## License

[MIT](LICENSE) © 2026 Natthachak
