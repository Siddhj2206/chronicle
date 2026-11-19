import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { deleteTestUser, signIn } from "@/tests/e2e/helpers/auth";
import { createPost, createUser } from "@/tests/helpers/db";

import type { Page } from "@playwright/test";

async function capture(page: Page, surface: string): Promise<void> {
  const directory = process.env.F2_SCREENSHOTS;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByPlaceholder("Search posts…")).toBeVisible();
  await page.screenshot({
    path: path.join(directory, `${surface}-desktop.png`),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Open search", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: path.join(directory, `${surface}-mobile.png`),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
}

test("follows a writer, reads their dispatches, and unfollows from the article", async ({
  context,
  page,
}) => {
  const reader = await signIn(context, { name: "A Chronicle Reader" });
  const writer = await createUser({
    name: "Eleanor Finch",
    bio: "Independent reporting on the people and places that make a neighborhood. A new dispatch every Sunday.",
  });
  const article = await createPost(writer.id, {
    title: "The Sunday Dispatch",
    excerpt:
      "Notes from the streets we share, and the stories that bring us together.",
    content:
      "A neighborhood begins with the people who pay attention. Each week, this dispatch follows the small changes taking place around us.\n\nAt the market, in the library, and along the river, there are stories worth telling. Thank you for reading, and for keeping the conversation going.",
  });
  try {
    await page.goto("/following");
    await expect(
      page.getByText("You’re not following any writers yet.", { exact: true }),
    ).toBeVisible();
    await page.goto(`/@${writer.username}`);
    await expect(page.getByText("0 followers", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Follow", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Unfollow", exact: true }),
    ).toBeEnabled();
    await expect(page.getByText("1 follower", { exact: true })).toBeVisible();
    await capture(page, "profile");

    await page.getByRole("link", { name: "Following", exact: true }).click();
    await expect(page).toHaveURL(/\/following$/);
    await expect(
      page.getByRole("heading", { name: article.title, exact: true }),
    ).toBeVisible();
    await capture(page, "following");

    await page.goto(`/@${writer.username}/${article.slug}`);
    const byline = page.locator("article footer");
    await expect(
      byline.getByRole("button", { name: "Unfollow", exact: true }),
    ).toBeEnabled();
    await capture(page, "article-byline");
    await byline.getByRole("button", { name: "Unfollow", exact: true }).click();
    await expect(
      byline.getByRole("button", { name: "Follow", exact: true }),
    ).toBeEnabled();
    await page.goto(`/@${writer.username}`);
    await expect(page.getByText("0 followers", { exact: true })).toBeVisible();
    await page.goto("/following");
    await expect(
      page.getByRole("heading", { name: article.title, exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Discover writers in the archive" }),
    ).toBeVisible();
    await page.goto(`/@${reader.username}`);
    await expect(
      page.getByRole("button", { name: /^(Follow|Unfollow)$/ }),
    ).toHaveCount(0);
  } finally {
    await deleteTestUser(reader.id);
    await deleteTestUser(writer.id);
  }
});

test("prompts signed-out readers to sign in before following", async ({
  page,
}) => {
  await page.goto("/@test_writer");
  await page
    .getByRole("link", { name: "Sign in to follow", exact: true })
    .click();
  await expect(page).toHaveURL(
    /\/sign-in\?callbackUrl=%2F(?:%40|@)test_writer$/,
  );
  await page.goto("/following");
  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Ffollowing$/);
});
