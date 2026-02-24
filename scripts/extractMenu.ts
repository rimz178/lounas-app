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
- If the menu is in a table, extract the table content.
- If the menu is in a list, extract the list content.
- If the menu is in a paragraph, extract the text that mentions lunch items.
- Ignore opening hours, addresses, prices, allergens, marketing text, and footers.
- If no lunch menu is found, respond exactly: "No lunch menu found."

Output format example:

Ma:
- Lohikeitto
- Kasvislasagne

Ti:
- Broileripasta
- Vegaaninen curry

Language:
- Finnish
`;

export async function extractMenu(text: string) {
  const MAX_TOKENS = 8000; 
  const truncatedText = text.slice(0, MAX_TOKENS);

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `HTML content:\n\n${truncatedText}` },
    ],
  });

  const response = completion.choices?.[0]?.message?.content ?? "No lunch menu found.";
  console.log("OpenAI response:", response);
  return response;
}