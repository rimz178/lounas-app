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
  const { restaurants, userLocation, reload } = useNearbyRestaurants(radius);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

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

      if (data.ok) {
        const successCount =
          data.results?.filter((r: { menu?: string }) => r.menu).length || 0;
        const errorCount =
          data.results?.filter((r: { error?: string }) => r.error).length || 0;
        setRefreshResult({
          success: true,
          message: `Päivitys onnistui! ${successCount} menua päivitetty${errorCount > 0 ? `, ${errorCount} virheellistä` : ""}.`,
        });
        reload();
      } else {
        setRefreshResult({
          success: false,
          message: `Virhe: ${data.error || "Tuntematon virhe"}`,
        });
      }
    } catch (e) {
      setRefreshResult({
        success: false,
        message: `Virhe: ${(e as Error).message}`,
      });
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

      <div className="mb-4 px-4 md:px-8">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border rounded px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {refreshing ? "Päivitetään..." : "Päivitä lounaslistat nyt"}
        </button>

        {refreshResult && (
          <div
            className={`mt-3 p-3 rounded ${
              refreshResult.success
                ? "bg-green-100 border border-green-400 text-green-700"
                : "bg-red-100 border border-red-400 text-red-700"
            }`}
          >
            {refreshResult.message}
          </div>
        )}
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
