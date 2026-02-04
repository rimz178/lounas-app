import OpenAI from "openai";
import { supabase } from "../lib/supabaseClient";
import { insertMenu } from "../service/menus";
import type { RestaurantBrief } from "../service/types";

type ResultEntry = {
  id: string;
  name: string;
  url: string;
  menu?: string;
  error?: string;
};

const systemPrompt =
  "Poimit suomalaisista ravintolasivuista lounaslistat. Tulosta selkeä teksti, ryhmittele viikonpäivittäin (Ma–Su).";

function hasUrl(r: RestaurantBrief): r is RestaurantBrief & { url: string } {
  return typeof r.url === "string" && r.url.trim().length > 0;
}

async function fetchTruncatedHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "lounas-app/1.0",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });
  return (await res.text()).slice(0, 40_000);
}

async function extractMenu(
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

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "unknown error";
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-")) {
    return Response.json(
      { ok: false, error: "OPENAI_API_KEY puuttuu tai on virheellinen" },
      { status: 500 },
    );
  }
  const client = new OpenAI({ apiKey });

  const payload = await req
    .json()
    .catch(() => ({}) as { restaurantIds?: string[] });
  const ids = Array.isArray(payload.restaurantIds)
    ? payload.restaurantIds
    : undefined;

  const query = supabase
    .from("ravintolat")
    .select("id, name, url")
    .not("url", "is", null)
    .neq("url", "");
  const { data, error } = ids
    ? await query.in("id", ids).returns<RestaurantBrief[]>()
    : await query.returns<RestaurantBrief[]>();

  if (error)
    return Response.json(
      { ok: false, error: `Supabase: ${error.message}` },
      { status: 500 },
    );

  const withUrl = (data ?? []).filter(hasUrl);

  const entries = await Promise.all(
    withUrl.map(async (r): Promise<ResultEntry> => {
      try {
        const html = await fetchTruncatedHtml(r.url);
        const menu = await extractMenu(client, r.name, r.url, html);
        await insertMenu(r.id, menu);
        return { id: r.id, name: r.name, url: r.url, menu };
      } catch (e: unknown) {
        return { id: r.id, name: r.name, url: r.url, error: errMsg(e) };
      }
    }),
  );

  return Response.json({ ok: true, results: entries });
}
