import { expect, test } from "@playwright/test";

test.afterEach(async ({ page }) => {
  await expect(page.locator("body")).not.toContainText(
    /Application error|Something went wrong|Internal Server Error/i,
  );
});

for (const path of ["/", "/archive", "/@test_writer", "/search?q=Chronicle"]) {
  test(`renders seeded stories on ${path}`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(
      page
        .getByRole("heading", {
          name: "Chronicle Testing Journal",
          exact: true,
        })
        .first(),
    ).toBeVisible();
  });
}

test("renders article body and comments", async ({ page }) => {
  await page.goto("/@test_writer/chronicle-testing");
  await expect(page.getByRole("heading", { name: "Chronicle Testing Journal", exact: true })).toBeVisible();
  await expect(page.locator("article header").getByText("Stories from a reproducible newsroom", { exact: true })).toBeVisible();
  await expect(page.locator("article header").getByText("1 min read", { exact: true })).toBeVisible();
  await expect(page.getByText("This seeded article makes smoke tests reliable.", { exact: true })).toBeVisible();
  await expect(page.getByText("A helpful seeded comment.", { exact: true })).toBeVisible();
});

test("renders sign-in", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(
    page.getByRole("heading", { name: "Press Access" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
});

test("renders the 404 page for an unknown article", async ({ page }) => {
  await page.goto("/@test_writer/no-such-article");
  await expect(
    page.getByRole("heading", { name: "Story Not Found" }),
  ).toBeVisible();
  await expect(page.getByText("404", { exact: true })).toBeVisible();
});

test("redirects a signed-out dashboard visitor to sign-in", async ({
  page,
}) => {
  await page.goto("/manuscripts");
  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fmanuscripts$/);
  await expect(
    page.getByRole("heading", { name: "Press Access" }),
  ).toBeVisible();
});
