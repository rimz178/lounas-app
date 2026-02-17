import { createClient } from "@supabase/supabase-js";
import type { Restaurant } from "./types";

// Supabasen konfiguraatio
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

// Luo Supabase-asiakas
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Hakee kaikki ravintolat Supabasesta.
 */
export async function getRestaurants(): Promise<Restaurant[]> {
  try {
    const { data, error } = await supabase
      .from("ravintolat")
      .select("id, name, lat, lng, url");

    if (error) {
      console.error("Error fetching restaurants:", error.message);
      return [];
    }

    return data ?? [];
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return [];
  }
}

/**
 * Hakee lounaslistat ravintoloille Supabasesta.
 */
export async function getLatestMenusByRestaurant(
  ids: string[],
): Promise<Record<string, string>> {
  if (!ids.length) return {};

  try {
    // Hae lounaslistat suoraan Supabasesta
    const { data, error } = await supabase
      .from("menus")
      .select("restaurant_id, menu_text")
      .in("restaurant_id", ids);

    if (error) {
      console.error("Error fetching latest menus:", error.message);
      return {};
    }

    // Muodosta ravintola-ID:n ja lounaslistan välinen map
    const map: Record<string, string> = {};
    data?.forEach((row) => {
      if (row.restaurant_id && row.menu_text) {
        map[row.restaurant_id] = row.menu_text.trim();
      }
    });

    return map;
  } catch (error) {
    console.error("Error fetching latest menus:", error);
    return {};
  }
}
