import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js";
import type { RestaurantBrief } from "../../src/app/service/types";

export function hasUrl(r: RestaurantBrief): r is RestaurantBrief & { url: string } {
  return typeof r.url === "string" && r.url.trim().length > 0;
}

export async function runRefresh(
  supabase: SupabaseClient,
  openai: OpenAI,
  idList: string[] = [],
): Promise<{ data: RestaurantBrief[]; error: string | null }> {
  const base = supabase
    .from("ravintolat")
    .select("id, name, url, latitude, longitude") // Lisätään koordinaatit
    .not("url", "is", null)
    .neq("url", "");

  const validIds = idList.filter((id) => validateUuid(id));
  if (idList.length > 0 && validIds.length === 0) {
    return { data: [], error: "No valid UUIDs provided in idList." };
  }

  const { data, error } = validIds.length > 0
    ? await base.in("id", validIds).returns<RestaurantBrief[]>()
    : await base.returns<RestaurantBrief[]>();

  if (error) {
    console.error("Supabase ravintolat error:", error.message);
    return { data: [], error: error.message };
  }

  const cleanedData = (data ?? []).map((restaurant) => ({
    ...restaurant,
    name: restaurant.name.trim(),
  }));

  console.log("Cleaned restaurants from Supabase:", cleanedData);

  return { data: cleanedData, error: null };
}