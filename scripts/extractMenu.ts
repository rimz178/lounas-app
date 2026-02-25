import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });;
import { OpenAI } from "openai";

const apiKey = process.env.OPENAI_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
}

const openai = new OpenAI({
  apiKey: apiKey,
});

const systemPrompt = `
You are a tool that extracts lunch menus from Finnish restaurant websites.

Rules:
- Use ONLY the provided HTML content.
- Look for keywords like "lounas", "menu", "lounaslista", or "lounasmenu".
- Extract only the lunch menu items and their corresponding days.
- Structure the output by day of the week (Maanantai, Tiistai, Keskiviikko, Torstai, Perjantai). Use the Finnish day names or their abbreviations (Ma, Ti, Ke, To, Pe) as headings.
- If a menu lists items for the whole week (e.g., "Ma-Pe" or "Koko viikon") without specifying daily dishes, distribute the first 5 main dishes to Monday-Friday, one dish per day. If there are fewer than 5, leave the remaining days empty.
- Ignore everything else, such as opening hours, prices, allergens, marketing text, and footers.
- If no lunch menu is found for a specific day, state that.
- If no lunch menu is found at all, respond exactly: "No lunch menu found."

Output format example:

Maanantai:
- Lohikeitto
- Kasvislasagne

Tiistai:
- Broileripasta
- Vegaaninen curry

Keskiviikko:
- Lihapullat ja muusi

Torstai:
- Hernekeitto ja pannukakku

Perjantai:
- Uunilohi ja perunat

Language:
- Finnish
`;

export async function extractMenu(text: string) {
  const MAX_TOKENS = 8000; 
  const truncatedText = text.slice(0, MAX_TOKENS);

  const today = new Date().toLocaleDateString("fi-FI", {
    weekday: 'long',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Today is ${today}. Extract the menu based on the following content:\n\n${truncatedText}` },
    ],
  });

  const response = completion.choices?.[0]?.message?.content ?? "No lunch menu found.";
  console.log("OpenAI response:", response);
  return response;
}