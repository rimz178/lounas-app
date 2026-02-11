import { chromium } from "playwright";

const DEFAULT_TIMEOUT_MS = 30_000;
const TIMEOUT_MS = process.env.PLAYWRIGHT_TIMEOUT_MS
  ? Number.parseInt(process.env.PLAYWRIGHT_TIMEOUT_MS, 10)
  : DEFAULT_TIMEOUT_MS;

export async function fetchRenderedHtml(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: TIMEOUT_MS,
    });

    await page.waitForTimeout(4000);

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await page.waitForTimeout(2000);

    const text = await page.evaluate(() => {
      return document.body?.innerText ?? "";
    });

    return text;
  } finally {
    await browser.close();
  }
}
