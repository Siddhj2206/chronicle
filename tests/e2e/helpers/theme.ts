import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect } from "@playwright/test";

import type { Locator, Page } from "@playwright/test";

export async function captureThemes(
  page: Page,
  directory: string,
  surface: string,
  focus?: Locator,
): Promise<void> {
  await mkdir(directory, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  if (focus)
    await focus.evaluate((element) =>
      element.scrollIntoView({ block: "center" }),
    );
  else await page.evaluate(() => window.scrollTo(0, 0));
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(page.locator("html")).toHaveClass(
      new RegExp(`\\b${theme}\\b`),
    );
    await page.screenshot({
      path: path.join(directory, `${surface}-${theme}.png`),
      animations: "disabled",
    });
  }
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveClass(/\blight\b/);
}
