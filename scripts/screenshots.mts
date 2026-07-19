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
await shootFullPage(page, "dashboard.png", CONTEXT_OPTIONS.viewport.height);
await shootSection("Activity", "activity.png");
await shootSection("Coaching", "coaching.png");

await page.goto("/dashboard/applications");
await settle(page);
await shootFullPage(page, "board.png");

// The new-application form with a job description pasted in, so the AI
// auto-fill button is enabled the way a user would first see it.
await page.goto("/dashboard/applications/new");
await settle(page);
await page
  .getByLabel("Job description")
  .fill(
    "Aperture Labs is hiring a Senior Frontend Engineer to build our design system in React, Next.js and TypeScript. Apply by 2026-09-15.",
  );
await settle(page);
await shootFullPage(page, "autofill.png", 1400);

await page.goto("/dashboard/applications/demo_app_1");
await settle(page);

const fitSection = sectionByHeading(page, "Resume fit");
if ((await fitSection.getByText("No fit scores yet").count()) > 0) {
  console.log("No fit scores stored — computing (uses GEMINI_API_KEY)…");
  await fitSection
    .getByRole("button", { name: /compute resume fit/i })
    .click();
  const scores = fitSection.locator("li").first();
  const alert = fitSection.getByRole("alert");
  await scores.or(alert).first().waitFor({ timeout: 300_000 });
  if (await alert.count()) {
    console.error(`Compute fit failed: ${await alert.innerText()}`);
    await browser.close();
    process.exit(1);
  }
  await settle(page);
}

await shootSection("Skills analysis", "jd-analysis.png");
await shootSection("Resume fit", "resume-fit.png");
await shootSection("Tailor resume bullets", "tailor.png");

await page.goto("/dashboard/applications/demo_app_8");
await settle(page);
await shootSection("Interview prep", "interview-prep.png");

await context.close();

const { context: visitorContext, page: visitorPage } =
  await newDemoPage(browser);
await visitorPage.goto("/");
await settle(visitorPage);
await shootFullPage(visitorPage, "landing.png", 4000);
await visitorContext.close();

await browser.close();
console.log(`Saved to ${path.relative(rootDir, outDir)}/`);
