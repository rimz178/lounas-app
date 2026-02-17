import { useCallback, useEffect, useState, useRef } from "react";
import { getLatestMenusByRestaurant, getRestaurants } from "./restaurants";

import type { Restaurant } from "./types";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidLat(lat: unknown): lat is number {
  return isFiniteNumber(lat) && lat >= -90 && lat <= 90;
}

function isValidLng(lng: unknown): lng is number {
  return isFiniteNumber(lng) && lng >= -180 && lng <= 180;
}

function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  if (
    !isValidLat(lat1) ||
    !isValidLng(lng1) ||
    !isValidLat(lat2) ||
    !isValidLng(lng2)
  ) {
    return Number.POSITIVE_INFINITY;
  }
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

export function useNearbyRestaurants(radiusKm = 2) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchingRef = useRef(false);
  const pendingRef = useRef(false);

  const fetchRestaurants = useCallback(async () => {
    if (fetchingRef.current) {
      pendingRef.current = true;
      return;
    }

    fetchingRef.current = true;
    setLoading(true);

    try {
      // Hae ravintolat ja lounaslistat suoraan Supabasesta
      const fetchedRestaurants = await getRestaurants();
      const ids = fetchedRestaurants.map((r: { id: string; }) => r.id);
      const menusByRestaurant = await getLatestMenusByRestaurant(ids);

      // Yhdistä lounaslistat ravintoloihin
      const merged = fetchedRestaurants.map((r: Restaurant) => ({
        ...r,
        menu_text: menusByRestaurant[r.id] ?? r.menu_text,
      }));

      setRestaurants(merged);
    } catch (error) {
      console.error("Error fetching restaurants or menus:", error);
      setRestaurants([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;

      if (pendingRef.current) {
        pendingRef.current = false;
        void fetchRestaurants();
      }
    }
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (isValidLat(lat) && isValidLng(lng)) {
          setUserLocation({ lat, lng });
        }
      },
      (err) => {
        console.warn("Sijaintia ei saatu:", err);
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 },
    );
    return () => {
      if (typeof watchId === "number")
        navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const safeRadiusKm = Number.isFinite(radiusKm) ? Math.max(0, radiusKm) : 0;
  const shownRestaurants =
    userLocation == null
      ? restaurants
      : restaurants.filter(
          (r) =>
            getDistanceKm(userLocation.lat, userLocation.lng, r.lat, r.lng) <
            safeRadiusKm,
        );

  return {
    restaurants: shownRestaurants,
    userLocation,
    loading,
    reload: fetchRestaurants,
  };
}
