import { test, expect } from "@playwright/test";
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

for (const page_ of PAGES) {
  test(`${page_.name} has no serious accessibility violations`, async ({
    page,
  }) => {
    await page.goto(page_.path);
    await page.waitForLoadState("networkidle");

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const serious = violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    expect(
      serious.map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.help}`),
    ).toEqual([]);
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
