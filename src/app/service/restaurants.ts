import { supabase } from "../lib/supabaseClient";

export async function getRestaurants() {
  return supabase.from("ravintolat").select("id, name, osoite"); 
}
