import { PDFParse } from "pdf-parse";
import type { BrowserContext } from "playwright";
import { readPdfWithClaude, type ImageInput } from "./extractMenu";

const DEFAULT_TIMEOUT_MS = 90_000;
const MENU_KEYWORDS = ["lounas", "menu", "viikko", "ruokalista", "lunch"];
const SKIP_IMAGE_PATTERN = /logo|icon|avatar|sprite|divider|placeholder|badge/i;
const MAX_IMAGES = 8;

export interface FetchResult {
  text: string;
  images: ImageInput[];
}

function toMediaType(contentType: string): ImageInput["mediaType"] | null {
  const ct = contentType.split(";")[0].trim().toLowerCase();
  if (ct === "image/jpeg" || ct === "image/png" || ct === "image/gif" || ct === "image/webp") {
    return ct;
  }
  return null;
}

// Jäsentää PDF-puskurin: kokeillaan ensin pdf-parsea, ja jos tekstikerrosta ei löydy
// (esim. skannattu/kuvattu lounaslista), pyydetään Claudea lukemaan PDF suoraan.
async function parsePdfBuffer(
  buffer: Buffer,
  sourceUrl: string,
): Promise<string> {
  try {
    const result = await new PDFParse({ data: buffer }).getText();
    let text = result.text.trim();
    if (!text) {
      console.log(`No text layer in PDF, trying Claude vision: ${sourceUrl}`);
      text = (await readPdfWithClaude(buffer)).trim();
    }
    return text;
  } catch (err) {
    console.error(`PDF parse error for ${sourceUrl}:`, err);
    return "";
  }
}

export async function fetchRenderedHtml(
  context: BrowserContext,
  url: string,
): Promise<FetchResult> {
  const page = await context.newPage();
  page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(DEFAULT_TIMEOUT_MS);

  const apiResponses: string[] = [];
  const pdfTexts: string[] = [];

  page.on("response", async (response) => {
    const contentType = response.headers()["content-type"] ?? "";

    // PDF ladattu automaattisesti (esim. iframe tai suora osoite)
    if (contentType.includes("application/pdf")) {
      const buffer = await response.body().catch(() => null);
      if (buffer) {
        const text = await parsePdfBuffer(buffer, response.url());
        if (text) {
          console.log(`Intercepted PDF from: ${response.url()}`);
          pdfTexts.push(text);
        }
      }
      return;
    }

    // JSON, plain text, tai AJAX-haettu HTML (esim. ulkoinen menupalvelu)
    const isMenuData =
      contentType.includes("json") || contentType.includes("text/plain");
    const isAjaxHtml =
      contentType.includes("text/html") &&
      ["xhr", "fetch"].includes(response.request().resourceType());
    if (!isMenuData && !isAjaxHtml) return;

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

    // Scrollataan sivua alas, jotta lazy-loadattu sisältö latautuu
    await page
      .evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
      .catch(() => {});
    await page.waitForTimeout(800);
    await page
      .evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      .catch(() => {});
    await page.waitForTimeout(1200);

    // Haetaan sivulta kaikki mahdolliset PDF-lähteet: suorat linkit sekä
    // iframe/embed/object-elementit (upotetut PDF-katselimet eivät aina
    // näytä ".pdf":ää URL:ssa)
    const candidateUrls = await page
      .evaluate(() => {
        const hrefs = Array.from(document.querySelectorAll("a[href]")).map(
          (a) => (a as HTMLAnchorElement).href,
        );
        const iframeSrcs = Array.from(
          document.querySelectorAll("iframe[src]"),
        ).map((el) => (el as HTMLIFrameElement).src);
        const embedSrcs = Array.from(
          document.querySelectorAll("embed[src]"),
        ).map((el) => (el as HTMLEmbedElement).src);
        const objectData = Array.from(
          document.querySelectorAll("object[data]"),
        ).map((el) => (el as HTMLObjectElement).data);
        return [...hrefs, ...iframeSrcs, ...embedSrcs, ...objectData];
      })
      .catch(() => [] as string[]);

    // Varmat PDF-osoitteet (".pdf" näkyy URL:ssa) ladataan suoraan.
    const pdfLinks = [
      ...new Set(candidateUrls.filter((h) => h.toLowerCase().includes(".pdf"))),
    ];
    // Muut upotetut lähteet: tarkistetaan content-type ennen jäsentämistä,
    // koska esim. Google Docs -katselin tms. ei näytä ".pdf":ää URL:ssa.
    const uncheckedUrls = [
      ...new Set(
        candidateUrls.filter(
          (h) => !h.toLowerCase().includes(".pdf") && h.startsWith("http"),
        ),
      ),
    ];

    if (pdfLinks.length > 0) {
      console.log(`Found ${pdfLinks.length} PDF link(s) on ${url}:`, pdfLinks);
    }
    for (const pdfUrl of pdfLinks) {
      try {
        const res = await context.request.get(pdfUrl);
        if (!res.ok()) {
          console.log(`PDF fetch failed (${res.status()}): ${pdfUrl}`);
          continue;
        }
        const text = await parsePdfBuffer(await res.body(), pdfUrl);
        if (text) {
          console.log(`Extracted PDF from link: ${pdfUrl}`);
          pdfTexts.push(text);
        }
      } catch (err) {
        console.error(`PDF fetch/parse error for ${pdfUrl}:`, err);
      }
    }

    for (const embeddedUrl of uncheckedUrls) {
      try {
        const res = await context.request.get(embeddedUrl);
        const ct = res.headers()["content-type"] ?? "";
        if (!res.ok() || !ct.includes("application/pdf")) continue;
        console.log(`Found embedded PDF (via content-type): ${embeddedUrl}`);
        const text = await parsePdfBuffer(await res.body(), embeddedUrl);
        if (text) pdfTexts.push(text);
      } catch {
        // Ei PDF tai haku epäonnistui - ohitetaan hiljaa
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

    // Kerätään sivulta valokuvatut/kuvana upotetut menut (esim. WP-postaukset,
    // Facebook-syöte-widgetit) — nämä eivät ole PDF- tai tekstisisältöä.
    const images: ImageInput[] = [];
    const imgCandidates = await page
      .evaluate(() =>
        Array.from(document.querySelectorAll("img[src]")).map((img) => {
          const el = img as HTMLImageElement;
          return {
            src: el.currentSrc || el.src,
            width: el.naturalWidth || el.width || 0,
            height: el.naturalHeight || el.height || 0,
          };
        }),
      )
      .catch(() => [] as { src: string; width: number; height: number }[]);

    const imageTargets = imgCandidates
      .filter((i) => i.src.startsWith("http") && i.width * i.height >= 40_000)
      .filter((i) => !SKIP_IMAGE_PATTERN.test(i.src))
      .sort((a, b) => b.width * b.height - a.width * a.height)
      .slice(0, MAX_IMAGES);

    for (const target of imageTargets) {
      try {
        const res = await context.request.get(target.src);
        if (!res.ok()) continue;
        const mediaType = toMediaType(res.headers()["content-type"] ?? "");
        if (!mediaType) continue;
        const buffer = await res.body();
        if (buffer.byteLength > 5 * 1024 * 1024) continue;
        images.push({ data: buffer.toString("base64"), mediaType });
      } catch {
        // Kuvan haku epäonnistui - ohitetaan hiljaa
      }
    }
    if (images.length > 0) {
      console.log(`Collected ${images.length} candidate image(s) for ${url}`);
    }

    return { text: visibleText, images };
  } catch (error) {
    console.error(`Error fetching URL ${url}:`, error);
    return { text: "", images: [] };
  } finally {
    await page.close();
  }
}
