# Deploy guide — Vercel

Production is a single Next.js app on Vercel, configured by one local `.env`.
The AI calls (Gemini) run in-process inside Server Actions and Route Handlers,
so there is no second service to deploy.

`GEMINI_API_KEY` is a server-only Vercel env var — never exposed to the browser.

## Prerequisites

1. Push to GitHub (includes `vercel.json`).
2. Neon Postgres + Vercel Blob configured.
3. Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

## Step 1 — Vercel project settings (one-time)

In [Vercel project settings](https://vercel.com), keep **Root Directory** at the
repository root (default). `vercel.json` sets the install/build commands.

### Environment variables

Set the variables [setup.md](./setup.md#environment-variables) lists — that table
is the reference. Two of them behave differently in production:

| Variable | In production |
| --- | --- |
| `BETTER_AUTH_URL` | Your deployment URL, not `localhost`. Better Auth rejects a request whose origin doesn't match this, so a stale value fails every sign-in with "Invalid origin". |
| `DATABASE_URL` | Must be the **pooled** endpoint — see the warning below. |

Redeploy Vercel after env changes (new deployments only pick up new vars).

> **Check the pooled hostname.** Neon appends `-pooler` to the *endpoint* label,
> not the compute label: `ep-xxx-pooler.c-2.<region>.aws.neon.tech`. A URL shaped
> `ep-xxx.c-2-pooler.<region>...` fails TLS verification — Neon's wildcard
> certificate does not cover it — and every database call errors at runtime.
>
> The app must use the pooled URL. `DIRECT_URL` opens one unpooled connection per
> serverless invocation and exhausts Postgres `max_connections` under load.

## Step 2 — Database migrations

Migrations flow through the Neon branches (see
[setup.md](./setup.md#database-branches-neon)): develop with
`npx prisma migrate dev` against the `dev` branch — the one `.env` points at —
then apply the reviewed migrations to production by overriding `DIRECT_URL`
with the `production` branch's direct URL (kept as a comment in `.env`):

```bash
DIRECT_URL=<production-direct-url> npx prisma migrate deploy
```

> **Read the generated migration before applying it.** Prisma cannot express the
> HNSW index on the embedding columns, so a generated migration may contain a
> `DROP INDEX` for `resume_version_embedding_hnsw_idx`. Delete that line — the
> background is in
> [architecture.md](./architecture.md#pgvector-via-raw-sql).

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

After the first deploy this is automated: the
[reseed-demo workflow](../.github/workflows/reseed-demo.yml) runs the same seed
nightly (20:00 UTC). It needs one repository secret, `PROD_DIRECT_URL` — the
`production` branch's direct connection string.

## Step 4 — Smoke test

See [manual-qa.md](./manual-qa.md) sections 7–9 on the live URL.

## Local development

```bash
npm run dev      # http://localhost:3000
```

Full local setup, env vars and scripts: [setup.md](./setup.md).
