import { expect, test } from "@playwright/test";

test("long article has contents, working heading anchors and reading progress", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/@test_writer/chronicle-testing");
  await expect(
    page.getByRole("heading", {
      name: "Chronicle Testing Journal",
      exact: true,
    }),
  ).toBeVisible();
  const contents = page.locator('nav[aria-label="Table of contents"]:visible');
  await expect(contents.getByRole("link")).toHaveCount(4);
  await expect(page.locator("#a-reproducible-newsroom")).toHaveAttribute(
    "id",
    "a-reproducible-newsroom",
  );
  await expect(page.getByTestId("reading-progress")).toBeAttached();
  await contents
    .getByRole("link", { name: "A thoughtful practice", exact: true })
    .click();
  await expect(page).toHaveURL(/#a-thoughtful-practice$/);
  await expect(
    contents.getByRole("link", { name: "A thoughtful practice", exact: true }),
  ).toHaveAttribute("aria-current", "location");
  const top = await page
    .locator("#a-thoughtful-practice")
    .evaluate((heading) => heading.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(90);
  expect(top).toBeLessThan(160);
  await expect
    .poll(() =>
      page
        .getByTestId("reading-progress")
        .locator("div")
        .evaluate((bar) => bar.getBoundingClientRect().width),
    )
    .toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(
    contents.getByRole("link", {
      name: "A reproducible newsroom",
      exact: true,
    }),
  ).toHaveAttribute("aria-current", "location");
});

test("mobile contents disclosure works without horizontal page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.goto("/@test_writer/chronicle-testing");
  const disclosure = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "Contents" }) });
  await disclosure.locator("summary").click();
  await expect(disclosure.getByRole("link")).toHaveCount(4);
  await disclosure
    .getByRole("link", { name: "A thoughtful practice", exact: true })
    .click();
  await expect(page).toHaveURL(/#a-thoughtful-practice$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
