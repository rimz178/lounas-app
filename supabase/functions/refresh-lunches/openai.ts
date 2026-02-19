import type OpenAI from "openai";

const systemPrompt = `
You extract lunch menus from Finnish restaurant websites.

Rules:
- Use ONLY the provided HTML content.
- Do NOT invent dishes or days.
- Ignore opening hours, addresses, prices, allergens, marketing text and footers.
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
  html: string,
): Promise<string> {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Ravintola: ${name}\nURL: ${url}\n\nHTML:\n"""${html}"""`,
      },
    ],
  });
  return completion.choices?.[0]?.message?.content ?? "";
}
