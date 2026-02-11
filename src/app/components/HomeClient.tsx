"use client";
import { useState } from "react";
import RestaurantMap from "./Map";
import { useNearbyRestaurants } from "../service/userNearbyRestaurant";
import RestaurantList from "./RestaurantList";

export default function HomeClient() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | undefined
  >(undefined);
  const [radius, setRadius] = useState(2);
  const { restaurants, userLocation, reload } = useNearbyRestaurants(radius);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const token = process.env.NEXT_PUBLIC_MENU_REFRESH_TOKEN;

      const res = await fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          restaurantIds: restaurants.map((r) => r.id),
        }),
      });

      const data = await res.json();
      setRefreshResult(JSON.stringify(data, null, 2));
      if (data.ok) {
        reload(); 
      }
    } catch (e) {
      setRefreshResult("Virhe: " + (e as Error).message);
    }
    setRefreshing(false);
  }

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
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        className="border rounded px-2 py-1 bg-blue-600 text-white"
      >
        {refreshing ? "Päivitetään..." : "Päivitä lounaslistat nyt"}
      </button>
      
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
