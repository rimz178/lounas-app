"use client";

import dynamic from "next/dynamic";
import type { Restaurant } from "../service/types";

/**
 * RestaurantMap renders a section containing a map of restaurants.
 *
 * @param {Props} props - The props for the component
 * @param {string} [props.selectedRestaurantId] - The ID of the currently selected restaurant (optional)
 * @param {(id: string) => void} [props.onSelectRestaurantId] - Callback when a restaurant is selected (optional)
 * @param {Array<{id: string, name: string, lat: number, lng: number, url: string}>} props.restaurants - List of restaurants to display on the map
 * @param {{lat: number, lng: number}=} props.userLocation - User's location (optional)
 * @returns {JSX.Element} The rendered map section
 */

type Props = {
  selectedRestaurantId?: string;
  onSelectRestaurantId?: (id: string) => void;
  restaurants: Restaurant[];
  userLocation?: { lat: number; lng: number } | null;
};

const LeafletMap = dynamic<Props>(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-lg border bg-white shadow-sm" />
  ),
});

export default function RestaurantMap(props: Props) {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h2 className="mb-3 text-lg font-semibold">Kartta</h2>
        <div className="w-full h-[250px] sm:h-[400px] lg:h-[70vh] rounded-lg overflow-hidden mx-auto mt-2 mb-4">
          <LeafletMap {...props} />
        </div>
      </div>
    </section>
  );
}
