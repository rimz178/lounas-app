import type { BrowserContext } from "playwright";

const DEFAULT_TIMEOUT_MS = 90_000;

export async function fetchRenderedHtml(
  context: BrowserContext,
  url: string,
): Promise<string> {
  const page = await context.newPage();
  page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(DEFAULT_TIMEOUT_MS);

  try {
    console.log(`Navigating to: ${url}`);

    await page.goto(url, { waitUntil: "domcontentloaded" });

    await page.waitForSelector("div.lunch-block, .menu-item, .lounas-lista", { timeout: 15_000 }).catch(() => {
        console.log("Did not find a specific menu element, continuing with what we have.");
    });
    
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {
      console.log(`networkidle timeout for ${url}, continuing...`);
    });

    const chunks: string[] = [];
    for (const frame of page.frames()) {
      const text = await frame
        .evaluate(() => document.body?.innerText || document.body?.textContent || "")
        .catch(() => "");
      if (text.trim()) chunks.push(text.trim());
    }

    const visibleText = chunks.join("\n\n---\n\n").trim();
    console.log(
      `Fetched visible text for ${url}:`,
      visibleText.substring(0, 500),
    );

    return visibleText;
  } catch (error) {
    console.error(`Error fetching URL ${url}:`, error);
    return ""; // Palauta tyhjä merkkijono virhetilanteessa
  } finally {
    await page.close(); // Suljetaan vain sivu, ei koko selainta
  }
}