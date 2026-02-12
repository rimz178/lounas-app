import OpenAI from "openai";
import { supabase } from "../lib/supabaseClient";
import { insertMenu } from "../service/menus";
import type { RestaurantBrief } from "../service/types";
import { fetchRenderedHtml } from "./fetchRenderHtml";
import { createClient } from "@supabase/supabase-js";

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
  const check = await requireAdmin(req);
  if (!check.ok) {
    return Response.json(
      { ok: false, error: "Forbidden" },
      { status: check.status },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-")) {
    return Response.json(
      { ok: false, error: "OPENAI_API_KEY puuttuu tai on virheellinen" },
      { status: 500 },
    );
  }
  const client = new OpenAI({ apiKey });
  return runRefresh(client);
}

export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) {
    return Response.json(
      { ok: false, error: "Forbidden" },
      { status: check.status },
    );
  }

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
  return runRefresh(client, ids);
}

async function requireAdmin(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase env vars");
    return { ok: false, status: 500 };
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? "",
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser();

  if (userError || !user) return { ok: false, status: 401 };

  const { data: profile, error: profileError } = await supabaseAuth
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return { ok: false, status: 403 };
  }

  return { ok: true };
}
