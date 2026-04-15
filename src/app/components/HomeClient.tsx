"use client";

import { useMemo, useState } from "react";
import {
  useNearbyRestaurants,
  type ManualArea,
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
    radiusKm: 6,
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
      <RestaurantSearchBar
        value={query}
        onChange={setQuery}
        useLocation={useLocation}
        onUseLocationChange={setUseLocation}
        manualArea={manualArea}
        onManualAreaChange={(value) => setManualArea(value as ManualArea)}
        resultText={`${filteredRestaurants.length} ravintolaa`}
      />

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
