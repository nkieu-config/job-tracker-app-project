# Local setup

## Prerequisites

- Node.js 22 (matches CI; 20+ works)
- A Postgres database with the `pgvector` extension ([Neon](https://neon.tech) free tier works)
- A [Gemini API key](https://aistudio.google.com/apikey) (free tier is enough)
- A Vercel Blob store token (only needed for resume upload)

## Quick start

```bash
# 1. Install deps (postinstall runs prisma generate)
npm install

# 2. Configure environment
cp .env.example .env
# Fill in DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET, GEMINI_API_KEY, ...

# 3. Apply migrations to your database
npx prisma migrate dev

# 4. Run
npm run dev              # http://localhost:3000
```

## Environment variables

See [.env.example](../.env.example). `.env` files are gitignored.

### Web app (`.env`)

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string (pooled, `-pooler` endpoint — queried over TCP by `pg`) |
| `DIRECT_URL` | Direct (non-pooled) connection string, used by migrations |
| `BETTER_AUTH_SECRET` | Random secret — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` locally; your deployment URL in prod |
| `BLOB_READ_WRITE_TOKEN` | From a Vercel Blob store (`vercel env pull`) |
| `GEMINI_API_KEY` | From Google AI Studio — server-only, never exposed to the browser |
| `ADMIN_EMAILS` | Comma-separated emails allowed to view `/dashboard/ai-usage` (optional) |
| `CRON_SECRET` | Bearer token Vercel Cron uses to call `/api/cron/*` (optional; the route refuses to run when unset) |

Optional knobs (`AI_USAGE_DISABLED`, `EVAL_RPM`, `EVAL_MAX_ATTEMPTS`, `EVAL_JUDGE_MODEL`, `BASE_URL`) are documented in `.env.example`.

## Database branches (Neon)

The Neon project has two branches so local experiments can never touch the live
demo:

| Branch | Who uses it |
| --- | --- |
| `production` | Vercel — Production deployments and the live demo |
| `dev` | Local development — what `.env` points at |

`dev` is a copy-on-write branch of `production`, so it starts with all the data
(demo account, applications, embeddings) and applied migrations. Break it
freely; to restore it to an exact copy of production:

```bash
npx neonctl branches reset dev --project-id <your-neon-project-id> --parent
```

The `production` connection strings exist only as Vercel env vars, which cannot
be read back once saved. Keep a recoverable copy somewhere — for example as
comments beside `DATABASE_URL`/`DIRECT_URL` in the gitignored `.env`.

## Scripts

```bash
npm run dev           # Next.js dev server
npm run build         # production build (web)
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # vitest
npm run test:coverage # vitest with per-file coverage thresholds
npm run eval          # AI eval suites (needs GEMINI_API_KEY)
npm run screenshots   # regenerate the README screenshots via Playwright
npm run record-demo   # re-record the streaming GIF (Playwright + ffmpeg, one Gemini call)
npm run social-preview # rebuild the 1280×640 GitHub social card from dashboard.png
npm run seed          # populate the demo account (server must be running)
```

The three image scripts drive a running app, so start one first — `npm run build && npm run start` gives the clean, dev-overlay-free rendering the committed images were captured from. `record-demo` additionally needs `ffmpeg` on `PATH` (`brew install ffmpeg`) and a `BETTER_AUTH_URL` that matches the port you serve on, or the demo sign-in is rejected as an untrusted origin.

## Demo account

`npm run seed` creates `demo@jobtracker.app` / `demotracker2026` with sample applications, multiple resume versions, and pre-computed high-fit/low-fit JD analyses so every AI feature has something to show. Start the server first (`npm run start &`), then run the seed.

## Verifying a build

- Automated: `npm run lint && npm run typecheck && npm test && npm run build`
- By hand: follow the [manual QA checklist](manual-qa.md)

## Related docs

- [Architecture & design decisions](architecture.md)
- [Deploy guide](deploy.md)
