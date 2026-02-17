import { createClient } from "@supabase/supabase-js";

// Supabasen asiakasohjelman konfiguraatio
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Menu {
  [key: string]: unknown;
}

/**
 * Hakee kaikki menut Supabasen `menus`-taulusta.
 * @returns {Promise<Menu[]>} 
 */
export async function fetchMenus(): Promise<Menu[]> {
  try {
    console.log("Fetching menus from Supabase...");
    const { data, error } = await supabase
      .from("menus")
      .select("*");

    if (error) {
      console.error("Error fetching menus:", error.message);
      return [];
    }

    console.log("Fetched menus:", data);
    return data || [];
  } catch (error) {
    console.error("Error fetching menus:", error);
    return [];
  }
}


