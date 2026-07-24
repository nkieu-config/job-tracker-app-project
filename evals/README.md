# AI evaluation harness

Reproducible, metric-based evaluation of the app's Gemini features. Most
capstone projects wrap an LLM and hope; this measures whether the LLM actually
does what it claims, with numbers you can regenerate.

```bash
npm run eval                 # all suites
npm run eval jd-analysis     # one suite
npm run eval skill-match -- --n=5   # subset (fewer API calls)
```

Reads `.env` for `GEMINI_API_KEY`. Writes a scorecard to
`evals/reports/latest.{json,md}` and prints it to the console.

## What it measures

Six suites, each demonstrating a different evaluation technique.

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

The judge should be a **different, stronger model** than the one under test — a
model judging its own output scores it leniently (self-preference bias). It
defaults to `gemini-3.5-flash` (a different model from the `gemini-3.5-flash-lite`
under test; the earlier `gemini-2.5-pro` default is no longer served on the free
tier). Override with `EVAL_JUDGE_MODEL` — for the tailoring suite, whose generator
is itself `gemini-3.5-flash`, point it at a different model so it isn't
self-judged. Setting it equal to the generation model is allowed, but the report
notes that the scores are self-judged.

### 4. `coach` — LLM-as-judge + a model-free grounding check

Scores `generateCoachAdvice` on relevance / grounding / actionability (1–5) with
an LLM judge, and separately asserts — with no model — that the single skill the
coach tells you to focus on is a gap actually present in the pipeline data. The
deterministic check is the one that can't be gamed by a lenient judge.

### 5. `autofill` — reference-based, no judge

Runs `extractApplicationFields` over labelled job descriptions and scores the
company and role (case-insensitively) and the deadline (exactly) against the gold
values. Deterministic — it needs only generation calls, no second model.

### 6. `interview` — LLM-as-judge + a structural contract check

Collects the streamed `interviewPrepStream` output and scores it two ways. An LLM
judge rates relevance / grounding / actionability (1–5) and flags requirements the
sheet assumes but the JD never states. Separately — with no model — the sheet is
parsed back against its prompt contract: all three sections present, 5–7 technical
questions, 3 behavioral, 3 to ask the interviewer, each with an answer key. The
structural check is the one a lenient judge can't inflate.

## Results

Generation on `gemini-3.5-flash-lite` + `gemini-embedding-001` (tailoring on
`gemini-3.5-flash` — see below), judged by the default `gemini-3.5-flash`;
`npm run eval` regenerates. Generation moved from `gemini-3.1-flash-lite` on the
harness's own evidence: every metric held or improved, and the 25× quota is what
makes a full same-day capture affordable.

| Suite | Measures | Status | Result |
| --- | --- | --- | --- |
| **skill-match** | embedding layer's lift over lexical-only matching (macro, n=12) | Captured | recall **86.1% → 94.4% (+8.3)**, F1 **90.5% → 95.5%**, precision 97.9% |
| **jd-analysis** | skill extraction P/R/F1 · seniority accuracy · schema-valid rate (n=15) | Captured | F1 **90.4%** (P 89.8% / R 97.8%), seniority accuracy **93.3%**, schema-valid **100%** |
| **coach** | LLM-judge relevance / grounding / actionability (1–5) · focus-skill grounding · hallucination rate (n=5) | Captured | **5 / 5 / 4.6**, focus grounded **100%**, hallucination rate **0%** |
| **autofill** | company / role / deadline extraction accuracy · schema-valid rate (n=6) | Captured | company / role / deadline **100% / 100% / 100%**, schema-valid **100%** |
| **tailoring** | LLM-as-judge relevance / grounding / formatting (1–5) · hallucination rate (n=6) | Captured | **4.83 / 4.83 / 5**, hallucination rate **0%** — up from grounding 3.83 and a 50% hallucination rate on `gemini-3.1-flash-lite` |
| **interview** | LLM-judge relevance / grounding / actionability (1–5) · structural validity · answer-key coverage · hallucination rate (n=5) | Captured | **5 / 5 / 5**, structure valid **100%**, answer-key coverage **100%**, hallucination rate **0%** |

