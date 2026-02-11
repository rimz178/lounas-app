import OpenAI from "openai";
import { supabaseServer as supabase } from "../lib/supabaseClient";
import { insertMenu } from "../service/menus";
import type { RestaurantBrief } from "../service/types";
import { fetchRenderedHtml } from "./fetchRenderHtml";

type ResultEntry = {
  id: string;
  name: string;
  url: string;
  menu?: string;
  error?: string;
};

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

function hasUrl(r: RestaurantBrief): r is RestaurantBrief & { url: string } {
  return typeof r.url === "string" && r.url.trim().length > 0;
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

function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const tokenParam = new URL(req.url).searchParams.get("token");
  const token = bearer ?? tokenParam;
  return !!token && token === process.env.MENU_REFRESH_TOKEN;
}

async function runRefresh(client: OpenAI, ids?: string[]) {
  const base = supabase
    .from("ravintolat")
    .select("id, name, url")
    .not("url", "is", null)
    .neq("url", "");
  const { data, error } = ids
    ? await base.in("id", ids).returns<RestaurantBrief[]>()
    : await base.returns<RestaurantBrief[]>();

  if (error) {
    console.error("Supabase ravintolat error:", error.message);
    return Response.json(
      { ok: false, error: `Supabase: ${error.message}` },
      { status: 500 },
    );
  }

  const withUrl = (data ?? []).filter(hasUrl);
  console.log(
    "Ravintolat haettu:",
    withUrl.map((r) => r.name),
  );

  const entries: ResultEntry[] = [];

  for (const r of withUrl) {
    try {
      let html = await fetchRenderedHtml(r.url);

      if (html.length > 30000) {
        html = html.slice(0, 30000);
      }

      const menu = await extractMenu(client, r.name, r.url, html);
      await insertMenu(r.id, menu);

      entries.push({ id: r.id, name: r.name, url: r.url, menu });
    } catch (e: unknown) {
      entries.push({
        id: r.id,
        name: r.name,
        url: r.url,
        error: e instanceof Error ? e.message : "unknown error",
      });
    }
  }

  console.log("Kaikki tulokset:", entries);
  return Response.json({ ok: true, results: entries });
}

export async function GET(req: Request) {
  if (!isAuthorized(req))
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ok: false, error: "OPENAI_API_KEY puuttuu tai on virheellinen" },
      { status: 500 },
    );
  }
  const client = new OpenAI({ apiKey });
  return runRefresh(client);
}

export async function POST(req: Request) {
  if (!isAuthorized(req))
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ok: false, error: "OPENAI_API_KEY puuttuu tai on virheellinen" },
      { status: 500 },
    );
  }
  const client = new OpenAI({ apiKey });

  const payload = await req
    .json()
    .catch(() => ({}) as { restaurantIds?: unknown });

  let ids: string[] | undefined;

  if (Array.isArray(payload.restaurantIds)) {
    const rawIds = payload.restaurantIds;

    if (rawIds.length > 100) {
      return Response.json(
        { ok: false, error: "Too many restaurantIds provided (max 100)." },
        { status: 400 },
      );
    }

    const normalizedIds = rawIds
      .filter((id) => typeof id === "string")
      .map((id) => (id as string).trim())
      .filter((id) => id.length > 0);

    // If there were invalid types in the array, reject the request.
    if (normalizedIds.length !== rawIds.length) {
      return Response.json(
        {
          ok: false,
          error: "restaurantIds must be an array of non-empty strings.",
        },
        { status: 400 },
      );
    }

    ids = normalizedIds;
  } else {
    ids = undefined;
  }
  return runRefresh(client, ids);
}
