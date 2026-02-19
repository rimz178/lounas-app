import { chromium } from "playwright";

export async function fetchRenderedHtml(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });

    try {
      await page.waitForLoadState("networkidle", { timeout: 10_000 });
    } catch {
      console.warn("networkidle timeout (first) for", url);
    }

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    try {
      await page.waitForLoadState("networkidle", { timeout: 10_000 });
    } catch {
      console.warn("networkidle timeout (second) for", url);
    }

    const text = await page.evaluate(() => document.body?.innerText ?? "");
    return text;
  } finally {
    await browser.close();
  }
}
