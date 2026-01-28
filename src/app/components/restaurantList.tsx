"use client";

import type { Restaurant } from "../service/userNearbyRestaurant";

/**
 *
 *  @param {Object} props - Component props
 * @param {Restaurant[]} props.restaurants - Array of restaurants to display
 * @returns  restaurant list component
 *
 */
export default function RestaurantList({
  restaurants,
}: {
  restaurants: Restaurant[];
}) {
  if (!restaurants.length) {
    return <div>Ei ravintoloita löytynyt.</div>;
  }

  return (
    <div className="px-4 md:px-8">
      <h2 className="text-lg font-semibold mb-3">Lähimmät ravintolat</h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {restaurants.map((r) => (
          <li key={r.id} className="border rounded p-6">
            <div className="font-bold">{r.name}</div>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Ravintolan sivut
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
