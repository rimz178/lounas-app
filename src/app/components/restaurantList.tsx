"use client";

import { useState } from "react";
import type { Restaurant } from "../service/types";
import { insertReview, deleteReview } from "../service/reviews";
import { memo } from "react";

const RestaurantList = memo(function RestaurantList({
  restaurants,
  reload,
}: {
  restaurants: Restaurant[];
  reload?: () => Promise<void> | void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (!restaurants.length) {
    return <div>Ei ravintoloita löytynyt.</div>;
  }

  async function handleSubmit(e: React.FormEvent, restaurantId: string) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      await insertReview(restaurantId, rating, comment);

      if (reload) {
        void reload(); // hae uudet tiedot taustalla
      }

      setStatus("Arvostelu tallennettu!");
      setComment("");
      setActiveId(null);
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Arvostelun tallennus epäonnistui",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(restaurantId: string) {
    setSubmitting(true);
    setStatus(null);
    try {
      await deleteReview(restaurantId);

      if (reload) {
        void reload();
      }

      setStatus("Arvostelusi on poistettu.");
      setComment("");
      setActiveId(null);
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : "Arvostelun poistaminen epäonnistui",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 md:px-8">
      <h2 className="text-lg font-semibold mb-3">Lähimmät ravintolat</h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {restaurants.map((r) => (
          <li
            key={r.id}
            className="border rounded p-6 flex flex-col gap-3 md:flex-row md:justify-between"
          >
            <div>
              <div className="font-bold">{r.name}</div>

              {typeof r.averageRating === "number" ? (
                <div className="text-sm text-yellow-300">
                  Arvosana {r.averageRating.toFixed(1)}/5{" "}
                  <span className="text-gray-300">
                    ({r.reviewCount ?? 0} arvostelua)
                  </span>
                </div>
              ) : (
                <div className="text-sm text-gray-400">
                  Ei arvosteluja vielä
                </div>
              )}

              {typeof r.myRating === "number" && (
                <div className="mt-1 text-sm text-green-300">
                  Oma arvostelusi: {r.myRating}/5
                  {r.myComment && (
                    <span className="text-gray-200"> — {r.myComment}</span>
                  )}
                </div>
              )}

              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline block mt-2"
              >
                Ravintolan sivut
              </a>
            </div>

            <div className="w-full md:w-1/2">
              {activeId === r.id ? (
                <form
                  onSubmit={(e) => handleSubmit(e, r.id)}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <label htmlFor={`rating-${r.id}`} className="text-sm">
                      Arvosana
                    </label>
                    <select
                      id={`rating-${r.id}`}
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
                      {submitting ? "Tallennetaan..." : "Tallenna arvostelu"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveId(null)}
                      className="border rounded px-3 py-1 text-sm"
                    >
                      Peruuta
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(r.id)}
                      disabled={submitting}
                      className="border rounded px-3 py-1 text-sm text-red-600"
                    >
                      Poista arvosteluni
                    </button>
                  </div>
                  {status && (
                    <p className="text-xs text-gray-300 mt-1">{status}</p>
                  )}
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(r.id);
                    setStatus(null);
                    setRating(r.myRating ?? 5);
                    setComment(r.myComment ?? "");
                  }}
                  className="border rounded px-3 py-1 text-sm bg-gray-800 text-white"
                >
                  {typeof r.myRating === "number"
                    ? "Muokkaa arvosteluani"
                    : "Jätä arvostelu"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
});

export default RestaurantList;

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
      },
    );

    if (!response.ok) {
      console.error("Failed to fetch restaurants:", response.statusText);
      return [];
    }

    const data = await response.json();
    console.log("Fetched restaurants data:", data); // Tulostetaan haettu data

    return data.data ?? [];
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return [];
  }
}
