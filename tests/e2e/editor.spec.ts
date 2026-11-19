import { createHmac, randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { session } from "@/lib/db/schema";
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
