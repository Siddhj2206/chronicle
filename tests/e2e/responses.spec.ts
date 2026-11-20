import { mkdir } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { createPost } from "@/tests/helpers/db";
import { deleteTestUser, signIn } from "@/tests/e2e/helpers/auth";

import type { Page } from "@playwright/test";

async function capture(page: Page, name: string): Promise<void> {
  const directory = process.env.F5_SCREENSHOTS;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  for (const [size, width] of [
    ["desktop", 1280],
    ["mobile", 390],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["Light", "Dark"]) {
      await page.getByRole("button", { name: "Choose color theme" }).click();
      await page.getByRole("menuitem", { name: theme, exact: true }).click();
      await expect(page.locator("html")).toHaveClass(
        new RegExp(theme.toLowerCase()),
      );
      await page.getByRole("heading", { level: 1 }).click();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: `${directory}/${name}-${theme.toLowerCase()}-${size}.png`,
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

test("responds, flattens replies, displays author endorsements, counts and cascading deletion", async ({
  browser,
  context,
  page,
}) => {
  const authorContext = await browser.newContext();
  const author = await signIn(authorContext, { name: "Mira Ellis" });
  const reader = await signIn(context, { name: "Alex Morgan" });
  try {
    const article = await createPost(author.id, {
      title: "Notes on noticing",
      content: "There is room to pause, look again, and share what we find.",
      excerpt: "A conversation about paying attention.",
      publishedAt: new Date(),
    });
    const path = `/@${author.username}/${article.slug}`;
    await page.goto(`${path}#responses`);
    await expect(
      page.getByRole("heading", { name: "Responses (0)", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Leave a note", exact: true })
      .fill("What changes when we make time to notice the ordinary?");
    await page
      .getByRole("button", { name: "Send your note", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Responses (1)", exact: true }),
    ).toBeVisible();
    const root = page.locator(".comment-entry").filter({
      has: page.getByText(
        "What changes when we make time to notice the ordinary?",
        { exact: true },
      ),
    });
    const rootId = await root.getAttribute("id");
    await root.getByRole("button", { name: "Reply", exact: true }).click();
    await root
      .getByRole("textbox", { name: "Your reply", exact: true })
      .fill("For me, a familiar walk starts to feel like a discovery.");
    await root.getByRole("button", { name: "Send reply", exact: true }).click();
    const group = page.getByRole("group", {
      name: "Replies to Alex Morgan",
      exact: true,
    });
    await expect(group.locator("article")).toHaveCount(1);
    await group.getByRole("button", { name: "Reply", exact: true }).click();
    await group
      .getByRole("textbox", { name: "Your reply", exact: true })
      .fill("And writing it down gives that discovery a little more time.");
    await group
      .getByRole("button", { name: "Send reply", exact: true })
      .click();
    await expect(group.locator("article")).toHaveCount(2);
    await expect(group.getByRole("group")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Responses (3)", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Like as author", exact: true }),
    ).toHaveCount(0);
    const authorPage = await authorContext.newPage();
    await authorPage.goto(`${path}#responses`);
    const authorRoot = authorPage.locator(`#${rootId}`);
    await authorRoot
      .getByRole("button", { name: "Like as author", exact: true })
      .click();
    await expect(
      authorRoot.getByText("Liked by author", { exact: true }),
    ).toBeVisible();
    await authorPage
      .getByRole("group")
      .locator("article")
      .first()
      .getByRole("button", { name: "Like as author", exact: true })
      .click();
    await expect(
      authorPage.getByText("Liked by author", { exact: true }),
    ).toHaveCount(2);
    await page.reload();
    await expect(
      page.getByText("Liked by author", { exact: true }),
    ).toHaveCount(2);
    await expect(
      page.getByRole("heading", { name: "Responses (3)", exact: true }),
    ).toBeVisible();
    await capture(page, "responses");
    await page.goto("/archive");
    const card = page.locator(".story").filter({
      has: page.getByRole("heading", { name: article.title, exact: true }),
    });
    await expect(
      card.getByRole("link", { name: "3 responses", exact: true }),
    ).toBeVisible();
    await capture(page, "story-counts");
    await card.getByRole("link", { name: "3 responses", exact: true }).click();
    await root.getByRole("button", { name: "Delete", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText(
      "This note and all its replies will be permanently removed.",
    );
    await dialog.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Responses (0)", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("The conversation starts here.", { exact: true }),
    ).toBeVisible();
    await page.goto("/archive");
    await expect(
      card.getByRole("link", { name: "0 responses", exact: true }),
    ).toBeVisible();
  } finally {
    await authorContext.close();
    await deleteTestUser(reader.id);
    await deleteTestUser(author.id);
  }
});

test("signed-out reply uses the existing sign-in prompt and article callback", async ({
  page,
}) => {
  await page.goto("/@test_writer/chronicle-testing#responses");
  await expect(
    page.getByText("Sign in to join the conversation.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Like as author", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Reply", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=/);
  expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(
    "/@test_writer/chronicle-testing",
  );
});

test("a failed response preserves its text and can be retried", async ({
  context,
  page,
}) => {
  const reader = await signIn(context);
  try {
    const article = await createPost(reader.id);
    await page.goto(`/@${reader.username}/${article.slug}#responses`);
    const field = page.getByRole("textbox", {
      name: "Leave a note",
      exact: true,
    });
    await field.fill("Keep this response when the network fails.");
    await page.route("**/*", (route) =>
      route.request().headers()["next-action"]
        ? route.abort()
        : route.continue(),
    );
    await page
      .getByRole("button", { name: "Send your note", exact: true })
      .click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Could not send your response" }),
    ).toBeVisible();
    await expect(field).toHaveValue(
      "Keep this response when the network fails.",
    );
    await page.unroute("**/*");
    await page
      .getByRole("button", { name: "Send your note", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Responses (1)", exact: true }),
    ).toBeVisible();
  } finally {
    await deleteTestUser(reader.id);
  }
});
