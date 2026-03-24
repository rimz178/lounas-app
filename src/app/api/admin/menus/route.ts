import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type AuthorizedSupabaseContext = {
  supabase: SupabaseClient;
};

type SavedMenuRow = {
  id: string;
  restaurant_id: string;
  menu_text: string;
};

async function authorizeAdmin(
  req: NextRequest,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<
  | { response: NextResponse; context?: never }
  | { response?: never; context: AuthorizedSupabaseContext }
> {
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

  return { context: { supabase } };
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  const auth = await authorizeAdmin(req, supabaseUrl, serviceRoleKey);
  if ("response" in auth) {
    return auth.response;
  }

  const { supabase } = auth.context;

  let payload: {
    restaurantId?: unknown;
    menuText?: unknown;
  };

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const restaurantId =
    typeof payload.restaurantId === "string" ? payload.restaurantId.trim() : "";
  const menuText =
    typeof payload.menuText === "string" ? payload.menuText.trim() : "";

  if (!restaurantId) {
    return NextResponse.json(
      { error: "Ravintolaa ei valittu" },
      { status: 400 },
    );
  }

  if (!menuText) {
    return NextResponse.json(
      { error: "Ruokalista puuttuu" },
      { status: 400 },
    );
  }

  const { data: existingRestaurant, error: existingRestaurantError } =
    await supabase
      .from("ravintolat")
      .select("id")
      .eq("id", restaurantId)
      .maybeSingle();

  if (existingRestaurantError) {
    return NextResponse.json(
      { error: "Ravintolan haku epäonnistui" },
      { status: 500 },
    );
  }

  if (!existingRestaurant) {
    return NextResponse.json(
      { error: "Ravintolaa ei löytynyt" },
      { status: 404 },
    );
  }

  const { data: savedMenu, error: menuError } = await supabase
    .from("menus")
    .upsert(
      { restaurant_id: restaurantId, menu_text: menuText },
      { onConflict: "restaurant_id" },
    )
    .select("id, restaurant_id, menu_text")
    .single();

  if (menuError || !savedMenu) {
    return NextResponse.json(
      { error: "Ruokalistan tallennus epäonnistui" },
      { status: 500 },
    );
  }

  const { error: updateModeError } = await supabase
    .from("ravintolat")
    .update({ menu_mode: "manual" })
    .eq("id", restaurantId);

  if (updateModeError) {
    return NextResponse.json(
      { error: "Ravintolan päivitystilan asetus epäonnistui" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { menu: savedMenu as SavedMenuRow },
    { status: 200 },
  );
}
