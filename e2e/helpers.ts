import type { Browser, BrowserContext, Page } from "@playwright/test";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/constants/demo";

export const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export const CONTEXT_OPTIONS = {
  baseURL: BASE_URL,
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "light",
} as const;

export async function newDemoPage(
  browser: Browser,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext(CONTEXT_OPTIONS);
  const page = await context.newPage();
  return { context, page };
}

export async function signInAsDemo(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/dashboard");
}

export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.addStyleTag({
    content:
      "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }",
  });
}

export function sectionByHeading(page: Page, name: string) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { level: 2, name }) });
}
