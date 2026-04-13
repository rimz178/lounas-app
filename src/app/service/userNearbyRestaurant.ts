import { useCallback, useEffect, useRef, useState } from "react";
import { getLatestMenusByRestaurant, getRestaurants } from "./restaurants";
import { getReviewStatsByRestaurant } from "./reviews";

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

export type ManualArea = "helsinki" | "vantaa" | "espoo";

const AREA_CENTERS: Record<ManualArea, { lat: number; lng: number }> = {
  helsinki: { lat: 60.1699, lng: 24.9384 },
  vantaa: { lat: 60.2934, lng: 25.0378 },
  espoo: { lat: 60.2055, lng: 24.6559 },
};

const AREA_BOUNDS: Record<
  ManualArea,
  { minLat: number; maxLat: number; minLng: number; maxLng: number }
> = {
  // Broad city envelopes to avoid missing restaurants near municipal edges.
  helsinki: { minLat: 60.1000, maxLat: 60.3200, minLng: 24.7800, maxLng: 25.2200 },
  vantaa: { minLat: 60.1900, maxLat: 60.3800, minLng: 24.7800, maxLng: 25.2800 },
  espoo: { minLat: 60.1000, maxLat: 60.3400, minLng: 24.4500, maxLng: 24.9400 },
};

type NearbyRestaurantsOptions = {
  useLocation?: boolean;
  manualArea?: ManualArea;
  radiusKm?: number;
};

export function useNearbyRestaurants(options: NearbyRestaurantsOptions = {}) {
  const {
    useLocation = true,
    manualArea = "helsinki",
    radiusKm = 6,
  } = options;
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
      const fetchedRestaurants = await getRestaurants();
      const ids = fetchedRestaurants.map((r: { id: string }) => r.id);
      const [menusByRestaurant, reviewStats] = await Promise.all([
        getLatestMenusByRestaurant(ids),
        getReviewStatsByRestaurant(ids),
      ]);

      const merged = fetchedRestaurants.map((r: Restaurant) => ({
        ...r,
        menu_text: menusByRestaurant[r.id] ?? r.menu_text,
        averageRating: reviewStats[r.id]?.average,
        reviewCount: reviewStats[r.id]?.count ?? 0,
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
    if (!useLocation) {
      setUserLocation(null);
      return;
    }

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
  }, [useLocation]);

  const safeRadiusKm = Number.isFinite(radiusKm) ? Math.max(0, radiusKm) : 0;
  const manualCenter = AREA_CENTERS[manualArea];
  const manualBounds = AREA_BOUNDS[manualArea];

  const shownRestaurants = restaurants.filter((r) => {
    if (!isValidLat(r.lat) || !isValidLng(r.lng)) return false;

    if (useLocation) {
      if (userLocation == null) return true;
      return (
        getDistanceKm(userLocation.lat, userLocation.lng, r.lat, r.lng) <
        safeRadiusKm
      );
    }

    const insideManualBounds =
      r.lat >= manualBounds.minLat &&
      r.lat <= manualBounds.maxLat &&
      r.lng >= manualBounds.minLng &&
      r.lng <= manualBounds.maxLng;

    if (insideManualBounds) return true;

    // Fallback radius near city center for edge cases with slightly noisy coords.
    return (
      getDistanceKm(manualCenter.lat, manualCenter.lng, r.lat, r.lng) < 8
    );
  });

  return {
    restaurants: shownRestaurants,
    userLocation,
    loading,
    reload: fetchRestaurants,
  };
}
