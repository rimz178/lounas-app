// src/app/components/MenuRestaurantCards.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DirectionsButton from "./DirectionsButton";
import RestaurantSearchBar from "./RestaurantSearchBar";
import {
  type ManualArea,
  AREA_BOUNDS,
  DEFAULT_RADIUS_KM,
  getDistanceKm,
  isValidLat,
  isValidLng,
} from "../service/userNearbyRestaurant";
/**
 * MenuRestaurantCards-komponentti, joka näyttää ravintolat kortteina, joissa on niiden ruokalistat.
 */
type RestaurantMenu = {
  id: string;
  name: string;
  url: string | null;
  menuText: string | null;
  lat: number | null;
  lng: number | null;
};

type MenuSection = {
  title: string | null;
  items: string[];
};

const dayHeadingPattern =
  /^(maanantai|tiistai|keskiviikko|torstai|perjantai|lauantai|sunnuntai|ma\s*-\s*pe|ma-pe|koko viikon|viikon lounas|tanaan|tänään|today)\b/i;

function normalizeMenuItem(line: string): string {
  return line.replace(/^[-*\u2022]\s*/, "").trim();
}

function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return trimmed.endsWith(":") || dayHeadingPattern.test(trimmed);
}

function parseMenuSections(menuText: string): MenuSection[] {
  const lines = menuText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const sections: MenuSection[] = [];
  let currentSection: MenuSection | null = null;

  for (const line of lines) {
    if (isHeadingLine(line)) {
      currentSection = {
        title: line.replace(/:$/, "").trim(),
        items: [],
      };
      sections.push(currentSection);
      continue;
    }

    const item = normalizeMenuItem(line);
    if (!item) continue;

    if (!currentSection) {
      currentSection = { title: null, items: [] };
      sections.push(currentSection);
    }

    currentSection.items.push(item);
  }

  return sections.filter(
    (section) => section.items.length > 0 || section.title,
  );
}

export default function MenuRestaurantCards({
  restaurants,
}: {
  restaurants: RestaurantMenu[];
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [useLocation, setUseLocation] = useState(false);
  const [manualArea, setManualArea] = useState<ManualArea>("kaikki");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!useLocation) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setUserLocation(null);
      return;
    }
    if (!("geolocation" in navigator)) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (isValidLat(lat) && isValidLng(lng)) setUserLocation({ lat, lng });
      },
      (err) => console.warn("Sijaintia ei saatu:", err),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 },
    );
    return () => {
      if (watchIdRef.current != null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [useLocation]);
  const PAGE_SIZE = 10;
  const NO_MENU_SENTINEL = "No lunch menu found.";
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const canExpandMenu = (menuText: string | null | undefined) => {
    if (!menuText) return false;
    const lineCount = menuText.split(/\r?\n/).filter(Boolean).length;
    return menuText.length > 220 || lineCount > 8;
  };

  const areaFilteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      if (useLocation) {
        if (userLocation == null) return true;
        if (r.lat == null || r.lng == null) return false;
        return (
          getDistanceKm(userLocation.lat, userLocation.lng, r.lat, r.lng) <
          DEFAULT_RADIUS_KM
        );
      }
      if (manualArea === "kaikki") return true;
      if (r.lat == null || r.lng == null) return false;
      const bounds = AREA_BOUNDS[manualArea];
      return (
        r.lat >= bounds.minLat &&
        r.lat <= bounds.maxLat &&
        r.lng >= bounds.minLng &&
        r.lng <= bounds.maxLng
      );
    });
  }, [restaurants, useLocation, userLocation, manualArea]);

  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fi-FI");
    if (!normalizedQuery) return areaFilteredRestaurants;

    return areaFilteredRestaurants.filter((restaurant) =>
      restaurant.name.toLocaleLowerCase("fi-FI").includes(normalizedQuery),
    );
  }, [areaFilteredRestaurants, query]);

  const totalPages = Math.ceil(filteredRestaurants.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const paginatedRestaurants = filteredRestaurants.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <>
      <RestaurantSearchBar
        value={query}
        onChange={(v) => {
          setQuery(v);
          setPage(0);
        }}
        useLocation={useLocation}
        onUseLocationChange={(v) => {
          setUseLocation(v);
          setPage(0);
        }}
        manualArea={manualArea}
        onManualAreaChange={(v) => {
          setManualArea(v);
          setPage(0);
        }}
        resultText={`${filteredRestaurants.length} / ${restaurants.length} ravintolaa`}
      />

      <div className="mt-6 grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {paginatedRestaurants.map((restaurant) => {
          const rawMenu = restaurant.menuText?.trim();
          const hasMenu = !!rawMenu && rawMenu !== NO_MENU_SENTINEL;
          const sections = hasMenu ? parseMenuSections(rawMenu) : [];

          const isExpanded = !!expandedIds[restaurant.id];
          const canExpand = canExpandMenu(rawMenu);

          return (
            <article
              key={restaurant.id}
              className="flex h-[420px] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  {restaurant.name}
                </h2>
                <div className="flex shrink-0 gap-2">
                  {restaurant.url ? (
                    <a
                      href={restaurant.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                    >
                      Sivu
                    </a>
                  ) : null}
                  {restaurant.lat != null && restaurant.lng != null ? (
                    <DirectionsButton
                      lat={restaurant.lat}
                      lng={restaurant.lng}
                      name={restaurant.name}
                    />
                  ) : null}
                </div>
              </div>

              {!hasMenu ? (
                <p className="text-sm text-gray-500">
                  Ei lounaslistaa saatavilla juuri nyt.
                </p>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="relative min-h-0 flex-1">
                    <div
                      className={`space-y-4 ${
                        isExpanded && canExpand
                          ? "h-full overflow-y-auto pr-1"
                          : !isExpanded && canExpand
                            ? "max-h-56 overflow-hidden"
                            : ""
                      }`}
                    >
                      {sections.length > 0 ? (
                        sections.map((section, index) => (
                          <section
                            key={`${restaurant.id}-${section.title ?? "menu"}-${index}`}
                          >
                            {section.title ? (
                              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                                {section.title}
                              </h3>
                            ) : null}
                            <ul className="ml-4 list-disc space-y-1 text-sm text-gray-800">
                              {section.items.map((item, itemIndex) => (
                                <li
                                  key={`${restaurant.id}-${section.title ?? "menu"}-${itemIndex}`}
                                >
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </section>
                        ))
                      ) : (
                        <p className="whitespace-pre-line text-sm text-gray-800">
                          {rawMenu}
                        </p>
                      )}
                    </div>

                    {!isExpanded && canExpand ? (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
                    ) : null}
                  </div>

                  {canExpand ? (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(restaurant.id)}
                      className="mt-3 self-start rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      {isExpanded ? "Näytä vähemmän" : "Näytä lisää"}
                    </button>
                  ) : null}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
          >
            ← Edellinen
          </button>
          <span className="text-sm text-gray-600">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
          >
            Seuraava →
          </button>
        </div>
      ) : null}
    </>
  );
}
