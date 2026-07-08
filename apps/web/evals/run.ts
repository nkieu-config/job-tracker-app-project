import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { printSuite, writeReport } from "./lib/report";
import type { RunOptions, SuiteResult } from "./lib/types";
import * as jdAnalysis from "./suites/jd-analysis.eval";
import * as skillMatch from "./suites/skill-match.eval";
import * as tailoring from "./suites/tailoring.eval";

const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(here, "../.env") });

type Suite = { name: string; run: (opts: RunOptions) => Promise<SuiteResult> };

const SUITES: Suite[] = [jdAnalysis, skillMatch, tailoring];
const BY_NAME = new Map(SUITES.map((s) => [s.name, s]));

async function main() {
  const args = process.argv.slice(2);
  const nArg = args.find((a) => a.startsWith("--n="));
  const limit = nArg ? Number(nArg.split("=")[1]) : undefined;
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
    console.error("GEMINI_API_KEY is not set (apps/web/.env). Evals call the real API.");
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
      console.error(`  ✗ ${s.name} failed: ${(err as Error).message.slice(0, 200)}`);
    }
  }

  for (const r of results) printSuite(r);
  if (failed.length) console.error(`\nskipped (errored): ${failed.join(", ")}`);
  if (results.length === 0) process.exit(1);

  const stamp = new Date().toISOString();
  const dir = await writeReport(results, stamp);
  console.log(`\nreport → ${path.relative(process.cwd(), dir)}/latest.{json,md}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
