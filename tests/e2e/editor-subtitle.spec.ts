import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { deleteTestUser, signIn } from "@/tests/e2e/helpers/auth";

test("publishes a story with a subtitle and updates it through the editor", async ({ context, page }) => {
  const writer = await signIn(context, { name: "The Local Desk" });
  const title = "The Quiet Revival of the Neighborhood Press";
  const subtitle = "Small newsrooms are finding new ways to tell the stories closest to home.";
  const revisedSubtitle = "Local stories, lasting connections";
  const screenshotDir = process.env.F1_SCREENSHOTS;

  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/new");
    await expect(page).toHaveURL(/\/new$/);
    await page.getByRole("textbox", { name: "Post title", exact: true }).fill(title);
    await page.getByRole("textbox", { name: "Post subtitle (optional)", exact: true }).fill(subtitle);
    await page.getByRole("textbox", { name: "Post excerpt", exact: true }).fill("A dispatch from independent publishers rebuilding the daily conversation, one edition at a time.");
    await page.locator('[contenteditable="true"]').fill("The first edition arrived on a Saturday morning. At the corner cafe, readers unfolded its pages and found something familiar: the names of their neighbors, the streets they walked, and the questions they had been asking.\n\nAcross the city, small independent newsrooms are bringing local reporting back to the breakfast table. Their stories begin at school meetings, on shop floors, and in the quiet conversations that rarely make national headlines.\n\nFor these publishers, the ambition is simple. Listen carefully, report fairly, and give the neighborhood a place to see itself. The next edition is already taking shape.");
    if (screenshotDir) {
      await mkdir(screenshotDir, { recursive: true });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(screenshotDir, "editor-desktop.png"), fullPage: true });
    }
    await page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await expect(page).toHaveURL(/\/edit\//);
    const editURL = page.url();
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Post subtitle (optional)", exact: true })).toHaveValue(subtitle);
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByRole("button", { name: "Unpublish", exact: true })).toBeEnabled();

    const slug = new URL(editURL).pathname.split("/").pop();
    const articleURL = `/@${writer.username}/${slug}`;
    await page.goto(articleURL);
    await expect(page.locator("article header").getByText(subtitle, { exact: true })).toBeVisible();
    await expect(page.locator("article header").getByText("1 min read", { exact: true })).toBeVisible();
    await expect(page.locator("article header")).not.toContainText("A dispatch from independent publishers");

    await page.goto(editURL);
    await page.getByRole("textbox", { name: "Post subtitle (optional)", exact: true }).fill(revisedSubtitle);
    await page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save Draft", exact: true })).toBeDisabled();
    await page.goto(articleURL);
    await expect(page.locator("article header").getByText(revisedSubtitle, { exact: true })).toBeVisible();
    await expect(page.locator("article header").getByText(subtitle, { exact: true })).toHaveCount(0);
    await expect(page.locator("article header").getByText("1 min read", { exact: true })).toBeVisible();
    if (screenshotDir) {
      await page.screenshot({ path: path.join(screenshotDir, "article-desktop.png"), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByRole("button", { name: "Open search", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
      await page.screenshot({ path: path.join(screenshotDir, "article-mobile.png"), fullPage: true });
      await page.setViewportSize({ width: 1280, height: 900 });
    }
    await page.goto("/");
    await expect(page.locator("article").first()).toContainText(revisedSubtitle);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1280);
    if (screenshotDir) {
      await page.screenshot({ path: path.join(screenshotDir, "home-desktop.png"), fullPage: true });
    }
  } finally {
    await deleteTestUser(writer.id);
  }
});
