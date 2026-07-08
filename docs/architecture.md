# Architecture

How the system is put together, and the reasoning behind the key decisions.

## System overview

```
Browser
   │
   ▼
Next.js ── auth, CRUD, file upload, pgvector queries, AI
   │                        │
   │                        ├──▶ Postgres (Neon) + Vercel Blob
   │                        │
   │                        └──▶ lib/ai/ (in-process) ──▶ Gemini API
```

- **One Next.js service.** Server Actions and Route Handlers handle UI, sessions, database access, file upload, rate limiting, and the AI calls. `GEMINI_API_KEY` is read only inside `lib/ai/` (server-side) and is never sent to the browser.
- **`lib/ai/` module.** `analyze` (structured JSON), `embeddings` (batch), and `stream` (token-by-token bullet tailoring + interview prep). The heavy Gemini logic sits behind one boundary; the rest of the app imports a thin facade (`lib/ai-client.ts`).
- **Zod schemas** in `src/lib/schemas/` are the single source of truth for the AI contract — used both to constrain the model (schema-out) and to validate its response (validate-in).

## Project layout

```
job-tracker/                 # a single Next.js 16 app
├── src/
│   ├── app/                 # App Router (routes) + Route Handlers
│   ├── components/          # UI by domain (auth, applications, resumes…)
│   ├── actions/             # Server Actions
│   ├── lib/                 # Server utilities: auth, data, ai/, schemas/, errors
│   └── generated/prisma/    # Prisma client (generated, gitignored)
├── prisma/                  # schema + migrations
├── evals/                   # AI evaluation harness
├── tests/
├── docs/
└── scripts/
```

## Key decisions

### Why this is a single app (and was briefly a monorepo)

The repo went through a deliberate arc, visible in the git history:

1. **Monorepo + Turborepo** — introduced when the system was two deployables
   (Next.js + an Express AI service) that shared a validation contract. A
   monorepo with `packages/shared` (Zod schemas) and `packages/db` (Prisma)
   earned its place: it kept one source of truth across two apps and let
   Turborepo cache/parallelise their tasks.
2. **Collapsed back to a single Next.js app** — once the Express service was
   folded in-process, `shared` and `db` had a single consumer, so the workspace
   split, the `@job-tracker/*` package boundaries, and Turborepo were all
   ceremony without a payoff. They were removed; schemas moved to
   `src/lib/schemas/`, Prisma to `prisma/` + `src/generated/`.

The point isn't monorepo-vs-not — it's that structure should track the shape of
the system. Complexity was added when two services justified it and removed when
one didn't.

### Why the AI runs in-process (and not as a separate service)

This started as a separate Express microservice and was later folded into the Next.js app. The honest trade-off:

- **What the split bought:** the Gemini key lived in its own process, and the AI worker could scale/deploy independently.
- **What it cost:** an extra network hop, a second deployment target, a shared-key auth scheme to maintain, and a two-process local dev loop — all to wrap a handful of I/O-bound Gemini SDK calls.
- **Why in-process wins here:** the key is server-only either way (Server Actions and Route Handlers never reach the browser), the AI work is I/O-bound not CPU-bound (a separate process buys no isolation the event loop doesn't already give), and Route Handlers stream a `ReadableStream` just as well as Express. Removing the hop cut latency and the operational surface without weakening the security boundary.

The AI code is still isolated **as a module** (`lib/ai/`) rather than a service, so the boundary is preserved where it adds value (one place owns the key and the prompts) and dropped where it only added ceremony.

### Defense-in-depth auth

A `proxy.ts` (Next 16's renamed middleware) does an optimistic cookie check for fast redirects, but it is **never the only gate**: every page, Server Action, and route handler independently re-checks the session and scopes its queries by `userId`. This design directly addresses CVE-2025-29927, where Next.js middleware could be bypassed entirely — here, bypassing the middleware gains an attacker nothing.

### Two-layer AI validation

The JSON schema Gemini must follow is derived from a Zod schema (`z.toJSONSchema`), and the response is re-validated with that same Zod schema on the way back in. Malformed model output becomes an explicit, recoverable `AiError` instead of a runtime crash somewhere in the UI. Schema-out, validate-in — the model is treated as an untrusted external system.

### pgvector via raw SQL

Vector columns are declared as `Unsupported("vector(768)")` in the Prisma schema, so Prisma tracks them in migrations without schema drift, while embeddings are written and ranked with raw SQL — cosine distance via the `<=>` operator over an HNSW index. Resume fit scores are a single ranked query, not an application-side loop.

### Streaming UX

Bullet tailoring and interview prep stream token-by-token: Gemini's async chunk iterator is wrapped in a web `ReadableStream` inside `lib/ai/stream.ts` and returned straight from the Route Handler to the browser. The user sees output begin in under a second instead of staring at a spinner for ten.

### Per-request data efficiency

- The session lookup is memoized with `React.cache`, so a request costs one Better Auth call instead of one per layout + page.
- Independent reads on a page are fetched with `Promise.all` instead of waterfalling.

### Private resume storage

Resume PDFs live in a **private** Vercel Blob store and are streamed only through an authenticated, ownership-scoped route handler. The blob URL is never exposed publicly.

## Challenges & solutions

| Challenge | Solution |
| --- | --- |
| **Prisma 7 dropped the bundled query engine** | Prisma schema + migrations live in `prisma/`; the client generates into `src/generated/` and is configured via `prisma.config.ts`. |
| **Connection exhaustion in serverless** | Next.js serverless functions were exhausting Postgres connections with the standard `pg` driver (plus TLS/SNI routing issues). Switched to `@neondatabase/serverless` + `@prisma/adapter-neon`, which pool natively over HTTP/WebSocket. |
| **Better Auth pulled a broken kysely** | kysely `0.29.2` stopped re-exporting a symbol the adapter imports; pinned to `0.28.17` via an npm `override`. |
| **Next 16 renamed `middleware` → `proxy`** | Read the bundled Next docs and adopted the new `proxy.ts` convention — which also reinforced the decision to keep auth checks in the data layer. |
| **AI output can't be trusted** | The Zod round-trip (schema-out, validate-in) makes off-schema Gemini responses an explicit, recoverable failure instead of a page crash. |
| **Resume privacy** | Private Blob store + authenticated streaming route; no public URLs. |

## Related docs

- [Setup & scripts](setup.md)
- [Deploy guide](deploy.md)
- [Manual QA checklist](manual-qa.md)
- [Design system](DESIGN.md)
