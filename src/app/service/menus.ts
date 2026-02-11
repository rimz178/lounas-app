import { supabaseServer } from "../lib/supabaseServerClient";

export async function insertMenu(
  restaurantId: string,
  menuText: string
): Promise<boolean> {
  const text = menuText?.trim();
  if (!restaurantId || !text) {
    return false;
  }

  const { error } = await supabaseServer
    .from("menus")
    .insert({ restaurant_id: restaurantId, menu_text: text });

  if (error) throw new Error(error.message);

  return true;
}
