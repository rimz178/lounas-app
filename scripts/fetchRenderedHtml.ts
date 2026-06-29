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

    await page.goto(url, { waitUntil: "networkidle" }).catch(async () => {
      console.log(`networkidle timed out for ${url}, falling back to load`);
      await page.waitForLoadState("load").catch(() => {});
    });

    // Odotetaan hetki, että JavaScript-renderöity sisältö ehtii latautua
    await page.waitForTimeout(2000);

    const chunks: string[] = [];
    for (const frame of page.frames()) {
      const text = await frame
        .evaluate(
          () => document.body?.innerText || document.body?.textContent || "",
        )
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
