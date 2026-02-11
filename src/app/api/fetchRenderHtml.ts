import { chromium } from "playwright";

const DEFAULT_TIMEOUT_MS = 30_000;
const parseTimeout = (): number => {
  const envValue = process.env.PLAYWRIGHT_TIMEOUT_MS;
  if (!envValue) return DEFAULT_TIMEOUT_MS;

  const parsed = Number(envValue);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }
  return parsed;
};
const TIMEOUT_MS = parseTimeout();

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
