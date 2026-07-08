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

Run on `gemini-2.5-flash` + `gemini-embedding-001`; `npm run eval` regenerates.

| Suite | Measures | Result |
| --- | --- | --- |
| **skill-match** | embedding layer's lift over lexical-only matching (macro, n=12) | recall **86.1% → 94.4% (+8.3)**, F1 **90.5% → 95.5%**, precision 97.9% — **captured** ✅ |
| **jd-analysis** | skill extraction P/R/F1 · seniority accuracy · schema-valid rate (n=15) | 100% on a 4-example validation sample; full run pending quota † |
| **tailoring** | LLM-as-judge relevance / grounding / formatting (1–5) · hallucination rate | implemented; run pending quota † |

† The Gemini **free tier caps generation at 20 requests/day**, and `jd-analysis`
(15) + `tailoring` (6 gen + 6 judge) exceeds that in a single day. `skill-match`
runs on the separate embeddings quota, so it captures in full. Use a paid key —
or run one suite per day, or `--n` to subset — to fill the rest; the report
writes itself.

### skill-match — the ablation, in detail

| Metric | Lexical only | Lexical + embeddings |
| --- | --- | --- |
| F1 | 90.5% | **95.5%** |
| Recall | 86.1% | **94.4%** |
| Precision | ~100% | 97.9% |

The embedding layer recovers paraphrased skills that lexical matching misses —
`observability` from “Prometheus metrics and Grafana dashboards”, `CI/CD` from
“GitHub Actions pipelines” — for **+8.3 points of recall** at a small precision
cost. That is the quantified justification for the semantic layer.

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
