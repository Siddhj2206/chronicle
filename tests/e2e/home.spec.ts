import { expect, test } from "@playwright/test";

test("home has a featured story, URL-backed Latest tab, story rows and desktop rail", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const featured = page.getByRole("region", { name: "Featured story" });
  await expect(featured.getByRole("heading", { level: 2 })).toBeVisible();
  await expect(featured.locator(".story-cover")).toBeVisible();
  const tab = page.getByRole("tab", { name: "Latest", exact: true });
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab")).toHaveCount(1);
  await tab.focus();
  await tab.press("ArrowRight");
  await expect(tab).toBeFocused();
  await tab.press("Space");
  await expect(page).toHaveURL(/\?tab=latest$/);
  const feed = page.getByRole("tabpanel", { name: "Latest" });
  const row = feed.locator("[data-feed-story]").first();
  await expect(row.getByRole("heading", { level: 3 })).toBeVisible();
  await expect(row.getByText(/min read/)).toBeVisible();
  await expect(row.locator("time")).toBeVisible();
  await expect(row.locator("a[aria-label]")).toHaveAttribute(
    "href",
    /^\/@[^/]+\/.+/,
  );
  const rail = page.getByTestId("home-rail");
  await expect(rail).toBeVisible();
  await expect(
    rail.getByRole("heading", { name: "Staff picks", exact: true }),
  ).toBeVisible();
  await expect(rail.getByRole("region", { name: "Writers" })).toBeVisible();
  const feedBox = await feed.boundingBox();
  const railBox = await rail.boundingBox();
  expect(railBox!.x).toBeGreaterThan(feedBox!.x + feedBox!.width);
});

test("mobile feed has right-hand thumbnails, working story links and no overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?tab=following");
  await expect(
    page.getByRole("tab", { name: "Latest", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("home-rail")).toBeHidden();
  await expect(
    page.getByRole("region", { name: "Featured story" }),
  ).toBeVisible();
  const row = page.locator("[data-feed-story]").first();
  const heading = row.getByRole("heading", { level: 3 });
  await heading.scrollIntoViewIfNeeded();
  const titleBox = await heading.boundingBox();
  const thumbnailBox = await row.locator("a[aria-label]").boundingBox();
  expect(thumbnailBox!.x).toBeGreaterThan(titleBox!.x + titleBox!.width);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const title = await heading.textContent();
  await heading.click();
  await expect(page).toHaveURL(/\/@[^/]+\/.+/);
  await expect(
    page.getByRole("heading", { level: 1, name: title! }),
  ).toBeVisible();
});
