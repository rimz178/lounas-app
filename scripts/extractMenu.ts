import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error("ANTHROPIC_API_KEY environment variable is not set");
}

const client = new Anthropic({ apiKey });

const systemPrompt = `
You are a tool that extracts lunch menus from Finnish restaurant websites.

Rules:
- Use ONLY the provided content (may include visible page text, JSON API responses, PDF text, or a combination of these).
- Look for keywords like "lounas", "menu", "lounaslista", or "lounasmenu".
- Extract only the lunch menu items and their corresponding days.
- Structure the output by day of the week (Maanantai, Tiistai, etc.) or as a weekly list.
- If a menu lists items for the whole week (e.g., "Ma-Pe" or "Koko viikon"), list all those dishes under a single "Ma-Pe" heading. Do NOT distribute them to individual days.
- If the menu has specific dishes for specific days (e.g., a "Maanantai" section), list them under that day.
- Ignore everything else, such as opening hours, prices, allergens, marketing text, and footers.
- If no lunch menu is found at all, respond exactly: "No lunch menu found."

Output format example for a weekly menu:

Ma-Pe:
- Karjalanpaisti
- Paahdettua lohta
- Spicy chicken

Output format example for daily menus:

Maanantai:
- Lohikeitto

Torstai:
- Hernekeitto ja pannukakku

Language:
- Finnish
`;

// Fallback kun pdf-parse ei löydä tekstikerrosta (esim. skannattu/kuvattu lounaslista).
// Claude lukee PDF-sivut myös kuvina, joten tämä toimii ilman erillistä OCR:ää.
export async function readPdfWithClaude(buffer: Buffer): Promise<string> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: buffer.toString("base64"),
            },
          },
          {
            type: "text",
            text: "Transcribe all visible text from this PDF, focusing especially on any lunch menu content (dish names, days of the week). Output the raw text only, no commentary.",
          },
        ],
      },
    ],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "";
}

export async function extractMenu(text: string) {
  const MAX_CHARS = 20000;
  const truncatedText = text.slice(0, MAX_CHARS);

  const today = new Date().toLocaleDateString("fi-FI", {
    weekday: "long",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Today is ${today}. Extract the menu based on the following content:\n\n${truncatedText}`,
      },
    ],
  });

  const block = message.content[0];
  const response = block.type === "text" ? block.text : "No lunch menu found.";
  console.log("Claude response:", response);
  return response;
}
