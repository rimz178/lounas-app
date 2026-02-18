import { supabase } from "./supabaseClient";

interface Review {
  restaurant_id: string;
  rating: number;
  comment: string;
}

export async function getReviewStatsByRestaurant(
  ids: string[]
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
      const reviews = data?.filter((review) => review.restaurant_id === id) || [];
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

export async function insertReview(
  restaurantId: string,
  rating: number,
  comment: string
) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Käyttäjätietojen haku epäonnistui.");
    }

    const { error } = await supabase
      .from("reviews")
      .insert([
        {
          restaurant_id: restaurantId,
          user_id: user.id, 
          rating,
          comment: comment.trim() || null,
        },
      ]);

    if (error) {
      throw new Error(`Arvostelun lisääminen epäonnistui: ${error.message}`);
    }
  } catch (error) {
    console.error("Virhe lisättäessä arvostelua:", error);
    throw error;
  }
}

// Poista arvostelu
export async function deleteReview(restaurantId: string) {
  try {
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("restaurant_id", restaurantId);

    if (error) {
      throw new Error(`Arvostelun poistaminen epäonnistui: ${error.message}`);
    }
  } catch (error) {
    console.error(`Virhe poistettaessa arvostelua: ${error}`);
    throw error;
  }
}

// Hae käyttäjän arvostelut ravintolasta
export async function getUserReviewsByRestaurant(
  restaurantId: string,
  userId: string
) {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("user_id", userId);

    if (error) {
      console.warn(`Käyttäjän arvostelujen haku epäonnistui: ${error.message}`);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error(`Virhe haettaessa käyttäjän arvosteluja: ${error}`);
    return null;
  }
}

// Muokkaa arvostelua
export async function updateReview(
  restaurantId: string,
  rating: number,
  comment: string
) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Käyttäjätietojen haku epäonnistui.");
    }

    const { error } = await supabase
      .from("reviews")
      .update({
        rating,
        comment: comment.trim() || null,
      })
      .eq("restaurant_id", restaurantId)
      .eq("user_id", user.id);

    if (error) {
      throw new Error(`Arvostelun muokkaaminen epäonnistui: ${error.message}`);
    }
  } catch (error) {
    console.error("Virhe muokattaessa arvostelua:", error);
    throw error;
  }
}

// Poista käyttäjän arvostelu
export async function deleteUserReview(restaurantId: string) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Käyttäjätietojen haku epäonnistui.");
    }

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("restaurant_id", restaurantId)
      .eq("user_id", user.id);

    if (error) {
      throw new Error(`Arvostelun poistaminen epäonnistui: ${error.message}`);
    }
  } catch (error) {
    console.error("Virhe poistettaessa arvostelua:", error);
    throw error;
  }
}