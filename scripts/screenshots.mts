import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "@playwright/test";
import {
  BASE_URL,
  CONTEXT_OPTIONS,
  newDemoPage,
  sectionByHeading,
  settle,
  signInAsDemo,
} from "../e2e/helpers";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, "docs", "screenshots");

try {
  await fetch(BASE_URL);
} catch {
  console.error(
    `Cannot reach ${BASE_URL}. Start the app first (npm run build && npm run start for clean screenshots), then re-run.`,
  );
  process.exit(1);
}

const browser = await chromium.launch();
const { context, page } = await newDemoPage(browser);

try {
  await signInAsDemo(page);
} catch {
  console.error(
    "Demo sign-in failed. Seed the demo account first: npm run seed (with the app running).",
  );
  await browser.close();
  process.exit(1);
}

const PAD = 24;

async function shootFullPage(target: Page, file: string, maxHeight = 2200) {
  const pageHeight = await target.evaluate(
    () => document.documentElement.scrollHeight,
  );
  await target.setViewportSize({
    width: CONTEXT_OPTIONS.viewport.width,
    height: Math.min(pageHeight, maxHeight),
  });
  await settle(target);
  await target.screenshot({ path: path.join(outDir, file) });
  await target.setViewportSize({ ...CONTEXT_OPTIONS.viewport });
  console.log(`✓ ${file}`);
}

// The README pairs these clips two to a row, so a section that runs long would
// render shorter than its neighbour and leave a ragged gap beside it. Capping
// the clip keeps every section shot in the same aspect band at the source,
// rather than propping the layout up with per-image width attributes that the
// next regeneration would invalidate.
const SECTION_MAX_HEIGHT = 480;

async function shootSection(heading: string, file: string, maxHeight?: number) {
  const section = sectionByHeading(page, heading);
  const rect = await section.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const doc = document.documentElement;
    return {
      x: r.x + window.scrollX,
      y: r.y + window.scrollY,
      width: r.width,
      height: r.height,
      docWidth: doc.scrollWidth,
      docHeight: doc.scrollHeight,
    };
  });
  const x = Math.max(rect.x - PAD, 0);
  const y = Math.max(rect.y - PAD, 0);
  await page.screenshot({
    path: path.join(outDir, file),
    fullPage: true,
    clip: {
      x,
      y,
      width: Math.min(rect.width + PAD * 2, rect.docWidth - x),
      height: Math.min(
        rect.height + PAD * 2,
        rect.docHeight - y,
        maxHeight ?? SECTION_MAX_HEIGHT,
      ),
    },
  });
  console.log(`✓ ${file}`);
}

// The README hero is the app at its own fold, not the whole scrollable page: a
// full-page dashboard renders ~880px tall on GitHub and pushes everything below
// it off the screen. Cutting at the viewport also lands the hero on the same 1.6
// aspect as the board shot that follows, so the two full-width images agree.
await settle(page);
await shootFullPage(page, "today.png", CONTEXT_OPTIONS.viewport.height);

await page.goto("/dashboard/applications");
await settle(page);
await shootFullPage(page, "board.png");

// The new-application form with a posting pasted in, so "Read the posting" is
// live the way someone would first meet it.
await page.goto("/dashboard/applications/new");
await settle(page);
await page
  .getByLabel(/job posting/i)
  .fill(
    "Aperture Labs is hiring a Senior Frontend Engineer to build our design system in React, Next.js and TypeScript. Apply by 2026-09-15.",
  );
await settle(page);
await shootFullPage(page, "capture.png", 1400);

// The Read: the posting marked up against the resumes. This is the shot the
// README opens with, so it is taken at the fold rather than full-page.
await page.goto("/dashboard/applications/demo_app_1");
await settle(page);
await page.getByRole("tab", { name: "Match" }).click();
await settle(page);
await shootFullPage(page, "the-read.png", CONTEXT_OPTIONS.viewport.height);
await shootSection("Skills analysis", "skills-analysis.png");
await shootSection("Resume fit", "resume-fit.png");

await page.getByRole("tab", { name: "Tailor" }).click();
await settle(page);
await shootFullPage(page, "tailor.png", 1200);

// The drill, mid-question with the answer key still hidden.
await page.getByRole("tab", { name: "Prep" }).click();
await settle(page);
const practise = page.getByRole("button", { name: /practise/i });
if (await practise.count()) {
  await practise.click();
  await settle(page);
}
await shootFullPage(page, "prep-drill.png", 1200);

// The landing page's product shot — the most-seen image in the project, and
// the one nothing regenerated. It was drawn by hand and was two renames out of
// date before anyone noticed, still showing a sidebar reading "Job Tracker".
// Shot here from the same demo as everything else, in both themes, so it
// drifts with the app or not at all. 1280x800 at 2x matches the intrinsic size
// the landing page declares for it.
const signedIn = await context.storageState();
const landingDir = path.join(rootDir, "public", "landing");

for (const scheme of ["light", "dark"] as const) {
  const themed = await browser.newContext({
    ...CONTEXT_OPTIONS,
    colorScheme: scheme,
    viewport: { width: 1280, height: 800 },
    storageState: signedIn,
  });
  const themedPage = await themed.newPage();
  await themedPage.goto("/dashboard/applications");
  await settle(themedPage);
  await themedPage.screenshot({
    path: path.join(landingDir, `board-${scheme}.png`),
  });
  console.log(`✓ landing/board-${scheme}.png`);
  await themed.close();
}

await context.close();

const { context: visitorContext, page: visitorPage } =
  await newDemoPage(browser);
await visitorPage.goto("/");
await settle(visitorPage);
await shootFullPage(visitorPage, "landing.png", 4000);
await visitorContext.close();

await browser.close();
console.log(
  `Saved to ${path.relative(rootDir, outDir)}/ and public/landing/`,
);
