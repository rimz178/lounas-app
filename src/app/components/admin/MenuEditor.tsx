"use client";

export type AdminRestaurantOption = {
  id: string;
  name: string;
};

export type AdminMenuRow = {
  id: string;
  restaurant_id: string;
  menu_text: string;
};

export type SaveStatus = "idle" | "loading" | "success" | "error";

type Props = {
  restaurants: AdminRestaurantOption[];
  selected: string;
  menu: string;
  status: SaveStatus;
  onSelect: (restaurantId: string) => void;
  onMenuChange: (value: string) => void;
  onSave: () => void;
};

export default function MenuEditor({
  restaurants,
  selected,
  menu,
  status,
  onSelect,
  onMenuChange,
  onSave,
}: Props) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Muokkaa ruokalistaa</h2>

      <label htmlFor="restaurant-select" className="block text-sm font-medium">
        Valitse ravintola
      </label>
      <select
        id="restaurant-select"
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

      {selected ? (
        <div className="mt-4">
          <textarea
            value={menu}
            onChange={(e) => onMenuChange(e.target.value)}
            rows={8}
            className="block w-full max-w-2xl rounded-md border border-gray-300 px-3 py-2"
            placeholder="Kirjoita ravintolan menu tähän..."
          />

          <button
            type="button"
            onClick={onSave}
            disabled={status === "loading" || !menu.trim()}
            className="mt-3 rounded-md bg-green-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {status === "loading" ? "Tallennetaan..." : "Tallenna ruokalista"}
          </button>

          {status === "success" ? (
            <p className="mt-2 text-sm text-green-700">
              Menu paivitetty onnistuneesti.
            </p>
          ) : null}
          {status === "error" ? (
            <p className="mt-2 text-sm text-red-700">Päivitys epaonnistui.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
