import { supabase } from "../lib/supabaseClient";

export async function getRestaurants() {
  return supabase.from("ravintolat").select("id, name, osoite");
}

type MenuRow = {
  restaurant_id?: string | null;
  ravintola_id?: string | null; 
  menu_text?: string | null;
  text?: string | null; 
  created_at?: string | null;
};

export async function getLatestMenusByRestaurant(restaurantIds: string[]) {
  if (!restaurantIds.length) return {} as Record<string, string>;

  const { data, error } = await supabase
    .from("menus")
    .select("restaurant_id, ravintola_id, menu_text, text, created_at")
    .in("restaurant_id", restaurantIds)
    .order("created_at", { ascending: false })
    .returns<MenuRow[]>();

  if (error) {
    console.warn("Supabase menus error:", error);
    return {};
  }

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    const rid = row.restaurant_id ?? row.ravintola_id ?? null;
    const text = row.menu_text ?? row.text ?? null;
    if (!rid || !text) continue;
    if (!(rid in map)) map[rid] = text; 
  }
  return map;
}