> [!NOTE]
> The eval doing its job, then closing the loop: it caught that the then-current
> `gemini-3.1-flash-lite`, fine for the extraction suites, grounded bullet
> tailoring below the gate — 3.83/5, fabricating qualifiers like
> "high-throughput" in half its outputs. Tailoring alone was routed to the
> stronger `gemini-3.5-flash` and its prompt tightened to bar unsupported
> qualifiers. The re-capture confirms the fix rather than assuming it:
> **grounding 3.83 → 4.83, hallucination rate 50% → 0%**, across the full n=6.
> A model choice made by measurement, and verified the same way.
>
> What is still unmeasured is whether the split is needed *now* that generation
> runs on `gemini-3.5-flash-lite` rather than the 3.1 lite that failed. Pointing
> `TAILORING_MODEL` at the lite model and re-running this suite is the one
> experiment that would retire the exception — worth doing, and cheap.

> [!NOTE]
> The interview suite forced a metric fix, not a model fix. The first run scored
> a 40% hallucination rate — but half of that was the judge applying the
> tailoring/coach rule ("any specific not in the JD is fabricated") to a task
> where naming a concrete topic to ask about (e.g. Kubernetes NetworkPolicies
> for a role that lists Kubernetes) is the whole point. The judge's `fabricated`
> criterion was narrowed to *unsupported assumptions about the role or
> candidate*; the rate fell to 20% and the one remaining flag is real — the
> model over-levelled a 3+-year Frontend Engineer role to "senior" in a
> behavioral question. Same lesson as tailoring: the eval measures, then
> something changes.

> [!IMPORTANT]
> The Gemini free tier meters per model. `gemini-3.5-flash-lite` allows **500 requests/day**, which is what makes running the whole harness in one sitting realistic; the judge models are far tighter (`gemini-3.5-flash` is 20/day). The judged suites
> also need `EVAL_JUDGE_MODEL` pointed at a served model (e.g. `gemini-3.5-flash`)
> since `gemini-2.5-pro` is no longer free; `skill-match` runs on the separate
> embeddings quota. Excluded items
> (e.g. a call the API never answered) are reported as such, never silently
> scored. Use `-- --n=<k>` to subset, or a paid key, to run more freely.

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
  `server/ai` code never has to handle a 429. Override with `EVAL_RPM`.
- **A network failure is not a model failure** ([`lib/retry.ts`](lib/retry.ts)) —
  `AiError` carries a `kind` (`transport` · `timeout` · `empty` · `malformed` ·
  `schema`). Transport and timeout errors are retried with exponential backoff
  (`EVAL_MAX_ATTEMPTS`, total attempts, default 3); if they still fail, the item
  is **excluded from every metric** and reported in a note. Only `empty` /
  `malformed` / `schema` — the model answering with something unusable — is
  scored, counting against schema validity and the rubric/P/R/F1 means.
  `jd-analysis` and `tailoring` both apply this split. `skill-match` scores
  deterministic matchers instead, so it makes one preflight embedding call and
  fails loudly if the API is down — otherwise `matchSkillsSemantic`'s internal
  fallback would report a dead API as "the semantic layer adds no lift".
  Without this split, one 503 silently reads as "the model hallucinated",
  which is how eval harnesses quietly lie.
- **A partially-successful run is a failed run** — a suite that errors still
  lets the others print and write their report, but `npm run eval` exits
  non-zero so a broken suite cannot pass a CI gate unnoticed.
- **Quality thresholds gate the run** ([`lib/thresholds.ts`](lib/thresholds.ts))
  — after the infrastructure checks pass, each suite's headline metrics are
  compared against a committed floor (and a hallucination-rate ceiling). A prompt
  edit that halves F1 now exits non-zero instead of just printing a worse
  scorecard. They're regression alarms with headroom for model nondeterminism,
  not targets; raise them when a change genuinely moves the baseline up. An
  exploratory subset run scores too few items to be meaningful, so pass
  `-- --no-thresholds` (or use `-- --n=<k>`, which is exploratory by intent) to
  skip the gate.
- **Latency measures the model, not the pacer** ([`lib/timing.ts`](lib/timing.ts))
  — the reported timings wrap only the API call, excluding the rate-limiter's
  window wait and retry backoff, which on the free tier dwarf the real latency.
- **Pure metrics are unit-tested** in CI ([`../tests/evals/metrics.test.ts`](../tests/evals/metrics.test.ts))
  — the eval code itself is tested, no API required.
- **Datasets** are synthetic-but-realistic (`datasets/*.json`) to avoid scraping
  real postings and to keep gold labels defensible.
