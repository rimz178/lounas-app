;

interface Review {
  restaurant_id: string;
  rating: number;
  comment: string;
}

export async function getReviewStatsByRestaurant(
  ids: string[],
): Promise<Record<string, { average: number; count: number }>> {
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
        body: JSON.stringify({ action: "getReviewStats", ids }),
      }
    );

    if (!response.ok) {
      console.warn("reviews error:", response.statusText);
      return {};
    }

    const data = await response.json();
    return data.stats || {};
  } catch (error) {
    console.error("Error fetching review stats:", error);
    return {};
  }
}

export async function insertReview(
  restaurantId: string,
  rating: number,
  comment: string,
) {
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
          action: "insertReview",
          data: {
            restaurant_id: restaurantId,
            rating,
            comment: comment.trim() || null,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to insert review: " + response.statusText);
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("Error inserting review:", error);
    throw error;
  }
}

export async function deleteReview(restaurantId: string) {
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
          action: "deleteReview",
          data: { restaurant_id: restaurantId },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete review: " + response.statusText);
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("Error deleting review:", error);
    throw error;
  }
}

export async function getUserReviewsByRestaurant(
  restaurantId: string,
  userId: string,
) {
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
          action: "getUserReviews",
          data: { restaurant_id: restaurantId, user_id: userId },
        }),
      }
    );

    if (!response.ok) {
      console.warn("Failed to fetch user reviews:", response.statusText);
      return null;
    }

    const result = await response.json();
    return result.reviews || null;
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    return null;
  }
}

export async function upsertReview(review: Review) {
  try {
    // Hae käyttäjätiedot Edge Functionin kautta
    const userResponse = await fetch(
      "https://clurtxpqwmekgicwusqs.supabase.co/functions/v1/refresh-lunches",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ action: "getUser" }),
      }
    );

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user data: " + userResponse.statusText);
    }

    const userResult = await userResponse.json();
    const user = userResult.user;

    if (!user) {
      throw new Error("Sinun pitää olla kirjautunut sisään.");
    }

    // Suorita arvostelun lisääminen
    const response = await fetch(
      "https://clurtxpqwmekgicwusqs.supabase.co/functions/v1/refresh-lunches",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: "upsertReview",
          data: {
            restaurant_id: review.restaurant_id,
            user_id: user.id,
            rating: review.rating,
            comment: review.comment.trim() || null,
          },
          options: { onConflict: "restaurant_id,user_id" },
        }),
      }
    );

    if (!response.ok) {
      console.error("Failed to upsert review:", response.statusText);
      return { error: response.statusText };
    }

    const result = await response.json();
    return { error: result.error || null };
  } catch (error) {
    console.error("Error upserting review:", error);
    return { error: error instanceof Error ? error.message : String(error) };
  }
}