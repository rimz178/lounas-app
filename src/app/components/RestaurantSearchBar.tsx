// src/app/components/RestaurantSearchBar.tsx
"use client";

import type { ManualArea } from "../service/userNearbyRestaurant";

const MANUAL_AREAS: ManualArea[] = ["kaikki", "helsinki", "vantaa", "espoo"];

function isManualArea(value: string): value is ManualArea {
  return MANUAL_AREAS.includes(value as ManualArea);
}

type RestaurantSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultText?: string;
  useLocation?: boolean;
  onUseLocationChange?: (value: boolean) => void;
  manualArea?: ManualArea;
  onManualAreaChange?: (value: ManualArea) => void;
};

export default function RestaurantSearchBar({
  value,
  onChange,
  placeholder = "Etsi ravintolaa nimellä...",
  resultText,
  useLocation,
  onUseLocationChange,
  manualArea,
  onManualAreaChange,
}: RestaurantSearchBarProps) {
  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <label
        htmlFor="restaurant-search"
        className="mb-2 block text-sm font-semibold text-gray-700"
      >
        Hae ravintolaa
      </label>

      {onUseLocationChange ? (
        <label className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(useLocation)}
            onChange={(e) => onUseLocationChange(e.target.checked)}
            className="h-4 w-4"
          />
          Käytä nykyistä sijaintiani
        </label>
      ) : null}

      {onManualAreaChange && !useLocation ? (
        <div className="mb-3 flex items-center gap-2">
          <label
            htmlFor="restaurant-area"
            className="text-sm font-medium text-gray-700"
          >
            Hae tältä alueelta
          </label>
          <select
            id="restaurant-area"
            value={manualArea ?? "kaikki"}
            onChange={(e) => {
              const nextArea = e.target.value;
              if (isManualArea(nextArea)) {
                onManualAreaChange(nextArea);
              }
            }}
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-700"
          >
            <option value="kaikki">Kaikki alueet</option>
            <option value="helsinki">Helsinki</option>
            <option value="vantaa">Vantaa</option>
            <option value="espoo">Espoo</option>
          </select>
        </div>
      ) : null}

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
