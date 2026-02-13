import { chromium } from "playwright";
import { LRUCache } from "lru-cache";

const htmlCache = new LRUCache<string, string>({
  max: 100,
  ttl: 1000 * 60 * 10,
});

export async function fetchRenderedHtml(url: string): Promise<string> {
  const cached = htmlCache.get(url);
  if (cached !== undefined) {
    return cached;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });

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
    htmlCache.set(url, text);
    return text;
  } finally {
    await browser.close();
  }
}
