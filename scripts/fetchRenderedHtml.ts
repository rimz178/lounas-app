import { chromium } from "playwright";

export async function fetchRenderedHtml(url: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }); 
    const text = await page.evaluate(() => document.body.innerText);
    return text;
  } catch (error) {
    console.error(`Error fetching URL ${url}:`, error);
    throw error; 
  } finally {
    await browser.close();
  }
}