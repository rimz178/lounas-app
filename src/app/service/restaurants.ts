import { supabase } from "../lib/supabaseClient";

export async function getRestaurants() {
  return supabase.from("ravintolat").select("id, name, osoite");
}

type MenuRow = {
  restaurant_id?: string | null;
  ravintola_id?: string | null;
  menu_text?: string | null;
  created_at?: string | null;
};

export async function getLatestMenusByRestaurant(
  ids: string[],
): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const { data: a } = await supabase
    .from("menus")
    .select("restaurant_id, menu_text, created_at")
    .in("restaurant_id", ids)
    .order("created_at", { ascending: false })
    .returns<MenuRow[]>();
  const { data: b } = await supabase
    .from("menus")
    .select("ravintola_id, menu_text, created_at")
    .in("ravintola_id", ids)
    .order("created_at", { ascending: false })
    .returns<MenuRow[]>();
  const rows = [...(a ?? []), ...(b ?? [])];
  const map: Record<string, string> = {};
  for (const id of ids) {
    const row = rows.find(
      (r) => r.restaurant_id === id || r.ravintola_id === id,
    );
    const text = row?.menu_text?.trim();
    if (text) map[id] = text;
  }
  return map;
}
