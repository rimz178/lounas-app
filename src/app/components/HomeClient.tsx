"use client";
import { useState } from "react";
import RestaurantMap from "./Map";
import { useNearbyRestaurants } from "../service/userNearbyRestaurant";
import RestaurantList from "./restaurantList"

export default function HomeClient() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | undefined
  >(undefined);
  const [radius, setRadius] = useState(2);
  const { restaurants, userLocation} = useNearbyRestaurants(radius);

  return (
    <>
      <div className="mb-4 flex items-center gap-2 px-4 md:px-8">
        <label htmlFor="radius" className="font-medium">
          Näytä ravintolat säteellä
        </label>
        <input
          id="radius"
          type="number"
          min={1}
          max={20}
          value={radius}
          onChange={(e) => {
            const { value } = e.target;
            setRadius((prevRadius) => {
              if (value === "") {
                return prevRadius;
              }
              const parsed = parseInt(value, 10);
              if (Number.isNaN(parsed)) {
                return prevRadius;
              }
              const clamped = Math.min(20, Math.max(1, parsed));
              return clamped;
            });
          }}
          className="border rounded px-2 py-1 w-16"
        />
        <span>km</span>
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
