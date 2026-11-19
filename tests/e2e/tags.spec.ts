import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";
import { inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { postTag, tag } from "@/lib/db/schema";
import { deleteTestUser, signIn } from "@/tests/e2e/helpers/auth";
import { createPost } from "@/tests/helpers/db";

import type { Page } from "@playwright/test";

async function capture(page: Page, surface: string): Promise<void> {
  const directory = process.env.F3_SCREENSHOTS;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  for (const [size, width, height] of [["desktop", 1280, 900], ["mobile", 390, 844]] as const) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: path.join(directory, `${surface}-${size}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

test("publishes topics, browses a topic, filters search and edits tags", async ({ context, page }) => {
  const writer = await signIn(context, { name: "Amelia Reed" });
  const [community] = await db.insert(tag).values({ name: "Community", slug: "community" })
    .onConflictDoUpdate({ target: tag.slug, set: { name: "Community" } }).returning();
  const draft = await createPost(writer.id, { published: false });
  await db.insert(postTag).values({ postId: draft.id, tagId: community.id });
  try {
    await page.goto("/new");
    await page.getByRole("textbox", { name: "Post title", exact: true }).fill("Gardens that bring us together");
    await page.locator('[contenteditable="true"]').fill("A thoughtful guide to gardens and the communities that grow around them.");
    const input = page.getByPlaceholder("Add a tag", { exact: true });
    await input.fill("Gardens");
    await input.press("Enter");
    await input.fill("Com");
    await page.getByRole("button", { name: "Community", exact: true }).click();
    await capture(page, "editor-tags");
    await page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await expect(page).toHaveURL(/\/edit\//);
    const editPath = new URL(page.url()).pathname;
    await page.reload();
    await expect(page.getByRole("button", { name: "Remove Gardens", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove Community", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByRole("button", { name: "Unpublish", exact: true })).toBeEnabled();
    await page.goto(`/@${writer.username}/${editPath.split("/").pop()}`);
    const topics = page.getByLabel("Topics", { exact: true });
    await expect(topics.getByRole("link", { name: "Gardens", exact: true })).toBeVisible();
    await capture(page, "article-chips");
    await topics.getByRole("link", { name: "Gardens", exact: true }).click();
    await expect(page).toHaveURL(/\/tag\/gardens$/);
    await expect(page.getByRole("heading", { name: "Gardens that bring us together", exact: true })).toBeVisible();
    await expect(page.getByText("1 story", { exact: true })).toBeVisible();
    await capture(page, "tag-page");
    await page.goto("/search?q=gardens");
    await page.getByLabel("Topic", { exact: true }).selectOption("gardens");
    await expect(page).toHaveURL(/tag=gardens/);
    await expect(page.getByRole("heading", { name: "Gardens that bring us together", exact: true })).toBeVisible();
    await capture(page, "search-filter");
    await page.goto(editPath);
    await page.getByRole("button", { name: "Remove Gardens", exact: true }).click();
    await page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save Draft", exact: true })).toBeDisabled();
    await page.reload();
    await expect(page.getByRole("button", { name: "Remove Gardens", exact: true })).toHaveCount(0);
    await page.goto("/search?q=gardens&tag=gardens");
    await expect(page.getByText("No stories found matching your query.", { exact: true })).toBeVisible();
    await page.goto("/tag/not-a-real-topic");
    await expect(page.getByRole("heading", { name: /404/ })).toBeVisible();
  } finally {
    await deleteTestUser(writer.id);
    await db.delete(tag).where(inArray(tag.slug, ["community", "gardens"]));
  }
});
