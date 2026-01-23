import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  url: string;
}

function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useNearbyRestaurants(radiusKm: number = 2) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    async function fetchRestaurants() {
      const { data, error } = await supabase.from("ravintolat").select("*");
      if (!error) setRestaurants((data ?? []) as Restaurant[]);
      if (error) console.error("Supabase error:", error);
    }
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        console.warn("Sijaintia ei saatu:", err);
      }
    );
  }, []);

  const shownRestaurants =
    userLocation == null
      ? restaurants
      : restaurants.filter((r) =>
          getDistanceKm(userLocation.lat, userLocation.lng, r.lat, r.lng) < radiusKm
        );

  return { restaurants: shownRestaurants, userLocation };
}