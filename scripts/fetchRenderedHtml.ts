import { chromium } from "playwright";

const DEFAULT_TIMEOUT_MS = 90_000;

export async function fetchRenderedHtml(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  await context.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (type === "image" || type === "font" || type === "media") {
      return route.abort();
    }
    return route.continue();
  });

  const page = await context.newPage();
  page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(DEFAULT_TIMEOUT_MS);

  try {
    console.log(`Navigating to: ${url}`);


    await page.goto(url, { waitUntil: "domcontentloaded" });

    
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {

    });

 
    await page
      .waitForFunction(
        () => (document.body?.innerText?.trim().length ?? 0) > 300,
        undefined,
        { timeout: 30_000 },
      )
      .catch(() => {

      });
    const chunks: string[] = [];
    for (const frame of page.frames()) {
      const t = await frame
        .evaluate(() => document.body?.innerText ?? "")
        .catch(() => "");
      if (t.trim()) chunks.push(t.trim());
    }

    const visibleText = chunks.join("\n\n---\n\n").trim();
    console.log(
      `Fetched visible text for ${url}:`,
      visibleText.substring(0, 500),
    );

    return visibleText;
  } catch (error) {
    console.error(`Error fetching URL ${url}:`, error);
    throw error;
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}