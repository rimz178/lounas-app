"use client";

import { useEffect, useState } from "react";
import { getReviewStatsByRestaurant, insertReview, updateReview, deleteUserReview } from "../service/reviews";

interface Restaurant {
  id: string;
  name: string;
}

interface RestaurantWithReviews extends Restaurant {
  reviews: {
    average: number;
    count: number;
  } | null;
}

export default function RestaurantList({
  restaurants,
}: {
  restaurants: Restaurant[];
}) {
  const [restaurantsWithReviews, setRestaurantsWithReviews] = useState<
    RestaurantWithReviews[]
  >([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const restaurantIds = restaurants.map((restaurant) => restaurant.id);
        const reviewStats = await getReviewStatsByRestaurant(restaurantIds);

        const updatedRestaurants = restaurants.map((restaurant) => ({
          ...restaurant,
          reviews: reviewStats[restaurant.id] || { average: 0, count: 0 },
        }));

        setRestaurantsWithReviews(updatedRestaurants);
      } catch (error) {
        console.error("Virhe haettaessa arvosteluja:", error);
      }
    };

    fetchReviews();
  }, [restaurants]);

  async function handleSubmit(e: React.FormEvent, restaurantId: string) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      await insertReview(restaurantId, rating, comment);
      setStatus("Arvostelu tallennettu!");
      setComment("");
      setActiveId(null);

      // Päivitä arvostelut
      const restaurantIds = restaurants.map((restaurant) => restaurant.id);
      const reviewStats = await getReviewStatsByRestaurant(restaurantIds);
      const updatedRestaurants = restaurants.map((restaurant) => ({
        ...restaurant,
        reviews: reviewStats[restaurant.id] || { average: 0, count: 0 },
      }));
      setRestaurantsWithReviews(updatedRestaurants);
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Arvostelun tallennus epäonnistui",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent, restaurantId: string) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      await updateReview(restaurantId, rating, comment);
      setStatus("Arvostelu päivitetty!");
      setComment("");
      setActiveId(null);

      // Päivitä arvostelut
      const restaurantIds = restaurants.map((restaurant) => restaurant.id);
      const reviewStats = await getReviewStatsByRestaurant(restaurantIds);
      const updatedRestaurants = restaurants.map((restaurant) => ({
        ...restaurant,
        reviews: reviewStats[restaurant.id] || { average: 0, count: 0 },
      }));
      setRestaurantsWithReviews(updatedRestaurants);
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Arvostelun päivitys epäonnistui",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(restaurantId: string) {
    setSubmitting(true);
    setStatus(null);
    try {
      await deleteUserReview(restaurantId);
      setStatus("Arvostelu poistettu!");
      setActiveId(null);

      // Päivitä arvostelut
      const restaurantIds = restaurants.map((restaurant) => restaurant.id);
      const reviewStats = await getReviewStatsByRestaurant(restaurantIds);
      const updatedRestaurants = restaurants.map((restaurant) => ({
        ...restaurant,
        reviews: reviewStats[restaurant.id] || { average: 0, count: 0 },
      }));
      setRestaurantsWithReviews(updatedRestaurants);
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Arvostelun poisto epäonnistui",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {restaurantsWithReviews.map((restaurant) => (
        <div
          key={restaurant.id}
          className="border p-4 rounded shadow-md bg-gray-900"
        >
          <h2 className="text-lg font-bold">{restaurant.name}</h2>
          {restaurant.reviews && restaurant.reviews.count > 0 ? (
            <p>
              Keskiarvo: {restaurant.reviews.average.toFixed(1)} (
              {restaurant.reviews.count} arvostelua)
            </p>
          ) : (
            <p>Ei arvosteluja vielä</p>
          )}
          {activeId === restaurant.id ? (
            <form
              onSubmit={(e) => handleUpdate(e, restaurant.id)}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <label htmlFor={`rating-${restaurant.id}`} className="text-sm">
                  Arvosana
                </label>
                <select
                  id={`rating-${restaurant.id}`}
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                rows={3}
                placeholder="Kirjoita lyhyt kommentti (valinnainen)"
                className="w-full border rounded px-2 py-1 text-sm"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="flex gap-2 flex-wrap">
                <button
                  type="submit"
                  disabled={submitting}
                  className="border rounded px-3 py-1 bg-blue-600 text-white text-sm disabled:opacity-60"
                >
                  {submitting ? "Päivitetään..." : "Päivitä arvostelu"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(restaurant.id)}
                  className="border rounded px-3 py-1 bg-red-600 text-white text-sm disabled:opacity-60"
                >
                  {submitting ? "Poistetaan..." : "Poista arvostelu"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="border rounded px-3 py-1 text-sm"
                >
                  Peruuta
                </button>
              </div>
              {status && <p className="text-xs text-gray-300 mt-1">{status}</p>}
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setActiveId(restaurant.id);
                setStatus(null);
                setRating(5);
                setComment("");
              }}
              className="border rounded px-3 py-1 text-sm bg-gray-800 text-white"
            >
              Jätä arvostelu
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
