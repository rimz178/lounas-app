import { supabase } from "./supabaseClient";

interface Review {
  restaurant_id: string;
  rating: number;
  comment: string;
}

// Hae arvostelutilastot ravintoloittain
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

    // Lasketaan keskiarvot ja määrät
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

// Lisää uusi arvostelu
export async function insertReview(
  restaurantId: string,
  rating: number,
  comment: string
) {
  try {
    const { error } = await supabase
      .from("reviews")
      .insert([{ restaurant_id: restaurantId, rating, comment: comment.trim() || null }]);

    if (error) {
      throw new Error(`Arvostelun lisääminen epäonnistui: ${error.message}`);
    }
  } catch (error) {
    console.error(`Virhe lisättäessä arvostelua: ${error}`);
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