import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { printSuite, writeReport } from "./lib/report";
import { checkThresholds } from "./lib/thresholds";
import type { RunOptions, SuiteResult } from "./lib/types";
import * as jdAnalysis from "./suites/jd-analysis.eval";
import * as skillMatch from "./suites/skill-match.eval";
import * as tailoring from "./suites/tailoring.eval";
import * as coach from "./suites/coach.eval";

const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(here, "../.env") });
process.env.AI_USAGE_DISABLED = "1";

type Suite = { name: string; run: (opts: RunOptions) => Promise<SuiteResult> };

const SUITES: Suite[] = [jdAnalysis, skillMatch, tailoring, coach];
const BY_NAME = new Map(SUITES.map((s) => [s.name, s]));

// `--n=abc` is NaN, which is falsy-ish enough to silently disable the limit and
// run the full (paid) dataset. Reject it instead.
function parseLimit(raw: string): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    console.error(`--n must be an integer >= 1, got ${JSON.stringify(raw)}`);
    process.exit(1);
  }
  return parsed;
}

async function main() {
  const args = process.argv.slice(2);
  const nArg = args.find((a) => a.startsWith("--n="));
  const limit = nArg ? parseLimit(nArg.slice("--n=".length)) : undefined;
  // Thresholds gate CI. An exploratory `--n=2` run scores too few items for
  // them to mean anything, so allow opting out explicitly.
  const enforceThresholds = !args.includes("--no-thresholds");
  const requested = args.filter((a) => !a.startsWith("--"));
  const selected =
    requested.length && !requested.includes("all")
      ? requested.map((n) => BY_NAME.get(n)).filter((s): s is Suite => Boolean(s))
      : SUITES;

  if (selected.length === 0) {
    console.error(`No matching suites. Available: ${[...BY_NAME.keys()].join(", ")}`);
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set (.env). Evals call the real API.");
    process.exit(1);
  }

  const results: SuiteResult[] = [];
  const failed: string[] = [];
  for (const s of selected) {
    console.error(`running ${s.name}${limit ? ` (n=${limit})` : ""}...`);
    try {
      results.push(await s.run({ limit }));
    } catch (err) {
      // One suite failing (e.g. hitting the API quota) must not drop the others.
      failed.push(s.name);
      console.error(
        `  ✗ ${s.name} failed: ${(err instanceof Error ? err.message : String(err)).slice(0, 200)}`,
      );
    }
  }

  for (const r of results) printSuite(r);

  if (results.length > 0) {
    const stamp = new Date().toISOString();
    const dir = await writeReport(results, stamp);
    console.log(`\nreport → ${path.relative(process.cwd(), dir)}/latest.{json,md}`);
  }

  // A partially-successful run is a failed run. Exiting 0 here would let a
  // broken suite pass unnoticed in CI, which is the whole point of a gate.
  if (failed.length) {
    console.error(`\nFAILED suites: ${failed.join(", ")}`);
    process.exit(1);
  }
  if (results.length === 0) process.exit(1);

  // Infrastructure worked; now check the thing evals exist to measure. Without
  // this a prompt regression prints a worse scorecard and still exits 0.
  if (enforceThresholds) {
    const violations = checkThresholds(results);
    if (violations.length) {
      console.error(`\nQUALITY THRESHOLDS NOT MET:`);
      for (const v of violations) console.error(`  ✗ ${v}`);
      process.exit(1);
    }
    console.error(`\nAll quality thresholds met.`);
  } else {
    console.error(`\nThresholds skipped (--no-thresholds).`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
