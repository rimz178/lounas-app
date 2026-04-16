// src/app/components/RestaurantSearchBar.tsx
"use client";

import { useId } from "react";
import type { ManualArea } from "../service/userNearbyRestaurant";

const MANUAL_AREAS: ManualArea[] = ["kaikki", "helsinki", "vantaa", "espoo"];

function isManualArea(value: string): value is ManualArea {
  return MANUAL_AREAS.includes(value as ManualArea);
}
/**
 * RestaurantSearchBar-komponentti, joka näyttää hakupalkin ravintoloiden suodattamiseen nimellä, sijainnilla tai manuaalisella aluevalinnalla.
 * @param param0  - Komponentin propsit, jotka sisältävät hakupalkin tilan ja tapahtumankäsittelijät
 * @returns JSX-elementti, joka sisältää hakupalkin ja siihen liittyvät ohjaimet
 */
type RestaurantSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultText?: string;
  compact?: boolean;
  tone?: "light" | "dark";
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
  compact = false,
  tone = "light",
  useLocation,
  onUseLocationChange,
  manualArea,
  onManualAreaChange,
}: RestaurantSearchBarProps) {
  const isDark = tone === "dark";
  const isToolbar = isDark && compact;
  const searchId = useId();
  const areaId = useId();

  const containerClassName = isToolbar
    ? "mt-0 border-y border-neutral-800 bg-neutral-900 px-0 py-2"
    : isDark
      ? compact
        ? "mt-0 rounded-xl border border-neutral-700 bg-neutral-900 p-2"
        : "mt-0 rounded-2xl border border-neutral-700 bg-neutral-900 p-3"
      : compact
        ? "mt-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
        : "mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm";

  const labelClassName = compact
    ? isDark
      ? "mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-200"
      : "mb-1 block text-sm font-semibold text-gray-700"
    : isDark
      ? "mb-2 block text-sm font-semibold text-neutral-100"
      : "mb-2 block text-sm font-semibold text-gray-700";

  const controlsGapClassName =
    "flex flex-col gap-2 sm:flex-row sm:items-center";

  const inputClassName = isToolbar
    ? "w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-500 focus:border-neutral-500"
    : compact
      ? isDark
        ? "w-full rounded-md border border-neutral-600 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
        : "w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none transition focus:border-gray-500"
      : isDark
        ? "w-full rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
        : "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-500";

  const buttonClassName = isToolbar
    ? "shrink-0 rounded-md border border-neutral-700 px-3 py-1.5 text-sm font-semibold text-neutral-100 hover:bg-neutral-800"
    : compact
      ? isDark
        ? "shrink-0 rounded-md border border-neutral-600 px-3 py-1.5 text-sm font-medium text-neutral-100 hover:bg-neutral-800"
        : "shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
      : isDark
        ? "shrink-0 rounded-lg border border-neutral-600 px-3 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-800"
        : "shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100";

  const locationLabelClassName = isToolbar
    ? "mb-0 flex items-center gap-2 text-xs font-medium text-neutral-200"
    : isDark
      ? "mb-2 flex items-center gap-2 text-xs font-medium text-neutral-200"
      : "mb-3 flex items-center gap-2 text-sm font-medium text-gray-700";

  const areaRowClassName = isToolbar
    ? "mb-0 flex items-center gap-2"
    : isDark
      ? "mb-2 flex items-center gap-2"
      : "mb-3 flex items-center gap-2";

  const areaLabelClassName = isToolbar
    ? "sr-only"
    : isDark
      ? "text-xs font-medium text-neutral-200"
      : "text-sm font-medium text-gray-700";

  const areaSelectClassName = isToolbar
    ? "rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-100"
    : isDark
      ? "rounded-md border border-neutral-600 bg-neutral-800 px-2 py-1 text-xs text-neutral-100"
      : "rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-700";

  const resultTextClassName = isToolbar
    ? "mt-1 text-[11px] text-neutral-400"
    : isDark
      ? "mt-1 text-xs text-neutral-300"
      : "mt-2 text-sm text-gray-500";

  const locationButtonClassName = useLocation
    ? "shrink-0 rounded-md border border-neutral-500 bg-neutral-700 px-3 py-1.5 text-xs font-semibold text-white"
    : "shrink-0 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-100 hover:bg-neutral-700";

  return (
    <div className={containerClassName}>
      {!isToolbar ? (
        <label htmlFor={searchId} className={labelClassName}>
          Hae ravintolaa
        </label>
      ) : null}

      {!isToolbar && onUseLocationChange ? (
        <label className={locationLabelClassName}>
          <input
            type="checkbox"
            checked={Boolean(useLocation)}
            onChange={(e) => onUseLocationChange(e.target.checked)}
            className="h-4 w-4"
          />
          Käytä nykyistä sijaintiani
        </label>
      ) : null}

      {!isToolbar && onManualAreaChange && !useLocation ? (
        <div className={areaRowClassName}>
          <label htmlFor={areaId} className={areaLabelClassName}>
            Hae tältä alueelta
          </label>
          <select
            id={areaId}
            value={manualArea ?? "kaikki"}
            onChange={(e) => {
              const nextArea = e.target.value;
              if (isManualArea(nextArea)) {
                onManualAreaChange(nextArea);
              }
            }}
            className={areaSelectClassName}
          >
            <option value="kaikki">Kaikki alueet</option>
            <option value="helsinki">Helsinki</option>
            <option value="vantaa">Vantaa</option>
            <option value="espoo">Espoo</option>
          </select>
        </div>
      ) : null}

      {isToolbar ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={searchId}
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${inputClassName} min-w-[220px] flex-1`}
          />

          {onManualAreaChange && !useLocation ? (
            <div className={areaRowClassName}>
              <label htmlFor={areaId} className={areaLabelClassName}>
                Hae tältä alueelta
              </label>
              <select
                id={areaId}
                value={manualArea ?? "kaikki"}
                onChange={(e) => {
                  const nextArea = e.target.value;
                  if (isManualArea(nextArea)) {
                    onManualAreaChange(nextArea);
                  }
                }}
                className={areaSelectClassName}
              >
                <option value="kaikki">Kaikki alueet</option>
                <option value="helsinki">Helsinki</option>
                <option value="vantaa">Vantaa</option>
                <option value="espoo">Espoo</option>
              </select>
            </div>
          ) : null}

          {onUseLocationChange ? (
            <button
              type="button"
              onClick={() => onUseLocationChange(!Boolean(useLocation))}
              className={locationButtonClassName}
            >
              {useLocation ? "Sijainti: ON" : "Sijainti: OFF"}
            </button>
          ) : null}

          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className={buttonClassName}
            >
              Tyhjenna
            </button>
          ) : null}
        </div>
      ) : (
        <div className={controlsGapClassName}>
          <input
            id={searchId}
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={inputClassName}
          />
          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className={buttonClassName}
            >
              Tyhjenna
            </button>
          ) : null}
        </div>
      )}

      {resultText ? <p className={resultTextClassName}>{resultText}</p> : null}
    </div>
  );
}
