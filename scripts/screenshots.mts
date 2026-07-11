import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
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

async function shootFullPage(file: string) {
  const pageHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  await page.setViewportSize({
    width: CONTEXT_OPTIONS.viewport.width,
    height: Math.min(pageHeight, 2200),
  });
  await settle(page);
  await page.screenshot({ path: path.join(outDir, file) });
  await page.setViewportSize({ ...CONTEXT_OPTIONS.viewport });
  console.log(`✓ ${file}`);
}

async function shootSection(heading: string, file: string) {
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
      height: Math.min(rect.height + PAD * 2, rect.docHeight - y),
    },
  });
  console.log(`✓ ${file}`);
}

await settle(page);
await shootFullPage("dashboard.png");

await page.goto("/dashboard/applications");
await settle(page);
await shootFullPage("board.png");

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
await browser.close();
console.log(`Saved to ${path.relative(rootDir, outDir)}/`);
