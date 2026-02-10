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
      const res = await fetch(
        "/api?token=proj-MmRkYzE3ZTAtY2YwYS00Y2I4LWI3YjctY2E3ZDM2ZjI2ZDYzXzE2OTY0MTc1OTg5NTRfODk2MzkzNw",
        { method: "POST" },
      );
      const data = await res.json();
      setRefreshResult(JSON.stringify(data));
      reload();
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
      {refreshResult && (
        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded"></pre>
      )}
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
