import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { bookmark } from "@/lib/db/schema";
import { deleteTestUser, signIn } from "@/tests/e2e/helpers/auth";
import { createPost, createUser } from "@/tests/helpers/db";

import type { Page } from "@playwright/test";

async function capture(page: Page, surface: string): Promise<void> {
  const directory = process.env.F4_SCREENSHOTS;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  for (const theme of ["Light", "Dark"] as const) {
    for (const [size, width, height] of [
      ["desktop", 1280, 900],
      ["mobile", 390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.getByRole("button", { name: "Choose color theme" }).click();
      await page.getByRole("menuitem", { name: theme, exact: true }).click();
      await expect(page.locator("html")).toHaveClass(
        new RegExp(theme.toLowerCase()),
      );
      await page.getByRole("heading", { level: 1 }).click();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
      await page.screenshot({
        path: path.join(
          directory,
          `${surface}-${theme.toLowerCase()}-${size}.png`,
        ),
        fullPage: true,
        animations: "disabled",
      });
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

test("saves an article, finds it in the library and removes it from the story card", async ({
  context,
  page,
}) => {
  test.setTimeout(60_000);
  const reader = await signIn(context, { name: "Avery Morgan" });
  const writer = await createUser({ name: "Clara Bennett" });
  const article = await createPost(writer.id, {
    title: "The pleasure of reading slowly",
    excerpt: "A little room for stories that deserve a second visit.",
    content:
      "## A quieter kind of attention\n\nSome stories stay with us long after the last page. They ask us to notice the everyday details: a familiar street, a conversation, the light through a window.\n\nA reading list is an invitation to return. Save something that catches your eye, then come back when you have a little more time.",
  });
  try {
    await page.goto(`/@${writer.username}/${article.slug}`);
    await page.getByRole("button", { name: "Save story", exact: true }).click();
    const saved = page.getByRole("button", {
      name: "Remove story from reading list",
      exact: true,
    });
    await expect(saved).toHaveAttribute("aria-pressed", "true");
    await expect(saved).toBeEnabled();
    await capture(page, "article-saved");
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Library", exact: true })
      .click();
    await expect(page).toHaveURL(/\/library$/);
    const storyTitle = page.getByRole("heading", {
      name: article.title,
      exact: true,
    });
    await expect(storyTitle).toBeVisible();
    await expect(storyTitle).toHaveCSS("text-transform", "none");
    await expect(
      page.getByText("1 saved story", { exact: true }),
    ).toBeVisible();
    await capture(page, "library");
    await page
      .getByRole("button", {
        name: "Remove story from reading list",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Your reading list is empty",
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Your reading list is empty",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Your reading list is empty",
        exact: true,
      }),
    ).toHaveCSS("text-transform", "none");
    await capture(page, "library-empty");
  } finally {
    await deleteTestUser(reader.id);
    await deleteTestUser(writer.id);
  }
});

test("prompts signed-out readers to sign in and protects the library", async ({
  page,
}) => {
  await page.goto("/library");
  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Flibrary$/);
  await page.goto("/@test_writer/chronicle-testing");
  const prompt = page.getByRole("link", {
    name: "Sign in to save story",
    exact: true,
  });
  await expect(prompt).toBeVisible();
  await prompt.click();
  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=/);
  expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(
    "/@test_writer/chronicle-testing",
  );
  await page.goto("/archive");
  await expect(
    page
      .getByRole("link", { name: "Sign in to save story", exact: true })
      .first(),
  ).toBeVisible();
});

test("offers sign-in again when a reader's session expires", async ({
  context,
  page,
}) => {
  const reader = await signIn(context);
  try {
    await page.goto("/@test_writer/chronicle-testing");
    await expect(
      page.getByRole("button", { name: "Save story", exact: true }),
    ).toBeVisible();
    await context.clearCookies();
    await page.getByRole("button", { name: "Save story", exact: true }).click();
    await expect(
      page.getByText("Your session has expired. Sign in to save this story.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sign in to save story", exact: true }),
    ).toBeVisible();
  } finally {
    await deleteTestUser(reader.id);
  }
});

test("rolls back an optimistic save when the action fails", async ({
  context,
  page,
}) => {
  const reader = await signIn(context);
  const db = await getDb();
  try {
    await page.goto("/@test_writer/chronicle-testing");
    await page.route("**/@test_writer/chronicle-testing", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 500, body: "Unavailable" })
        : route.continue(),
    );
    await page.getByRole("button", { name: "Save story", exact: true }).click();
    await expect(
      page.getByText("Could not update your reading list", { exact: true }),
    ).toBeVisible();
    const button = page.getByRole("button", {
      name: "Save story",
      exact: true,
    });
    await expect(button).toBeEnabled();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    expect(
      await db.select().from(bookmark).where(eq(bookmark.userId, reader.id)),
    ).toEqual([]);
  } finally {
    await deleteTestUser(reader.id);
  }
});

test("paginates saved stories without repeating the first page", async ({
  context,
  page,
}) => {
  const reader = await signIn(context);
  const db = await getDb();
  try {
    for (let index = 1; index <= 13; index++) {
      const article = await createPost(reader.id, {
        title: `Saved story ${index}`,
      });
      await db.insert(bookmark).values({
        userId: reader.id,
        postId: article.id,
        createdAt: new Date(Date.UTC(2025, 0, index)),
      });
    }
    await page.goto("/library");
    await expect(page.locator(".catalogue-entries article")).toHaveCount(12);
    await expect(
      page.getByRole("heading", { name: "Saved story 13", exact: true }),
    ).toBeVisible();
    const pagination = page.getByRole("navigation", {
      name: "Reading list pagination",
    });
    await pagination.getByRole("link", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(/\/library\?page=2$/);
    await expect(page.locator(".catalogue-entries article")).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Saved story 1", exact: true }),
    ).toBeVisible();
    await pagination
      .getByRole("link", { name: "Previous", exact: true })
      .click();
    await expect(page.locator(".catalogue-entries article")).toHaveCount(12);
  } finally {
    await deleteTestUser(reader.id);
  }
});
