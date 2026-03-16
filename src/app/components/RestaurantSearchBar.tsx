// src/app/components/RestaurantSearchBar.tsx
"use client";

type RestaurantSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultText?: string;
};

export default function RestaurantSearchBar({
  value,
  onChange,
  placeholder = "Etsi ravintolaa nimellä...",
  resultText,
}: RestaurantSearchBarProps) {
  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <label
        htmlFor="restaurant-search"
        className="mb-2 block text-sm font-semibold text-gray-700"
      >
        Hae ravintolaa
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id="restaurant-search"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-500"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Tyhjenna
          </button>
        ) : null}
      </div>

      {resultText ? (
        <p className="mt-2 text-sm text-gray-500">{resultText}</p>
      ) : null}
    </div>
  );
}
