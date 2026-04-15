"use client";

import { useMemo, useState } from "react";
import {
  useNearbyRestaurants,
  type ManualArea,
  DEFAULT_RADIUS_KM,
} from "../service/userNearbyRestaurant";
import RestaurantMap from "./Map";
import RestaurantList from "./restaurantList";
import RestaurantSearchBar from "./RestaurantSearchBar";

export default function HomeClient() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | undefined
  >(undefined);
  const [query, setQuery] = useState("");
  const [useLocation, setUseLocation] = useState(false);
  const [manualArea, setManualArea] = useState<ManualArea>("kaikki");

  const { restaurants, userLocation } = useNearbyRestaurants({
    useLocation,
    manualArea,
    radiusKm: DEFAULT_RADIUS_KM,
  });

  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fi-FI");
    if (!normalizedQuery) return restaurants;

    return restaurants.filter((restaurant) =>
      restaurant.name.toLocaleLowerCase("fi-FI").includes(normalizedQuery),
    );
  }, [restaurants, query]);

  return (
    <>
      <section className="w-full">
        <div className="mx-auto max-w-7xl px-4">
          <RestaurantSearchBar
            value={query}
            onChange={setQuery}
            compact
            useLocation={useLocation}
            onUseLocationChange={setUseLocation}
            manualArea={manualArea}
            onManualAreaChange={setManualArea}
            resultText={`${filteredRestaurants.length} ravintolaa`}
          />
        </div>
      </section>

      <RestaurantMap
        selectedRestaurantId={selectedRestaurantId}
        onSelectRestaurantId={setSelectedRestaurantId}
        restaurants={filteredRestaurants}
        userLocation={useLocation ? userLocation : null}
      />

      <RestaurantList restaurants={filteredRestaurants} />
    </>
  );
}
