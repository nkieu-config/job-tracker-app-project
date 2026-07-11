# Deploy guide — Vercel

Production runs as a single Next.js app on Vercel. The AI calls (Gemini) run
in-process inside Server Actions and Route Handlers, so there is no second
service to deploy.

| Service | Host | Env file (local) |
|---------|------|------------------|
| Next.js app | Vercel | `.env` |

`GEMINI_API_KEY` is a server-only Vercel env var — never exposed to the browser.

---

## Prerequisites

1. Push to GitHub (includes `vercel.json`).
2. Neon Postgres + Vercel Blob configured.
3. Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

---

## Step 1 — Vercel project settings (one-time)

In [Vercel project settings](https://vercel.com), keep **Root Directory** at the
repository root (default). `vercel.json` sets the install/build commands.

### Environment variables

| Variable | Notes |
|----------|-------|
| `GEMINI_API_KEY` | Google AI Studio key (server-only) |
| `DATABASE_URL` | Neon **pooled** endpoint — what the app uses at runtime |
| `DIRECT_URL` | Neon **direct** endpoint — used only by `prisma migrate` |
| `BETTER_AUTH_SECRET` | random string — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | your deployment URL, e.g. `https://job-tracker-app-project.vercel.app` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob |
| `ADMIN_EMAILS` | comma-separated emails allowed to view `/dashboard/ai-usage` (optional; empty means nobody) |
| `CRON_SECRET` | bearer token Vercel Cron sends to `/api/cron/*` — the rate-limit sweep in `vercel.json` (optional; the route refuses to run when unset) |

Redeploy Vercel after env changes (new deployments only pick up new vars).

> **Check the pooled hostname.** Neon appends `-pooler` to the *endpoint* label,
> not the compute label: `ep-xxx-pooler.c-2.<region>.aws.neon.tech`. A URL shaped
> `ep-xxx.c-2-pooler.<region>...` fails TLS verification — Neon's wildcard
> certificate does not cover it — and every database call errors at runtime.
>
> The app must use the pooled URL. `DIRECT_URL` opens one unpooled connection per
> serverless invocation and exhausts Postgres `max_connections` under load.

---

## Step 2 — Database migrations

```bash
npx prisma migrate deploy
```

---

## Step 3 — Seed the demo account (optional)

The **Try the demo** button expects `demo@jobtracker.app` to exist with sample
data. Seed it against the production database once, after the first deploy —
point `BASE_URL` at the live URL (the seed signs the account up through the
running app so passwords hash the same way) and the connection strings at Neon:

```bash
BASE_URL=https://job-tracker-app-project.vercel.app \
DIRECT_URL=<neon-direct-url> \
BETTER_AUTH_URL=https://job-tracker-app-project.vercel.app \
npm run seed
```

The seed only resets the demo account's own rows, so it is safe to re-run.

---

## Step 4 — Smoke test

See [manual-qa.md](./manual-qa.md) sections 7–9 on the live URL.

---

## Local development

```bash
npm run dev      # http://localhost:3000
```
