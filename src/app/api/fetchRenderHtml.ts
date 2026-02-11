import { chromium } from "playwright";

export async function fetchRenderedHtml(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 90_000, 
    });

   page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForLoadState("networkidle");
    const text = await page.evaluate(() => {
      return document.body?.innerText ?? "";
    });

    return text;
  } finally {
    await browser.close();
  }
}
