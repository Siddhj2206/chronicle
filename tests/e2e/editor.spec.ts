import { createHmac, randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { post, session } from "@/lib/db/schema";
import { assertTestDatabase } from "@/tests/helpers/db";

const token = randomUUID();
const editorSelector = '[contenteditable="true"][data-lexical-editor="true"]';

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
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
  });
});

test.beforeEach(async ({ context }) => {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret)
    throw new Error("BETTER_AUTH_SECRET is required for editor tests");
  const signature = createHmac("sha256", secret).update(token).digest("base64");
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: encodeURIComponent(`${token}.${signature}`),
      url: "http://localhost:3000",
    },
  ]);
});

test.afterAll(async () => {
  assertTestDatabase();
  const db = await getDb();
  await db.delete(session).where(eq(session.token, token));
  await db.$client.end();
});

test("typing into an empty Lexical editor preserves character order", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/new");
  const editor = page.locator(editorSelector);
  await expect(editor).toBeVisible();
  await expect(editor).toBeEmpty();
  await editor.click();
  await editor.pressSequentially("Lexical editor typing stays in order.");
  await expect(editor).toHaveText("Lexical editor typing stays in order.");
  expect(errors).toEqual([]);
});

test("loads draft Markdown and allows further typing", async ({ page }) => {
  await page.goto("/edit/unfinished-notes");
  const editor = page.locator(editorSelector);
  await expect(editor).toHaveText("A reproducible story for readers.");
  await editor.click();
  await editor.press("ControlOrMeta+End");
  await editor.pressSequentially(" More writing.");
  await expect(editor).toHaveText(
    "A reproducible story for readers. More writing.",
  );
});

test("redirects a signed-out editor visitor to sign-in", async ({
  context,
  page,
}) => {
  await context.clearCookies();
  await page.goto("/new");
  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fnew$/);
  await expect(
    page.getByRole("heading", { name: "Press Access" }),
  ).toBeVisible();
});

