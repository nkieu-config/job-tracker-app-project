import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "@playwright/test";
import {
  BASE_URL,
  CONTEXT_OPTIONS,
  sectionByHeading,
  signInAsDemo,
} from "../e2e/helpers";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, "docs", "screenshots");
const outFile = path.join(outDir, "tailor-streaming.gif");

const GIF_WIDTH = 880;
const FPS = 12;
const MAX_SECONDS = 12;
const LEAD_IN_MS = 700;
const TAIL_MS = 1600;

if (spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status !== 0) {
  console.error("ffmpeg is required. Install it with: brew install ffmpeg");
  process.exit(1);
}

try {
  await fetch(BASE_URL);
} catch {
  console.error(
    `Cannot reach ${BASE_URL}. Start the app first (npm run build && npm run start), then re-run.`,
  );
  process.exit(1);
}

async function ready(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

const videoDir = await mkdtemp(path.join(tmpdir(), "job-tracker-demo-"));
const browser = await chromium.launch();
const context = await browser.newContext({
  ...CONTEXT_OPTIONS,
  deviceScaleFactor: 1,
  recordVideo: { dir: videoDir, size: CONTEXT_OPTIONS.viewport },
});
const page = await context.newPage();
const recordingStartedAt = Date.now();

try {
  await signInAsDemo(page);
} catch {
  console.error(
    "Demo sign-in failed. Seed the demo account first: npm run seed (with the app running).",
  );
  await browser.close();
  await rm(videoDir, { recursive: true, force: true });
  process.exit(1);
}

await page.goto("/dashboard/applications/demo_app_1");
await ready(page);

const section = sectionByHeading(page, "Tailor resume bullets");

const experience = section.getByLabel("Experience to tailor");
if (!(await experience.inputValue()).trim()) {
  await experience.fill(
    "Built and shipped a Next.js app with a Postgres backend: designed the schema, wrote the API layer, and set up CI. Also mentored two interns and led the migration off a legacy service.",
  );
}

await page.evaluate(() => {
  const sections = [...document.querySelectorAll("section")];
  const tailor = sections.findIndex((s) =>
    s.querySelector("h2")?.textContent?.includes("Tailor resume bullets"),
  );
  for (const below of sections.slice(tailor + 1)) {
    (below as HTMLElement).style.visibility = "hidden";
  }
});

await section.evaluate((el) => {
  const top = el.getBoundingClientRect().top + window.scrollY - 32;
  window.scrollTo({ top, behavior: "instant" });
});
await page.waitForTimeout(600);

const generate = section.getByRole("button", {
  name: /^(Tailor bullets|Regenerate bullets)$/,
});
const clickedAt = Date.now();
await generate.click();

const copy = section.getByRole("button", { name: "Copy bullets" });
const failure = section.getByRole("alert");
await copy.or(failure).first().waitFor({ timeout: 180_000 });

if (await failure.count()) {
  console.error(`Tailoring failed: ${await failure.first().innerText()}`);
  await browser.close();
  await rm(videoDir, { recursive: true, force: true });
  process.exit(1);
}

await page.waitForTimeout(TAIL_MS);
const finishedAt = Date.now();

const rect = await section.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});

const video = page.video();
await context.close();
await browser.close();

const source = await video!.path();

const start = Math.max((clickedAt - recordingStartedAt - LEAD_IN_MS) / 1000, 0);
const duration = (finishedAt - clickedAt + LEAD_IN_MS) / 1000;
const speed = duration > MAX_SECONDS ? duration / MAX_SECONDS : 1;

const pad = 16;
const crop = [
  Math.round(Math.min(rect.width + pad * 2, CONTEXT_OPTIONS.viewport.width)),
  Math.round(Math.min(rect.height + pad * 2, CONTEXT_OPTIONS.viewport.height)),
  Math.round(Math.max(rect.x - pad, 0)),
  Math.round(Math.max(rect.y - pad, 0)),
];

const filters = [
  `crop=${crop.join(":")}`,
  speed > 1 ? `setpts=PTS/${speed.toFixed(3)}` : null,
  `fps=${FPS}`,
  `scale=${GIF_WIDTH}:-1:flags=lanczos`,
]
  .filter(Boolean)
  .join(",");

const palette = path.join(videoDir, "palette.png");

function ffmpeg(args: string[]) {
  const run = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...args], {
    stdio: "inherit",
  });
  if (run.status !== 0) {
    console.error("ffmpeg failed.");
    process.exit(1);
  }
}

ffmpeg([
  "-ss",
  start.toFixed(2),
  "-t",
  duration.toFixed(2),
  "-i",
  source,
  "-vf",
  `${filters},palettegen=stats_mode=diff`,
  palette,
]);

ffmpeg([
  "-ss",
  start.toFixed(2),
  "-t",
  duration.toFixed(2),
  "-i",
  source,
  "-i",
  palette,
  "-lavfi",
  `${filters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
  "-loop",
  "0",
  outFile,
]);

await rm(videoDir, { recursive: true, force: true });

const { size } = await import("node:fs/promises").then((fs) =>
  fs.stat(outFile),
);
console.log(
  `✓ ${path.relative(rootDir, outFile)} — ${(size / 1_000_000).toFixed(1)} MB, ${(duration / speed).toFixed(1)}s${speed > 1 ? ` (sped up ${speed.toFixed(1)}×)` : ""}`,
);
if (size > 4_000_000) {
  console.warn("Over 4 MB — lower FPS or GIF_WIDTH and re-run.");
}
