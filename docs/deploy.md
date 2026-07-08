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
| `DATABASE_URL` / `DIRECT_URL` | Neon (pooled / direct) |
| `BETTER_AUTH_SECRET` | random string — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | your deployment URL, e.g. `https://job-tracker-app-project.vercel.app` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob |

Redeploy Vercel after env changes (new deployments only pick up new vars).

---

## Step 2 — Database migrations

```bash
npx prisma migrate deploy
```

---

## Step 3 — Smoke test

See [manual-qa.md](./manual-qa.md) sections 7–9 on the live URL.

---

## Local development

```bash
npm run dev      # http://localhost:3000
```
