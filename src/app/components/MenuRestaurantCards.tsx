// src/app/components/MenuRestaurantCards.tsx
"use client";

import { useMemo, useState } from "react";
import RestaurantSearchBar from "./RestaurantSearchBar";

type RestaurantMenu = {
  id: string;
  name: string;
  url: string | null;
  menuText: string | null;
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

  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fi-FI");
    if (!normalizedQuery) return restaurants;

    return restaurants.filter((restaurant) =>
      restaurant.name.toLocaleLowerCase("fi-FI").includes(normalizedQuery),
    );
  }, [restaurants, query]);

  return (
    <>
      <RestaurantSearchBar
        value={query}
        onChange={setQuery}
        resultText={`${filteredRestaurants.length} / ${restaurants.length} ravintolaa`}
      />

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filteredRestaurants.map((restaurant) => {
          const rawMenu = restaurant.menuText?.trim();
          const hasMenu = !!rawMenu && rawMenu !== "No lunch menu found.";
          const sections = hasMenu ? parseMenuSections(rawMenu) : [];

          return (
            <article
              key={restaurant.id}
              className="flex min-h-[220px] flex-col rounded-3xl border border-gray-200 bg-white p-5 shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  {restaurant.name}
                </h2>
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
              </div>

              {!hasMenu ? (
                <p className="text-sm text-gray-500">
                  Ei lounaslistaa saatavilla juuri nyt.
                </p>
              ) : (
                <div className="space-y-4">
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
                          {section.items.map((item) => (
                            <li
                              key={`${restaurant.id}-${section.title ?? "menu"}-${item}`}
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
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
