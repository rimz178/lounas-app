"use client";

import { useEffect, useState } from "react";
import {
  deleteUserReview,
  getReviewStatsByRestaurant,
  getUserReview,
  upsertReview,
} from "../service/reviews";
import { useAuth } from "./AuthContext";

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
/**
 *  Näyttää listan ravintoloista, joissa on niiden arvostelutiedot ja mahdollisuus
 * jättää tai muokata oma arvostelu.
 * @param param0  - Komponentin propsit, jotka sisältävät listan ravintoloista, joille näytetään arvostelutiedot ja arvostelulomakkeet
 * @returns  JSX-elementti, joka sisältää kortit ravintoloista, joissa on niiden arvostelutiedot ja mahdollisuus jättää tai muokata oma arvostelu.
 */
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
  const { isLoggedIn, user } = useAuth();
  const [userReviews, setUserReviews] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const checkAuth = async () => {
      if (isLoggedIn && user) {
        const reviews: Record<string, boolean> = {};
        for (const restaurant of restaurants) {
          const userReview = await getUserReview(restaurant.id);
          if (userReview) {
            reviews[restaurant.id] = true;
          }
        }
        setUserReviews(reviews);
      } else {
        setUserReviews({});
      }
    };

    checkAuth();

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
  }, [restaurants, isLoggedIn, user]);

  const handleEdit = async (restaurantId: string) => {
    setActiveId(restaurantId);
    setStatus(null);

    try {
      const userReview = await getUserReview(restaurantId);
      if (userReview) {
        setRating(userReview.rating);
        setComment(userReview.comment || "");
      } else {
        setRating(5);
        setComment("");
      }
    } catch (error) {
      console.error("Virhe haettaessa käyttäjän arvostelua:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent, restaurantId: string) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      await upsertReview(restaurantId, rating, comment);
      setStatus("Arvostelu tallennettu!");
      setActiveId(null);
      setComment("");

      const restaurantIds = restaurants.map((restaurant) => restaurant.id);
      const reviewStats = await getReviewStatsByRestaurant(restaurantIds);
      const updatedRestaurants = restaurants.map((restaurant) => ({
        ...restaurant,
        reviews: reviewStats[restaurant.id] || { average: 0, count: 0 },
      }));
      setRestaurantsWithReviews(updatedRestaurants);

      setUserReviews((prev) => ({ ...prev, [restaurantId]: true }));
    } catch (_error) {
      setStatus("Arvostelun tallennus epäonnistui.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (restaurantId: string) => {
    setSubmitting(true);
    setStatus(null);

    try {
      await deleteUserReview(restaurantId);
      setStatus("Arvostelu poistettu!");
      setActiveId(null);

      const restaurantIds = restaurants.map((restaurant) => restaurant.id);
      const reviewStats = await getReviewStatsByRestaurant(restaurantIds);
      const updatedRestaurants = restaurants.map((restaurant) => ({
        ...restaurant,
        reviews: reviewStats[restaurant.id] || { average: 0, count: 0 },
      }));
      setRestaurantsWithReviews(updatedRestaurants);
      setUserReviews((prev) => ({ ...prev, [restaurantId]: false }));
    } catch (_error) {
      setStatus("Arvostelun poisto epäonnistui.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 sm:pt-8">
      {restaurantsWithReviews.map((restaurant) => (
        <div
          key={restaurant.id}
          className="bg-white rounded-[2.5rem] shadow-lg border border-gray-200 p-4 sm:p-6 lg:p-8 flex flex-col justify-between min-h-[180px]"
        >
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            {restaurant.name}
          </h2>
          {restaurant.reviews && restaurant.reviews.count > 0 ? (
            <p className="text-gray-700 mb-2">
              Keskiarvo: {restaurant.reviews.average.toFixed(1)} (
              {restaurant.reviews.count} arvostelua)
            </p>
          ) : (
            <p className="text-gray-400 mb-2">Ei arvosteluja vielä</p>
          )}
          {isLoggedIn ? (
            activeId === restaurant.id ? (
              <form
                onSubmit={(e) => handleSubmit(e, restaurant.id)}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <label
                    htmlFor={`rating-${restaurant.id}`}
                    className="text-sm"
                  >
                    Arvosana
                  </label>
                  <select
                    id={`rating-${restaurant.id}`}
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="border rounded px-3 py-1 text-sm"
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
                    {submitting ? "Tallennetaan..." : "Tallenna arvostelu"}
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
                {status && (
                  <p className="text-xs text-gray-300 mt-1">{status}</p>
                )}
              </form>
            ) : (
              <button
                type="button"
                onClick={() => handleEdit(restaurant.id)}
                className="border rounded px-3 py-1 text-sm bg-gray-100 text-gray-900 hover:bg-gray-200"
              >
                {userReviews[restaurant.id]
                  ? "Muokkaa arvostelua"
                  : "Jätä arvostelu"}
              </button>
            )
          ) : (
            <p className="text-sm text-gray-400">
              Kirjaudu sisään lisätäksesi arvostelun.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
