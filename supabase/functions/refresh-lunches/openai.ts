import type OpenAI from "openai";

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

export async function extractMenu(
  client: OpenAI,
  name: string,
  url: string,
  html: string
): Promise<string> {
  const completion = await client.chat.completions.create({
    model: "gpt-4",
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Ravintola: ${name}\nURL: ${url}\n\nHTML:\n"""${html}"""`,
      },
    ],
  });

  const response = completion.choices?.[0]?.message?.content ?? "No lunch menu found.";
  console.log(`OpenAI response for ${name}:`, response);

  return response;
}
