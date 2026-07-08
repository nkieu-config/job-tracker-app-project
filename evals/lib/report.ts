import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SuiteResult } from "./types";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.resolve(here, "../reports");

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

function isRate(key: string, value: number): boolean {
  // Heuristic: values in [0,1] that aren't obviously counts render as percentages.
  return value >= 0 && value <= 1 && !/count|tokens/i.test(key) && key !== "n";
}

function fmt(key: string, value: number): string {
  return isRate(key, value) ? pct(value) : String(Math.round(value * 100) / 100);
}

export function printSuite(suite: SuiteResult): void {
  console.log(`\n\x1b[1m${suite.name}\x1b[0m — ${suite.description}  (n=${suite.n})`);
  const rows = Object.entries(suite.metrics).map(([k, v]) => [k, fmt(k, v)]);
  rows.push([
    "latency p50 / p95",
    `${Math.round(suite.timingMs.p50)}ms / ${Math.round(suite.timingMs.p95)}ms`,
  ]);
  const keyW = Math.max(...rows.map((r) => r[0].length));
  for (const [k, v] of rows) console.log(`  ${k.padEnd(keyW)}  ${v}`);
  if (suite.notes?.length) for (const note of suite.notes) console.log(`  · ${note}`);
}

function toMarkdown(suites: SuiteResult[], stamp: string): string {
  const lines: string[] = [`# Eval report`, ``, `Generated: ${stamp}`, ``];
  for (const s of suites) {
    lines.push(`## ${s.name}`, ``, `${s.description} (n=${s.n})`, ``);
    lines.push(`| Metric | Value |`, `| --- | --- |`);
    for (const [k, v] of Object.entries(s.metrics)) lines.push(`| ${k} | ${fmt(k, v)} |`);
    lines.push(
      `| latency p50 / p95 | ${Math.round(s.timingMs.p50)}ms / ${Math.round(s.timingMs.p95)}ms |`,
      ``,
    );
    if (s.notes?.length) {
      for (const note of s.notes) lines.push(`- ${note}`);
      lines.push(``);
    }
  }
  return lines.join("\n");
}

export async function writeReport(
  suites: SuiteResult[],
  stamp: string,
): Promise<string> {
  await mkdir(REPORT_DIR, { recursive: true });
  const json = { generatedAt: stamp, suites };
  await writeFile(
    path.join(REPORT_DIR, "latest.json"),
    JSON.stringify(json, null, 2),
  );
  const md = toMarkdown(suites, stamp);
  await writeFile(path.join(REPORT_DIR, "latest.md"), md);
  return REPORT_DIR;
}
