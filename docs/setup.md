# Local setup

## Prerequisites

- Node.js 20+
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
| `DATABASE_URL` | Neon Postgres connection string (pooled, via the Neon serverless driver) |
| `DIRECT_URL` | Direct (non-pooled) connection string, used by migrations |
| `BETTER_AUTH_SECRET` | Random secret — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` locally; your deployment URL in prod |
| `BLOB_READ_WRITE_TOKEN` | From a Vercel Blob store (`vercel env pull`) |
| `GEMINI_API_KEY` | From Google AI Studio — server-only, never exposed to the browser |

## Scripts

```bash
npm run dev         # Next.js dev server
npm run build       # production build (web)
npm run lint        # eslint
npm run typecheck   # web app only
npm run check       # typecheck
npm test            # vitest
npm run seed        # populate the demo account (server must be running)
```

## Demo account

`npm run seed` creates `demo@jobtracker.app` / `demotracker2026` with sample applications, multiple resume versions, and pre-computed high-fit/low-fit JD analyses so every AI feature has something to show. Start the server first (`npm run start &`), then run the seed.

## Verifying a build

- Automated: `npm run lint && npm run check && npm test && npm run build`
- By hand: follow the [manual QA checklist](manual-qa.md)

## Related docs

- [Architecture & design decisions](architecture.md)
- [Deploy guide](deploy.md)
