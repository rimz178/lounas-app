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

  const { error: upsertError } = await supabase.from("reviews").upsert(
    {
      restaurant_id: restaurantId,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
    },
    { onConflict: "restaurant_id,user_id" },
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }
}

export async function deleteReview(restaurantId: string) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Sinun pitää olla kirjautunut sisään.");
  }

  const { error: deleteError } = await supabase
    .from("reviews")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }
}

export async function getUserReviewsByRestaurant(
  ids: string[],
): Promise<Record<string, { rating: number; comment: string | null }>> {
  if (!ids.length) return {};

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return {};

  const { data, error: reviewsError } = await supabase
    .from("reviews")
    .select("restaurant_id, rating, comment")
    .eq("user_id", user.id)
    .in("restaurant_id", ids);

  if (reviewsError || !data) {
    console.warn("my reviews error:", reviewsError?.message);
    return {};
  }

  const result: Record<string, { rating: number; comment: string | null }> = {};
  for (const row of data as {
    restaurant_id: string | null;
    rating: number | null;
    comment: string | null;
  }[]) {
    if (!row.restaurant_id || row.rating == null) continue;
    result[row.restaurant_id] = {
      rating: row.rating,
      comment: row.comment,
    };
  }
  return result;
}
