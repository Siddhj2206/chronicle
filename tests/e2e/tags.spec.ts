import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { postTag, tag } from "@/lib/db/schema";
import { deleteTestUser, signIn } from "@/tests/e2e/helpers/auth";
import { captureThemes } from "@/tests/e2e/helpers/theme";
import { createPost, createUser } from "@/tests/helpers/db";

import type { Page } from "@playwright/test";

async function capture(page: Page, surface: string): Promise<void> {
  const directory = process.env.F3_SCREENSHOTS;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  for (const [size, width, height] of [
    ["desktop", 1280, 900],
    ["mobile", 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page.screenshot({
      path: path.join(directory, `${surface}-${size}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  if (surface === "article-chips")
    await captureThemes(
      page,
      directory,
      surface,
      page.locator("article header"),
    );
}

test("publishes topics, browses a topic, filters search and edits tags", async ({
  context,
  page,
}) => {
  test.setTimeout(60_000);
  const writer = await signIn(context, { name: "Amelia Reed" });
  const db = await getDb();
  const [community] = await db
    .insert(tag)
    .values({ name: "Community", slug: "community" })
    .onConflictDoUpdate({ target: tag.slug, set: { name: "Community" } })
    .returning();
  const draft = await createPost(writer.id, { published: false });
  await db.insert(postTag).values({ postId: draft.id, tagId: community.id });
  try {
    await page.goto("/new");
    await page
      .getByRole("textbox", { name: "Post title", exact: true })
      .fill("Gardens that bring us together");
    await page
      .locator('[contenteditable="true"]')
      .fill(
        "A thoughtful guide to gardens and the communities that grow around them.",
      );
    const saved = page.getByRole("status").filter({ hasText: /^Saved$/ });
    await expect(saved).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/edit\//);
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    const panel = page.getByRole("dialog");
    const input = page.getByPlaceholder("Add a tag", { exact: true });
    const invalidName = page.getByText(
      "Use a tag of 1–50 characters with letters or numbers.",
      { exact: true },
    );
    for (const name of ["#", "+"]) {
      await input.fill(name);
      await input.press("Enter");
      await expect(invalidName).toBeVisible();
      await expect(
        page.getByRole("button", { name: `Remove ${name}`, exact: true }),
      ).toHaveCount(0);
    }
    await input.fill("Gardens");
    await input.press("Enter");
    await expect(invalidName).toHaveCount(0);
    await input.fill("Com");
    await page.getByRole("button", { name: "Community", exact: true }).click();
    for (const name of ["東京", "C++", "C#"]) {
      await input.fill(name);
      await input.press("Enter");
    }
    await capture(page, "editor-tags");
    await panel.getByRole("button", { name: "Close", exact: true }).click();
    await expect(saved).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/edit\//);
    const editPath = new URL(page.url()).pathname;
    await page.reload();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Remove Gardens", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Remove Community", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Remove Gardens", exact: true })
      .click();
    await panel.getByRole("button", { name: "Close", exact: true }).click();
    await expect(saved).toBeVisible({ timeout: 15000 });
    await page.reload();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Remove Gardens", exact: true }),
    ).toHaveCount(0);
    await input.fill("Gardens");
    await input.press("Enter");
    await panel
      .getByRole("button", { name: "Confirm publish", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Publishing settings", exact: true }),
    ).toBeEnabled();
    await page.goto(`/@${writer.username}/${editPath.split("/").pop()}`);
    const topics = page.getByLabel("Topics", { exact: true });
    await expect(
      topics.getByRole("link", { name: "Gardens", exact: true }),
    ).toBeVisible();
    await expect(
      topics.getByRole("link", { name: "C++", exact: true }),
    ).toHaveAttribute("href", "/tag/c-plus-plus");
    await expect(
      topics.getByRole("link", { name: "C#", exact: true }),
    ).toHaveAttribute("href", "/tag/c-sharp");
    await capture(page, "article-chips");
    const articlePath = new URL(page.url()).pathname;
    await expect(
      topics.getByRole("link", { name: "東京", exact: true }),
    ).toHaveAttribute("href", `/tag/${encodeURIComponent("東京")}`);
    await topics.getByRole("link", { name: "東京", exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`/tag/${encodeURIComponent("東京")}$`),
    );
    await expect(
      page.getByRole("heading", { name: "東京", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Gardens that bring us together",
        exact: true,
      }),
    ).toBeVisible();
    await page.goto(articlePath);
    await topics.getByRole("link", { name: "Gardens", exact: true }).click();
    await expect(page).toHaveURL(/\/tag\/gardens$/);
    await expect(
      page.getByRole("heading", {
        name: "Gardens that bring us together",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("1 story", { exact: true })).toBeVisible();
    await capture(page, "tag-page");
    await page.goto("/search?q=gardens");
    await page.getByLabel("Topic", { exact: true }).selectOption("gardens");
    await expect(page).toHaveURL(/tag=gardens/);
    await expect(
      page.getByRole("heading", {
        name: "Gardens that bring us together",
        exact: true,
      }),
    ).toBeVisible();
    await capture(page, "search-filter");
    await page.goto(editPath);
    await page
      .getByRole("button", { name: "Publishing settings", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Remove Gardens", exact: true })
      .click();
    await panel
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(panel).not.toBeVisible();
    await expect(saved).toBeVisible();
    await page.reload();
    await page
      .getByRole("button", { name: "Publishing settings", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Remove Gardens", exact: true }),
    ).toHaveCount(0);
    await panel.getByRole("button", { name: "Close", exact: true }).click();
    await page.goto("/search?q=gardens&tag=gardens");
    await expect(
      page.getByRole("heading", { name: "No stories found.", exact: true }),
    ).toBeVisible();
    await page.goto("/tag/not-a-real-topic");
    await expect(
      page.getByRole("heading", { name: "Page Not Found", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("404", { exact: true })).toBeVisible();
  } finally {
    await deleteTestUser(writer.id);
    await db
      .delete(tag)
      .where(
        inArray(tag.slug, [
          "community",
          "gardens",
          "東京",
          "c-plus-plus",
          "c-sharp",
        ]),
      );
  }
});

test("keeps long topic chips inside both catalogue columns", async ({
  page,
}) => {
  const writer = await createUser({ name: "Topic Layout Writer" });
  const db = await getDb();
  const name = "W".repeat(50);
  const slug = name.toLowerCase();
  const [topic] = await db.insert(tag).values({ name, slug }).returning();
  try {
    for (let index = 1; index <= 3; index++) {
      const article = await createPost(writer.id, {
        title: `Long topic story ${index}`,
      });
      await db.insert(postTag).values({ postId: article.id, tagId: topic.id });
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/tag/${slug}`);
    const entries = page.locator(".catalogue-entries");
    const chips = entries.getByRole("link", { name, exact: true });
    await expect(chips).toHaveCount(3);
    for (const chip of await chips.all()) {
      await expect(chip).toHaveAttribute("title", name);
      const bounds = await chip.evaluate((element) => {
        const card = element.closest("article")!.getBoundingClientRect();
        const rect = element.getBoundingClientRect();
        const label = element.querySelector("span")!;
        return {
          left: rect.left,
          right: rect.right,
          cardLeft: card.left,
          cardRight: card.right,
          truncated: label.scrollWidth > label.clientWidth,
        };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(bounds.cardLeft - 1);
      expect(bounds.right).toBeLessThanOrEqual(bounds.cardRight + 1);
      expect(bounds.truncated).toBe(true);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(1280);
    const directory = process.env.F3_SCREENSHOTS;
    if (directory) {
      await mkdir(directory, { recursive: true });
      await entries.screenshot({
        path: path.join(directory, "long-topic-cards.png"),
        animations: "disabled",
      });
    }
  } finally {
    await deleteTestUser(writer.id);
    await db.delete(tag).where(eq(tag.id, topic.id));
  }
});
