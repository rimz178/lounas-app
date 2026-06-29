import type { BrowserContext } from "playwright";

const DEFAULT_TIMEOUT_MS = 90_000;
const MENU_KEYWORDS = ["lounas", "menu", "viikko", "ruokalista", "lunch"];

export async function fetchRenderedHtml(
  context: BrowserContext,
  url: string,
): Promise<string> {
  const page = await context.newPage();
  page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(DEFAULT_TIMEOUT_MS);

  const apiResponses: string[] = [];

  // Interceptoidaan kaikki XHR/fetch-vastaukset ennen navigointia.
  // Jos ravintolan sivu hakee menun erilliseltä API:lta, se nappautuu tässä.
  page.on("response", async (response) => {
    const contentType = response.headers()["content-type"] ?? "";
    if (!contentType.includes("json") && !contentType.includes("text/plain"))
      return;

    try {
      const body = await response.text();
      const lower = body.toLowerCase();
      const hasMenuContent = MENU_KEYWORDS.some((kw) => lower.includes(kw));
      if (hasMenuContent && body.length < 200_000) {
        apiResponses.push(body);
      }
    } catch {
      // Vastaus saattaa olla jo suljettu, ei kriittistä
    }
  });

  try {
    console.log(`Navigating to: ${url}`);

    await page.goto(url, { waitUntil: "networkidle" }).catch(async () => {
      console.log(`networkidle timed out for ${url}, falling back to load`);
      await page.waitForLoadState("load").catch(() => {});
    });

    // Lisäodotus lazy-load-sisällölle
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

    const allParts = [...chunks];
    if (apiResponses.length > 0) {
      console.log(`Captured ${apiResponses.length} API response(s) for ${url}`);
      allParts.push("=== API-vastaukset ===", ...apiResponses);
    }

    const visibleText = allParts.join("\n\n---\n\n").trim();
    console.log(
      `Fetched visible text for ${url}:`,
      visibleText.substring(0, 500),
    );

    return visibleText;
  } catch (error) {
    console.error(`Error fetching URL ${url}:`, error);
    return "";
  } finally {
    await page.close();
  }
}
