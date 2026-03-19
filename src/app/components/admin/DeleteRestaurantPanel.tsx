"use client";

import type { AdminRestaurantOption } from "./MenuEditor";

export type DeleteStatus = "idle" | "loading" | "success" | "error";

type Props = {
  restaurants: AdminRestaurantOption[];
  selected: string;
  deleteStatus: DeleteStatus;
  deleteMessage: string;
  onSelect: (restaurantId: string) => void;
  onDelete: () => void;
};

export default function DeleteRestaurantPanel({
  restaurants,
  selected,
  deleteStatus,
  deleteMessage,
  onSelect,
  onDelete,
}: Props) {
  const selectedRestaurant = restaurants.find(
    (restaurant) => restaurant.id === selected,
  );

  return (
    <section className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Poista ravintola</h2>

      <label
        htmlFor="restaurant-delete-select"
        className="block text-sm font-medium"
      >
        Valitse poistettava ravintola
      </label>
      <select
        id="restaurant-delete-select"
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        className="mt-2 w-full max-w-md rounded-md border border-gray-300 px-3 py-2"
      >
        <option value="">-- Valitse --</option>
        {restaurants.map((restaurant) => (
          <option key={restaurant.id} value={restaurant.id}>
            {restaurant.name}
          </option>
        ))}
      </select>

      <p className="mt-3 text-sm text-gray-600">
        Poisto poistaa samalla ravintolan menut ja arvostelut.
      </p>

      <button
        type="button"
        onClick={() => {
          if (!selectedRestaurant) return;

          const confirmed = window.confirm(
            `Oletko varma, että haluat poistaa ravintolan "${selectedRestaurant.name}"?`,
          );

          if (confirmed) {
            onDelete();
          }
        }}
        disabled={!selected || deleteStatus === "loading"}
        className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white disabled:opacity-60"
      >
        {deleteStatus === "loading" ? "Poistetaan..." : "Poista ravintola"}
      </button>

      {deleteMessage ? (
        <p
          className={`mt-2 text-sm ${
            deleteStatus === "error" ? "text-red-700" : "text-green-700"
          }`}
        >
          {deleteMessage}
        </p>
      ) : null}
    </section>
  );
}
