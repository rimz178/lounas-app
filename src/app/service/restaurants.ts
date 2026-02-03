import { supabase } from "../lib/supabaseClient";

export async function getRestaurants() {
  return supabase.from("ravintolat").select("id, name, osoite");
}


export async function getLatestMenusByRestaurant(restaurantIds: string[]) {
  if (!restaurantIds.length) return {} as Record<string, string>;

  const { data, error } = await supabase
    .from("menus")
    .select("*")
    .in("restaurant_id", restaurantIds)
    .order("created_at", { ascending: false });

  if (error || !Array.isArray(data)) {
    console.warn("Supabase menus error:", error);
    return {};
  }

  const map: Record<string, string> = {};
  for (const row of data as Array<Record<string, unknown>>) {
    const rid =
      typeof row.restaurant_id === "string"
        ? row.restaurant_id
        : typeof row.ravintola_id === "string"
          ? row.ravintola_id
          : null;
    const text =
      typeof row.menu_text === "string"
        ? row.menu_text
        : typeof row.text === "string"
          ? row.text
          : undefined;
    if (!rid || !text) continue;
    if (!(rid in map)) map[rid] = text; 
  }
  return map;
}
