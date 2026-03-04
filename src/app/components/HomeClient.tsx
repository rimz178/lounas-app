"use client";
import { useState } from "react";
import { useNearbyRestaurants } from "../service/userNearbyRestaurant";
import RestaurantMap from "./Map";
import RestaurantList from "./restaurantList";

export default function HomeClient() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | undefined
  >(undefined);
  const [radius, setRadius] = useState(2);
  const { restaurants, userLocation } = useNearbyRestaurants(radius);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 mt-4">
        <label htmlFor="radius" className="text-base sm:text-lg font-semibold">
          Näytä ravintolat säteellä
        </label>
        <input
          id="radius"
          type="number"
          min={1}
          max={30}
          value={radius}
          onChange={(e) => {
            const { value } = e.target;
            if (value === "") return;
            const parsed = parseInt(value, 10);
            if (Number.isNaN(parsed)) return;
            const clamped = Math.min(30, Math.max(1, parsed));
            setRadius(clamped);
          }}
          className="w-16 px-2 py-1 border rounded text-base"
        />
        <span className="text-base sm:text-lg">km</span>
      </div>
      <RestaurantMap
        selectedRestaurantId={selectedRestaurantId}
        onSelectRestaurantId={setSelectedRestaurantId}
        restaurants={restaurants}
        userLocation={userLocation}
      />
      <RestaurantList restaurants={restaurants} />
    </>
  );
}
