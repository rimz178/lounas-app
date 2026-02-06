import { supabase } from "../lib/supabaseClient";
import type { RestaurantBrief } from "./types";

export async function getRestaurants() {
  // Jos haluat tyypit suoraan, rajaa valinnat yhteiseen tyyppiin
  return supabase
    .from("ravintolat")
    .select("id, name, url")
    .returns<RestaurantBrief[]>();
}

export async function getLatestMenusByRestaurant(
  ids: string[],
): Promise<Record<string, string>> {
  if (!ids.length) return {};

  const { data, error } = await supabase
    .from("menus")
    .select("restaurant_id, menu_text, created_at")
    .in("restaurant_id", ids)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Supabase menus error:", error.message);
    return {};
  }

  const rows = (data ?? []) as Array<{
    restaurant_id: string | null;
    menu_text: string | null;
    created_at: string | null;
  }>;
  const map: Record<string, string> = {};
  for (const id of ids) {
    const row = rows.find((r) => r.restaurant_id === id);
    const text = row?.menu_text?.trim();
    if (text) map[id] = text;
  }
  return map;
}
