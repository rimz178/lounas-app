"use client";

import dynamic from "next/dynamic";
/**
 * RestaurantMap renders a section containing a map of restaurants.
 *
 * @param {Props} props - The props for the component
 * @param {string} [props.selectedRestaurantId] - The ID of the currently selected restaurant (optional)
 * @param {(id: string) => void} [props.onSelectRestaurantId] - Callback when a restaurant is selected (optional)
 * @param {Array<{id: string, name: string, lat: number, lng: number, url: string}>} props.restaurants - List of restaurants to display on the map
 * @returns {JSX.Element} The rendered map section
 */

type Props = {
  selectedRestaurantId?: string;
  onSelectRestaurantId?: (id: string) => void;
  restaurants: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    url: string;
  }>;
};

const LeafletMap = dynamic<Props>(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full min-h-[320px] h-[60vh] max-h-[520px] rounded-lg border bg-white shadow-sm" />
  ),
});

export default function RestaurantMap(props: Props) {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h2 className="mb-3 text-lg font-semibold">Kartta</h2>
        <div className="h-[400px] rounded-lg overflow-hidden">
          <LeafletMap {...props} />
        </div>
      </div>
    </section>
  );
}
