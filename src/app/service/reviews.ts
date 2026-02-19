import { supabase } from "./supabaseClient";

export async function getReviewStatsByRestaurant(
  ids: string[],
): Promise<Record<string, { average: number; count: number }>> {
  if (!ids.length) return {};

  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("restaurant_id, rating")
      .in("restaurant_id", ids);

    if (error) {
      console.error(`Virhe haettaessa arvostelutilastoja: ${error.message}`);
      return {};
    }

    const stats: Record<string, { average: number; count: number }> = {};
    ids.forEach((id) => {
      const reviews =
        data?.filter((review) => review.restaurant_id === id) || [];
      const total = reviews.reduce((sum, review) => sum + review.rating, 0);
      stats[id] = {
        average: reviews.length ? total / reviews.length : 0,
        count: reviews.length,
      };
    });

    return stats;
  } catch (error) {
    console.error(`Virhe haettaessa arvostelutilastoja: ${error}`);
    return {};
  }
}

export async function upsertReview(
  restaurantId: string,
  rating: number,
  comment: string,
) {
  try {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("Arvosanan tulee olla kokonaisluku välillä 1–5.");
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Käyttäjätietojen haku epäonnistui.");
    }

    const { error } = await supabase.from("reviews").upsert(
      {
        restaurant_id: restaurantId,
        user_id: user.id,
        rating,
        comment: comment.trim() || null,
      },
      {
        onConflict: "restaurant_id,user_id",
      },
    );

    if (error) {
      throw new Error(
        `Arvostelun lisääminen tai päivittäminen epäonnistui: ${error.message}`,
      );
    }
  } catch (error) {
    console.error("Virhe lisättäessä tai päivitettäessä arvostelua:", error);
    throw error;
  }
}

export async function deleteUserReview(restaurantId: string) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Käyttäjätietojen haku epäonnistui.");
    }

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("restaurant_id", restaurantId);

    if (error) {
      throw new Error(`Arvostelun poistaminen epäonnistui: ${error.message}`);
    }
  } catch (error) {
    console.error("Virhe poistettaessa arvostelua:", error);
    throw error;
  }
}

export async function getUserReview(restaurantId: string) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Käyttäjätietojen haku epäonnistui.");
    }

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.warn(`Käyttäjän arvostelun haku epäonnistui: ${error.message}`);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error("Virhe haettaessa käyttäjän arvostelua:", error);
    return null;
  }
}
