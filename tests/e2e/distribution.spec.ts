import { expect, test } from "@playwright/test";

test("feeds are XML, article discovery metadata is absolute and the social image is PNG", async ({
  page,
  request,
}) => {
  const site = new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ).origin;
  for (const path of ["/feed.xml", "/@test_writer/feed.xml"]) {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("application/rss+xml");
    const xml = await response.text();
    const parsed = await page.evaluate((xml) => {
      const document = new DOMParser().parseFromString(xml, "application/xml");
      return {
        error: !!document.querySelector("parsererror"),
        titles: Array.from(
          document.querySelectorAll("item > title"),
          (node) => node.textContent,
        ),
      };
    }, xml);
    expect(parsed.error).toBe(false);
    expect(parsed.titles).toContain("Chronicle Testing Journal");
    expect(parsed.titles).not.toContain("Unfinished Notes");
  }
  await page.goto("/@test_writer/chronicle-testing");
  const canonical = `${site}/@test_writer/chronicle-testing`;
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    canonical,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    canonical,
  );
  const image = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(image).toBe(`${canonical}/og`);
  const response = await request.get(image!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
  const jsonLd = JSON.parse(
    await page.locator('script[type="application/ld+json"]').innerText(),
  );
  expect(jsonLd).toMatchObject({
    "@type": "Article",
    headline: "Chronicle Testing Journal",
    image,
    author: { name: "Test Writer" },
    datePublished: expect.any(String),
    dateModified: expect.any(String),
  });
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(
    page.locator('link[rel="alternate"][type="application/rss+xml"]'),
  ).toHaveAttribute("href", `${site}/feed.xml`);
  await page.goto("/@test_writer");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${site}/@test_writer`,
  );
  await expect(
    page.locator('link[rel="alternate"][type="application/rss+xml"]'),
  ).toHaveCount(2);
  expect(
    (await request.get("/@test_writer/unfinished-notes/og")).status(),
  ).toBe(404);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).not.toContain("unfinished-notes");
  expect(await (await request.get("/robots.txt")).text()).toContain(
    `Sitemap: ${site}/sitemap.xml`,
  );
});
