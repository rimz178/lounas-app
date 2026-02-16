export async function getRestaurants() {
  try {
    const response = await fetch(
      "https://clurtxpqwmekgicwusqs.supabase.co/functions/v1/refresh-lunches",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch restaurants:", response.statusText);
      return [];
    }

    const data = await response.json();
    console.log("Raw API response:", data); // Tulostetaan raaka API-vastaus

    return data.data ?? [];
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return [];
  }
}

export async function getLatestMenusByRestaurant(
  ids: string[],
): Promise<Record<string, string>> {
  if (!ids.length) return {};

  try {
    const response = await fetch(
      "https://clurtxpqwmekgicwusqs.supabase.co/functions/v1/refresh-lunches",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: "getLatestMenus",
          ids,
        }),
      }
    );

    if (!response.ok) {
      console.warn("Failed to fetch latest menus:", response.statusText);
      return {};
    }

    const result = await response.json();
    const rows = result.data as Array<{
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
  } catch (error) {
    console.error("Error fetching latest menus:", error);
    return {};
  }
}
