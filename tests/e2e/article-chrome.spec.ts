import { createHmac, randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { post, session } from "@/lib/db/schema";
import { assertTestDatabase, createPost } from "@/tests/helpers/db";

const articlePath = "/@test_writer/chronicle-testing";
const token = randomUUID();
const relatedIds: string[] = [];

test.beforeAll(async () => {
  assertTestDatabase();
  const db = await getDb();
  const now = new Date();
  await db.insert(session).values({
    id: randomUUID(),
    token,
    userId: "seed-writer",
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + 3600000),
  });
  for (let index = 0; index < 4; index++) {
    const created = await createPost("seed-writer", {
      title: `Another observation ${index}`,
      slug: `chrome-observation-${index}`,
    });
    relatedIds.push(created.id);
  }
});

test.afterAll(async () => {
  assertTestDatabase();
  const db = await getDb();
  if (relatedIds.length)
    await db.delete(post).where(inArray(post.id, relatedIds));
  await db.delete(session).where(eq(session.token, token));
});

test("article byline, inline actions and other published stories", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(articlePath);
  const byline = page.getByRole("group", { name: "Story byline" });
  await expect(
    byline.getByRole("link", { name: "Test Writer", exact: true }),
  ).toHaveAttribute("href", "/@test_writer");
  await expect(byline.getByText(/min read/)).toBeVisible();
  await expect(byline.locator("time")).toBeVisible();
  const actions = page.getByRole("group", { name: "Story actions" });
  await expect(
    actions.getByRole("button", { name: "Share", exact: true }),
  ).toBeAttached();
  expect(
    await actions.evaluate((element) => getComputedStyle(element).position),
  ).toBe("static");
  const related = page.getByRole("region", { name: "More from Test Writer" });
  await expect(related.getByRole("heading", { level: 3 })).toHaveCount(3);
  await expect(related.locator(`a[href="${articlePath}"]`)).toHaveCount(0);
  await expect(
    related.locator('a[href*="unfinished-notes"], a[href*="reader-notes"]'),
  ).toHaveCount(0);
  await related.getByRole("heading", { level: 3 }).first().click();
  await expect(page).toHaveURL(/chrome-observation-/);
});

test("mobile actions remain visible and respond focuses unobscured comments", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
    .update(token)
    .digest("base64");
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: encodeURIComponent(`${token}.${signature}`),
      url: "http://localhost:3000",
    },
  ]);
  await page.goto(articlePath);
  const actions = page.getByRole("group", { name: "Story actions" });
  await expect(actions).toBeInViewport();
  expect(
    await actions.evaluate((element) => getComputedStyle(element).position),
  ).toBe("fixed");
  await actions
    .getByRole("button", { name: "Respond (1)", exact: true })
    .click();
  const field = page.getByRole("textbox", { name: "Leave a note" });
  await expect(field).toBeFocused();
  await expect(field).toBeInViewport();
  const fieldBox = await field.boundingBox();
  const actionsBox = await actions.boundingBox();
  expect(fieldBox!.y + fieldBox!.height).toBeLessThan(actionsBox!.y);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("mobile footer navigation clears the action bar at maximum scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(articlePath);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const shell = page.locator("[data-public-page]");
  await expect
    .poll(() =>
      shell.evaluate((element) =>
        parseFloat(getComputedStyle(element).paddingBottom),
      ),
    )
    .toBeGreaterThan(0);
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  const lastLink = page
    .getByRole("navigation", { name: "Footer navigation" })
    .getByRole("link")
    .last();
  const actions = page.getByRole("group", { name: "Story actions" });
  await expect(lastLink).toBeInViewport();
  const linkBox = await lastLink.boundingBox();
  const barBox = await actions.boundingBox();
  expect(linkBox!.y + linkBox!.height).toBeLessThanOrEqual(barBox!.y);
  await lastLink.click({ trial: true });
});

test("share copies the story URL with feedback when native sharing is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (url: string) => {
          document.documentElement.dataset.copiedUrl = url;
        },
      },
    });
  });
  await page.goto(articlePath);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(
    page.getByText("Link copied to clipboard", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-copied-url",
    `http://localhost:3000${articlePath}`,
  );
});

test("share failure offers a selectable link and empty recommendations are hidden", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("Permission denied");
        },
      },
    });
  });
  await page.goto("/@test_reader/reader-notes");
  await expect(page.getByRole("region", { name: /More from/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Story link" })).toHaveValue(
    "http://localhost:3000/@test_reader/reader-notes",
  );
});
