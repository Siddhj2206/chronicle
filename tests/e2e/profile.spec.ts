import { createHmac, randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { post, session, user } from "@/lib/db/schema";
import { assertTestDatabase } from "@/tests/helpers/db";

const authorId = randomUUID();
const emptyId = randomUUID();
const username = `profile_${authorId.slice(0, 8)}`;
const emptyUsername = `empty_${emptyId.slice(0, 8)}`;
const token = randomUUID();
let pool: Pool;

test.beforeAll(async () => {
  assertTestDatabase();
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  const now = new Date("2025-01-01T00:00:00Z");
  await db.insert(user).values([
    {
      id: authorId,
      name: "Profile Writer",
      username,
      email: `${authorId}@example.test`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      bio: "Looking closely at everyday life.",
    },
    {
      id: emptyId,
      name: "New Profile Writer",
      username: emptyUsername,
      email: `${emptyId}@example.test`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  await db.insert(post).values([
    {
      authorId,
      title: "Most-read profile story",
      slug: "popular-profile",
      content: "A popular story.",
      published: true,
      publishedAt: now,
      viewCount: 100,
    },
    {
      authorId,
      title: "Newer profile story",
      slug: "newer-profile",
      content: "A newer story.",
      excerpt: "A closer look at the ordinary.",
      published: true,
      publishedAt: new Date("2025-02-01"),
      viewCount: 1,
    },
    {
      authorId,
      title: "Private profile draft",
      slug: "private-profile",
      content: "Not public.",
      published: false,
      viewCount: 9999,
    },
    {
      authorId: emptyId,
      title: "Draft-only private story",
      slug: "private-empty",
      content: "Not public.",
      published: false,
      viewCount: 9999,
    },
  ]);
  await db.insert(session).values({
    id: randomUUID(),
    token,
    userId: authorId,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + 3600000),
  });
});

test.afterAll(async () => {
  if (!pool) return;
  try {
    await drizzle(pool)
      .delete(user)
      .where(inArray(user.id, [authorId, emptyId]));
  } finally {
    await pool.end();
  }
});

test("profile header, featured story and feed link to published articles", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/@${username}`);
  await expect(
    page.getByRole("heading", { name: "Profile Writer", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(`@${username}`, { exact: true })).toBeVisible();
  await expect(page.getByText("Joined January 2025")).toBeVisible();
  await expect(page.getByText("2 stories", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Looking closely at everyday life."),
  ).toBeVisible();
  const featured = page.getByRole("region", { name: "Featured story" });
  await expect(
    featured.getByRole("heading", { name: "Most-read profile story" }),
  ).toBeVisible();
  await expect(featured.locator(".title-initial")).toHaveText("M");
  await expect(page.getByText("Private profile draft")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Edit profile", exact: true }),
  ).toHaveCount(0);
  const row = page.locator("[data-feed-story]");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("1 min read");
  const link = row
    .getByRole("link", { name: "Newer profile story", exact: true })
    .first();
  await expect(link).toHaveAttribute("href", `/@${username}/newer-profile`);
  await link.click();
  await expect(
    page.getByRole("heading", { name: "Newer profile story", exact: true }),
  ).toBeVisible();
});

test("URL tabs support keyboard activation, direct loads and browser history", async ({
  page,
}) => {
  await page.goto(`/@${username}`);
  const home = page.getByRole("tab", { name: "Home", exact: true });
  const about = page.getByRole("tab", { name: "About", exact: true });
  await expect(home).toHaveAttribute("aria-selected", "true");
  await home.focus();
  await home.press("ArrowRight");
  await expect(about).toBeFocused();
  await about.press(" ");
  await expect(page).toHaveURL(/\?tab=about$/);
  await expect(about).toHaveAttribute("aria-selected", "true");
  await expect(about).toHaveAttribute("aria-controls", "profile-panel-about");
  await expect(
    page.getByRole("tabpanel", { name: "About", exact: true }),
  ).toContainText("Looking closely at everyday life.");
  await expect(
    page.getByRole("region", { name: "Featured story" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(about).toHaveAttribute("aria-selected", "true");
  await about.focus();
  await about.press("Home");
  await expect(home).toBeFocused();
  await home.press("Enter");
  await expect(page).toHaveURL(/\?tab=home$/);
  await page.goBack();
  await expect(about).toHaveAttribute("aria-selected", "true");
});

test("mobile profile has right-hand feed thumbnails and no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/@${username}?tab=lists`);
  await expect(
    page.getByRole("tab", { name: "Home", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const row = page.locator("[data-feed-story]");
  await row.scrollIntoViewIfNeeded();
  const title = await row.getByRole("heading").boundingBox();
  const thumb = await row
    .getByRole("link", { name: "Newer profile story", exact: true })
    .last()
    .boundingBox();
  expect(thumb!.x).toBeGreaterThanOrEqual(title!.x + title!.width);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("tab", { name: "About", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "About Profile Writer" }),
  ).toBeVisible();
});

test("draft-only authors have an empty state and About bio fallback", async ({
  page,
}) => {
  await page.goto(`/@${emptyUsername}`);
  await expect(page.getByText("0 stories", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No stories yet." }),
  ).toBeVisible();
  await expect(page.getByText("Draft-only private story")).toHaveCount(0);
  await page.getByRole("tab", { name: "About", exact: true }).click();
  await expect(
    page.getByText("This writer has not added a bio yet."),
  ).toBeVisible();
});

test("Edit profile is available only on the signed-in writer's own page", async ({
  context,
  page,
}) => {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required");
  const signature = createHmac("sha256", secret).update(token).digest("base64");
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: encodeURIComponent(`${token}.${signature}`),
      url: "http://localhost:3000",
    },
  ]);
  await page.goto(`/@${username}`);
  await expect(
    page.getByRole("link", { name: "Edit profile", exact: true }),
  ).toHaveAttribute("href", "/settings");
  await page.goto(`/@${emptyUsername}`);
  await expect(
    page.getByRole("link", { name: "Edit profile", exact: true }),
  ).toHaveCount(0);
});

test("unknown profiles retain the existing 404", async ({ page }) => {
  await page.goto(`/@missing_${authorId}`);
  await expect(
    page.getByRole("heading", { name: "Correspondent Not Found" }),
  ).toBeVisible();
});
