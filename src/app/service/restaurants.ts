import { supabase } from "../lib/supabaseClient";

export async function getRestaurants() {
  return supabase.from("Ravintolat").select("*");
}
