import { createHmac, randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { session } from "@/lib/db/schema";
import { assertTestDatabase } from "@/tests/helpers/db";

const token = randomUUID();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

test.beforeAll(async () => {
  assertTestDatabase();
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
    throw new Error("BETTER_AUTH_SECRET is required for polish tests");
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
  await db.delete(session).where(eq(session.token, token));
  await pool.end();
});

for (const [route, title] of [
  ["/missing/route/example", "Page Not Found"],
  ["/@test_writer/no-such-article", "Story Not Found"],
  ["/@no_such_writer", "Correspondent Not Found"],
]) {
  test(`recovers from ${route} without client errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(route, { waitUntil: "networkidle" });
    if (route === "/missing/route/example")
      expect(response?.status()).toBe(404);
    else expect([200, 404]).toContain(response?.status());
    await expect(page.getByText("404", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    const recovery = page.getByRole("navigation", {
      name: "Find another story",
    });
    await expect(
      recovery.getByRole("link", { name: "Back to the journal" }),
    ).toHaveAttribute("href", "/");
    await expect(
      recovery.getByRole("link", { name: "Explore the archive" }),
    ).toHaveAttribute("href", "/archive");
    expect(errors).toEqual([]);
  });
}

test("mobile navigation traps focus, closes with its button and Escape, and restores focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  const trigger = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Explore Chronicle" });
  await expect(drawer).toBeVisible();
  for (const name of [
    "Journal",
    "Archive",
    "Search",
    "Write",
    "Manuscripts",
    "Settings",
    "Profile",
  ])
    await expect(drawer.getByRole("link", { name, exact: true })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Sign out" })).toBeVisible();
  await drawer.getByRole("button", { name: "Close", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    drawer.getByRole("link", { name: "Journal", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    drawer.getByRole("button", { name: "Close", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await drawer.getByRole("button", { name: "Close", exact: true }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await drawer.getByRole("link", { name: "Archive", exact: true }).click();
  await expect(page).toHaveURL("/archive");
  await expect(drawer).toBeHidden();
});

test("signed-out mobile navigation shows account access", async ({
  context,
  page,
}) => {
  await context.clearCookies();
  await page.setViewportSize({ width: 767, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open navigation" }).click();
  const drawer = page.getByRole("dialog", { name: "Explore Chronicle" });
  await expect(drawer.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Manuscripts" })).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 768, height: 844 });
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeHidden();
});

test("search and help shortcuts work, ignore inputs, and can be disabled", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.keyboard.press("/");
  const search = page.getByRole("searchbox", { name: "Search articles" });
  await expect(search).toBeFocused();
  await page.keyboard.type("n/c?gh");
  await expect(search).toHaveValue("n/c?gh");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await search.evaluate((input) => input.blur());
  await page.keyboard.press("?");
  const help = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(help).toBeVisible();
  await expect(
    help.getByText("Write a new story", { exact: true }),
  ).toBeVisible();
  await help
    .getByRole("checkbox", { name: "Enable single-key shortcuts" })
    .uncheck();
  await page.keyboard.press("Escape");
  await page.keyboard.press("?");
  await expect(help).toBeHidden();
  await page
    .getByRole("button", { name: "Keyboard shortcuts", exact: true })
    .click();
  await expect(help).toBeVisible();
});

test("mobile slash opens a focused search dialog", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.keyboard.press("/");
  const search = page.getByRole("dialog", { name: "Search the journal" });
  await expect(
    search.getByRole("searchbox", { name: "Search articles" }),
  ).toBeFocused();
  await search.getByRole("searchbox").fill("Chronicle");
  await search.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/search\?q=Chronicle$/);
  await expect(search).toBeHidden();
});

test("home and new-story shortcuts navigate but ignore the editor", async ({
  page,
}) => {
  await page.goto("/archive", { waitUntil: "networkidle" });
  await page.keyboard.press("g");
  await page.keyboard.press("h");
  await expect(page).toHaveURL("/");
  await page.keyboard.press("n");
  await expect(page).toHaveURL("/new");
  const editor = page.getByRole("textbox", { name: "Story body" });
  await editor.fill("n/c?gh");
  await editor.press("End");
  await page.keyboard.type(" /?");
  await expect(editor).toHaveText("n/c?gh /?");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("c opens a new story for a signed-in writer", async ({ page }) => {
  await page.goto("/archive", { waitUntil: "networkidle" });
  await page.keyboard.press("c");
  await expect(page).toHaveURL("/new");
});

test("signed-out new-story shortcuts do not navigate", async ({
  context,
  page,
}) => {
  await context.clearCookies();
  await page.goto("/", { waitUntil: "networkidle" });
  await page.keyboard.press("n");
  await page.keyboard.press("c");
  await expect(page).toHaveURL("/");
});

test("skip link targets the main landmark and author filter controls its popup", async ({
  page,
}) => {
  await page.goto("/search?q=Chronicle", { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  const author = page.getByRole("combobox", { name: "Filter by author..." });
  await author.click();
  const popup = page.getByRole("dialog", { name: "Choose an author" });
  await expect(popup).toBeVisible();
  await expect(author).toHaveAttribute(
    "aria-controls",
    (await popup.getAttribute("id"))!,
  );
});

for (const route of [
  "/",
  "/@test_writer/chronicle-testing",
  "/@test_writer",
  "/new",
]) {
  test(`no serious or critical axe violations on ${route}`, async ({
    page,
  }) => {
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveAttribute("id", "main-content");
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        ({ impact }) => impact === "serious" || impact === "critical",
      ),
    ).toEqual([]);
  });
}
