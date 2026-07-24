import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Every screen a visitor actually lands on, checked against WCAG 2 A/AA. The
// suite asserts on serious and critical violations only: axe's "minor" and
// "moderate" buckets include advisory rules that a design can reasonably
// decline, and a gate that fails on advice stops being a gate.
const PAGES = [
  { name: "Today", path: "/dashboard" },
  { name: "Applications", path: "/dashboard/applications" },
  { name: "Applications list view", path: "/dashboard/applications?view=list" },
  { name: "The desk", path: "/dashboard/applications/demo_app_1" },
  { name: "New application", path: "/dashboard/applications/new" },
  { name: "Resumes", path: "/dashboard/resumes" },
];

// The two screens someone meets before they have an account — and the landing
// page is the one a visitor may only ever see. Checked signed out, which is how
// they are actually met; both render either way.
const PUBLIC_PAGES = [
  { name: "Landing page", path: "/" },
  { name: "Sign in", path: "/sign-in" },
];

async function expectNoSeriousViolations(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");

  // Sections below the fold enter at opacity 0 and reveal on scroll. Left
  // unscrolled, axe reads that as text with no contrast against its background
  // and reports a violation for every one of them — a real reading of the DOM,
  // and a false reading of the design. Walk the page first so it is measured in
  // the state a visitor sees.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((done) => setTimeout(done, 60));
    }
    window.scrollTo(0, 0);
  });
  // Every section has been asked to reveal; wait for them to say they have,
  // then for the 0.6s fade to finish. A fixed pause here is what made this
  // flaky the first time it was written.
  await page
    .locator('[data-reveal="hidden"]')
    .waitFor({ state: "detached", timeout: 5_000 })
    .catch(() => {});
  await page.waitForTimeout(800);

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const serious = violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );

  expect(
    serious.map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.help}`),
  ).toEqual([]);
}

// Both themes, because the palette is a full swap rather than a set of `dark:`
// overrides — the two are different designs sharing a layout, and only one of
// them had ever been checked. The first dark run failed on every page in the
// app for a single reason, which is what a gate that only ever ran in light
// had been hiding.
for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    for (const page_ of PAGES) {
      test(`${page_.name} has no serious accessibility violations`, async ({
        page,
      }) => {
        await expectNoSeriousViolations(page, page_.path);
      });
    }

    test.describe("signed out", () => {
      test.use({ storageState: { cookies: [], origins: [] } });

      for (const page_ of PUBLIC_PAGES) {
        test(`${page_.name} has no serious accessibility violations`, async ({
          page,
        }) => {
          await expectNoSeriousViolations(page, page_.path);
        });
      }
    });
  });
}

test("the command palette traps nothing and returns focus", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  await page.keyboard.press("ControlOrMeta+k");
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();

  const { violations } = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => v.id),
  ).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("the desk tabs are reachable and operable from the keyboard alone", async ({
  page,
}) => {
  await page.goto("/dashboard/applications/demo_app_1");
  await page.waitForLoadState("networkidle");

  const selected = page.getByRole("tab", { selected: true });
  // Read the label before moving: the locator re-resolves to whichever tab is
  // selected, so capturing it afterwards would compare the new tab to itself.
  const before = await selected.textContent();
  await selected.focus();
  await page.keyboard.press("ArrowRight");

  const nowSelected = page.getByRole("tab", { selected: true });
  await expect(nowSelected).toBeFocused();
  await expect(nowSelected).not.toHaveText(before ?? "");
});
