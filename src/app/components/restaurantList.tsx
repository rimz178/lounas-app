"use client";

import { useState } from "react";
import type { Restaurant } from "../service/types";
import { insertReview } from "../service/reviews";

export default function RestaurantList({
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
        await reload();
      }
      setStatus("Kiitos arvostelusta!");
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
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="border rounded px-3 py-1 bg-blue-600 text-white text-sm disabled:opacity-60"
                    >
                      {submitting ? "Tallennetaan..." : "Lähetä arvostelu"}
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
                  onClick={() => {
                    setActiveId(r.id);
                    setStatus(null);
                  }}
                  className="border rounded px-3 py-1 text-sm bg-gray-800 text-white"
                >
                  Jätä arvostelu
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
