import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

export async function fetchRenderedHtml(url: string): Promise<string> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle2" });
    const content = await page.content();
    return content;
  } finally {
    await browser.close();
  }
}
