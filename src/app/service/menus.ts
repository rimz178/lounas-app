

export async function insertMenu(
  restaurantId: string,
  menuText: string,
): Promise<boolean> {
  const text = menuText?.trim();
  if (!restaurantId || !text) {
    return false;
  }

  const { data: existing, error: existingError } = await supabaseServer
    .from("menus")
    .select("id, menu_text")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existingError && existing?.menu_text?.trim() === text) {
    return false;
  }

  const { error } = await supabaseServer
    .from("menus")
    .insert({ restaurant_id: restaurantId, menu_text: text });

  if (error) throw new Error(error.message);

  return true;
}
