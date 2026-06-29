import { PDFParse } from "pdf-parse";
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
  const pdfTexts: string[] = [];

  page.on("response", async (response) => {
    const contentType = response.headers()["content-type"] ?? "";

    // PDF ladattu automaattisesti (esim. iframe tai suora osoite)
    if (contentType.includes("application/pdf")) {
      try {
        const buffer = await response.body();
        const result = await new PDFParse({ data: buffer }).getText();
        if (result.text.trim()) {
          console.log(`Intercepted PDF from: ${response.url()}`);
          pdfTexts.push(result.text);
        }
      } catch {
        // PDF-parsinta epäonnistui, ei kriittistä
      }
      return;
    }

    // JSON/text API-vastaukset
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
      // Vastaus saattaa olla jo suljettu
    }
  });

  try {
    console.log(`Navigating to: ${url}`);

    await page.goto(url, { waitUntil: "networkidle" }).catch(async () => {
      console.log(`networkidle timed out for ${url}, falling back to load`);
      await page.waitForLoadState("load").catch(() => {});
    });

    await page.waitForTimeout(2000);

    // Haetaan kaikki PDF-linkit sivulta ja ladataan ne erikseen
    const pdfLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a[href]"))
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href) => href.toLowerCase().includes(".pdf")),
    );

    for (const pdfUrl of pdfLinks) {
      try {
        const res = await fetch(pdfUrl);
        if (!res.ok) continue;
        const buffer = Buffer.from(await res.arrayBuffer());
        const result = await new PDFParse({ data: buffer }).getText();
        if (result.text.trim()) {
          console.log(`Extracted PDF from link: ${pdfUrl}`);
          pdfTexts.push(result.text);
        }
      } catch {
        // PDF-lataus tai -parsinta epäonnistui
      }
    }

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
    if (pdfTexts.length > 0) {
      console.log(`Extracted ${pdfTexts.length} PDF(s) for ${url}`);
      allParts.push("=== PDF-menut ===", ...pdfTexts);
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
