import { supabase } from "../lib/supabaseClient";

type ReviewRow = {
  restaurant_id: string | null;
  rating: number | null;
};

export async function getReviewStatsByRestaurant(
  ids: string[],
): Promise<Record<string, { average: number; count: number }>> {
  if (!ids.length) return {};

  const { data, error } = await supabase
    .from("reviews")
    .select("restaurant_id, rating")
    .in("restaurant_id", ids);

  if (error || !data) {
    console.warn("reviews error:", error?.message);
    return {};
  }

  const sums: Record<string, { sum: number; count: number }> = {};
  for (const row of data as ReviewRow[]) {
    if (!row.restaurant_id || row.rating == null) continue;
    const key = row.restaurant_id;
    if (!sums[key]) sums[key] = { sum: 0, count: 0 };
    sums[key].sum += row.rating;
    sums[key].count += 1;
  }

  const result: Record<string, { average: number; count: number }> = {};
  for (const [id, { sum, count }] of Object.entries(sums)) {
    if (count > 0) {
      result[id] = { average: sum / count, count };
    }
  }
  return result;
}

export async function insertReview(
  restaurantId: string,
  rating: number,
  comment: string,
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Sinun pitää olla kirjautunut sisään.");
  }

  const { error: insertError } = await supabase.from("reviews").insert({
    restaurant_id: restaurantId,
    user_id: user.id,
    rating,
    comment: comment.trim() || null,
  });

  if (insertError) {
    if (
      insertError.code === "23505" ||
      insertError.message?.includes("reviews_unique_user_per_restaurant")
    ) {
      throw new Error("Olet jo arvostellut tämän ravintolan.");
    }
    throw new Error(insertError.message);
  }
}
