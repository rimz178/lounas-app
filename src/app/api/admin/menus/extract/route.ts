import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
type AllowedMediaType = (typeof ALLOWED_TYPES)[number];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const systemPrompt = `
You are a tool that extracts lunch menus from Finnish restaurant websites.

Rules:
- Use ONLY the provided content (may include visible page text, JSON API responses, PDF text, photographed/scanned menu images, or a combination of these).
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

async function authorizeAdmin(
  req: NextRequest,
  supabaseUrl: string,
  serviceRoleKey: string,
) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const };
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  if (!anthropicApiKey) {
    return NextResponse.json(
      { error: "Claude API key not configured" },
      { status: 500 },
    );
  }

  const auth = await authorizeAdmin(req, supabaseUrl, serviceRoleKey);
  if ("response" in auth) {
    return auth.response;
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  // biome-ignore lint/suspicious/noExplicitAny: FormData.get() typing broken in this Next.js/Node context
  const file = (formData as any).get("image") as File | null;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Kuva puuttuu" }, { status: 400 });
  }

  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: "Tuetut kuvamuodot: JPEG, PNG, GIF, WebP" },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Kuva on liian suuri (max 5 MB)" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  const today = new Date().toLocaleDateString("fi-FI", {
    weekday: "long",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const client = new Anthropic({ apiKey: anthropicApiKey });

  let menuText: string;
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: file.type as AllowedMediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: `Today is ${today}. Extract the lunch menu from this image.`,
            },
          ],
        },
      ],
    });

    const block = message.content[0];
    menuText = block.type === "text" ? block.text : "No lunch menu found.";
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json(
      { error: "Kuvan lukeminen epäonnistui" },
      { status: 500 },
    );
  }

  return NextResponse.json({ menuText });
}
