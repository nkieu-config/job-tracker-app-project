# AI evaluation harness

Reproducible, metric-based evaluation of the app's Gemini features. Most
capstone projects wrap an LLM and hope; this measures whether the LLM actually
does what it claims, with numbers you can regenerate.

```bash
npm run eval                 # all suites
npm run eval jd-analysis     # one suite
npm run eval skill-match --n=5   # subset (fewer API calls)
```

Reads `apps/web/.env` for `GEMINI_API_KEY`. Writes a scorecard to
`evals/reports/latest.{json,md}` and prints it to the console.

## What it measures

Three suites, each demonstrating a different evaluation technique.

### 1. `jd-analysis` — reference-based structured extraction

Runs `analyzeJobDescription` over hand-labeled job descriptions and scores the
extracted `requiredSkills` against a gold set.

- **Precision / Recall / F1** (macro-averaged) on skills, comparing *normalized*
  sets so `React.js` ≡ `react` and `postgres` ≡ `PostgreSQL`
  (see [`lib/normalize.ts`](lib/normalize.ts)).
- **Seniority accuracy** — exact-match on the `intern…lead` label.
- **Schema-valid rate** — fraction of responses that pass the Zod schema (the
  model is treated as untrusted input).

### 2. `skill-match` — controlled ablation (the RAG layer's lift)

Scores the same gold matched-skill set against two implementations:

- lexical only (`matchSkills` — word-boundary + alias), and
- lexical **+ embeddings** (`matchSkillsSemantic` — cosine similarity over
  resume chunks).

The gap is the semantic layer's contribution. The dataset deliberately includes
paraphrases (`"GitHub Actions pipelines"` for `CI/CD`, `"RESTful web endpoints"`
for `REST APIs`) that lexical matching misses.

### 3. `tailoring` — LLM-as-judge

Streams `tailorBulletsStream` output, then scores it with a **separate**
temperature-0 model call against a rubric (relevance / grounding / formatting,
1–5) and flags **hallucinations** — specific technologies or metrics not present
in the candidate's experience or the JD. Judge output is Zod-validated like any
other model response, and token usage is recorded for cost observability.

## Results

Run on `gemini-2.5-flash` / `gemini-embedding-001`. Regenerate with `npm run eval`.

### skill-match (12 examples) — captured

| Metric | Lexical only | Lexical + embeddings |
| --- | --- | --- |
| F1 | 90.5% | **95.5%** |
| Recall | 86.1% | **94.4%** |
| Precision | ~100% | 97.9% |

**Recall lift from the embedding layer: +8.3%** — it recovers paraphrased skills
(e.g. `observability` from “Prometheus metrics and Grafana dashboards”) at a
small precision cost. This is the quantified justification for doing semantic
matching on top of lexical.

### jd-analysis & tailoring

The harness is validated end-to-end (a 3-example `jd-analysis` spike scored 100%
skill-F1 / 100% seniority / 100% schema-valid). Full scorecards call the
generation model heavily — `jd-analysis` (15) + `tailoring` (6 gen + 6 judge) is
27 requests, above the **Gemini free tier's 20-requests/day** cap. To capture
them, run on a paid key, or run one suite per day, or subset with `--n`. The
report file fills in automatically.

## Design notes

- **Rate limiting** ([`lib/pace.ts`](lib/pace.ts)) — the harness paces its own
  generation calls to stay under the free-tier per-minute limit, so the app's
  `lib/ai` code never has to handle a 429. Override with `EVAL_RPM`.
- **Resilient runner** — a suite that errors (e.g. hits the daily quota) is
  skipped with a note; the others still produce a report.
- **Pure metrics are unit-tested** in CI ([`../tests/eval-metrics.test.ts`](../tests/eval-metrics.test.ts))
  — the eval code itself is tested, no API required.
- **Datasets** are synthetic-but-realistic (`datasets/*.json`) to avoid scraping
  real postings and to keep gold labels defensible.