test("autosaves a new draft and reviews, publishes, unpublishes and deletes it", async ({
  page,
}) => {
  await page.goto("/new");
  await page
    .getByRole("textbox", { name: "Post title", exact: true })
    .fill(`Writing smoke ${randomUUID()}`);
  await page
    .getByRole("textbox", { name: "Post subtitle", exact: true })
    .fill("A quieter writing space.");
  const editor = page.locator(editorSelector);
  await editor.fill("A story saved for tomorrow.");
  await expect(
    page.getByRole("status").filter({ hasText: /^Saved$/ }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/\/edit\//);
  await page.reload();
  await expect(editor).toHaveText("A story saved for tomorrow.");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const panel = page.getByRole("dialog");
  await expect(
    panel.getByRole("heading", { name: "Ready for readers?" }),
  ).toBeVisible();
  await expect(
    panel.getByRole("textbox", { name: "Subtitle / SEO description" }),
  ).toHaveValue("A quieter writing space.");
  await panel.getByRole("button", { name: "Confirm publish" }).click();
  await expect(panel).not.toBeVisible();
  const db = await getDb();
  const slug = new URL(page.url()).pathname.split("/").at(-1)!;
  const [before] = await db
    .select({ date: post.publishedAt })
    .from(post)
    .where(eq(post.slug, slug));
  await page.getByRole("button", { name: "Publishing settings" }).click();
  await panel
    .getByRole("textbox", { name: "Subtitle / SEO description" })
    .fill("An updated subtitle.");
  await panel
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(panel).not.toBeVisible();
  const [after] = await db
    .select({ date: post.publishedAt })
    .from(post)
    .where(eq(post.slug, slug));
  expect(after.date).toEqual(before.date);
  await page.getByRole("button", { name: "Publishing settings" }).click();
  await page.getByRole("button", { name: "Unpublish", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirm publish" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete draft", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page).toHaveURL("/manuscripts");
});

test("selection formatting is keyboard reachable and Escape dismisses it", async ({
  page,
}) => {
  await page.goto("/new");
  const editor = page.locator(editorSelector);
  await editor.fill("Selected words");
  await editor.press("ControlOrMeta+a");
  const toolbar = page.getByRole("toolbar", { name: "Text formatting" });
  await expect(toolbar).toBeVisible();
  await editor.press("Alt+F10");
  await expect(
    toolbar.getByRole("button", { name: "Bold", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(editor.locator(".lexical-bold")).toHaveText("Selected words");
  await page.keyboard.press("Escape");
  await expect(toolbar).not.toBeVisible();
});

test("empty paragraph insert menu inserts an embed URL and divider", async ({
  page,
}) => {
  await page.goto("/new");
  const editor = page.locator(editorSelector);
  await editor.click();
  await page.getByRole("button", { name: "Insert block", exact: true }).click();
  await page.getByRole("button", { name: "Embed URL", exact: true }).click();
  await page.getByRole("button", { name: "Insert", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Enter a complete" }),
  ).toHaveText("Enter a complete http or https URL.");
  await page
    .getByRole("textbox", { name: "Embed URL", exact: true })
    .fill("https://example.com/story");
  await page.getByRole("button", { name: "Insert", exact: true }).click();
  await expect(editor.getByRole("link")).toHaveAttribute(
    "href",
    "https://example.com/story",
  );
  await editor.press("ControlOrMeta+End");
  await page.getByRole("button", { name: "Insert block", exact: true }).click();
  await page.getByRole("button", { name: "Divider", exact: true }).click();
  await expect(editor.locator("hr")).toBeAttached();
});

test("a draft without a title reports an error without losing the body", async ({
  page,
}) => {
  await page.goto("/new");
  const editor = page.locator(editorSelector);
  await editor.fill("Still here after validation.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Add a title" }),
  ).toHaveText("Add a title to save your draft.");
  await expect(editor).toHaveText("Still here after validation.");
  await page
    .getByRole("textbox", { name: "Post title", exact: true })
    .fill(`Recovered draft ${randomUUID()}`);
  await expect(
    page.getByRole("status").filter({ hasText: /^Saved$/ }),
  ).toBeVisible({ timeout: 15000 });
});

test("empty paragraph image insertion reuses the upload endpoint", async ({
  page,
}) => {
  const imageUrl = "https://images.unsplash.com/writing-smoke.png";
  await page.route("**/api/upload", (route) =>
    route.fulfill({ json: { url: imageUrl } }),
  );
  await page.route(imageUrl, (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPu0AAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.goto("/new");
  const editor = page.locator(editorSelector);
  await editor.click();
  await page.getByRole("button", { name: "Insert block", exact: true }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Image", exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: "image.png",
    mimeType: "image/png",
    buffer: Buffer.from("image"),
  });
  await expect(editor.getByRole("img")).toHaveAttribute("src", imageUrl);
});

test("restoring a saved draft clears a failed save without another edit", async ({
  page,
}) => {
  await page.goto("/edit/unfinished-notes");
  const title = page.getByRole("textbox", { name: "Post title", exact: true });
  const original = await title.inputValue();
  await title.fill("");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const error = page.getByRole("alert").filter({ hasText: "Add a title" });
  await expect(error).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: /^Save failed$/ }),
  ).toBeVisible();
  await title.fill(original);
  await expect(
    page.getByRole("status").filter({ hasText: /^Saved$/ }),
  ).toBeVisible();
  await expect(error).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry save", exact: true }),
  ).not.toBeVisible();
});

test("published edits stay unsaved until explicitly saved", async ({
  page,
}) => {
  await page.goto("/edit/chronicle-testing");
  await page
    .getByRole("textbox", { name: "Post subtitle", exact: true })
    .fill("An unpublished change");
  // Longer than the draft debounce; live content must not be autosaved.
  await page.waitForTimeout(2500);
  await expect(
    page.getByRole("status").filter({ hasText: /^Unsaved$/ }),
  ).toBeVisible();
});
