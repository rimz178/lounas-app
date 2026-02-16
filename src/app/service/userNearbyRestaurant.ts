import { useCallback, useEffect, useState, useRef } from "react";
import { getLatestMenusByRestaurant } from "./restaurants";
import {
  getReviewStatsByRestaurant,
  getUserReviewsByRestaurant,
} from "./reviews";

import type { Restaurant } from "./types";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toNumber(value: unknown): number | null {
  if (isFiniteNumber(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isValidLat(lat: unknown): lat is number {
  return isFiniteNumber(lat) && lat >= -90 && lat <= 90;
}

function isValidLng(lng: unknown): lng is number {
  return isFiniteNumber(lng) && lng >= -180 && lng <= 180;
}

function toRestaurant(row: unknown): Restaurant | null {
  if (typeof row !== "object" || row === null) return null;
  const o = row as Record<string, unknown>;

  const id = typeof o.id === "string" ? o.id : null;
  const name = typeof o.name === "string" ? o.name : null;
  const url = typeof o.url === "string" ? o.url : "";

  const lat = toNumber(o.lat);
  const lng = toNumber(o.lng);
  const menu_text = typeof o.menu_text === "string" ? o.menu_text : undefined;

  if (!id || !name || lat === null || lng === null) return null;
  if (!isValidLat(lat) || !isValidLng(lng)) return null;

  return { id, name, lat, lng, url, menu_text };
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
      const response = await fetch(
        "https://clurtxpqwmekgicwusqs.supabase.co/functions/v1/refresh-lunches",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SUBASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ action: "getRestaurants" }),
        }
      );

      if (!response.ok) {
        console.warn("Supabase error:", response.statusText);
        setRestaurants([]);
        return;
      }

      const result = await response.json();
      const parsed = (result.data ?? [])
        .map(toRestaurant)
        .filter((r: Restaurant | null): r is Restaurant => r !== null);

      try {
        const ids = parsed.map((r: Restaurant) => r.id);
        const userId = ""; // Replace with actual user ID from auth or context

        const [menusByRestaurant, reviewStats, myReviewsArray] = await Promise.all([
          getLatestMenusByRestaurant(ids),
          getReviewStatsByRestaurant(ids),
          Promise.all(ids.map((id: string) => getUserReviewsByRestaurant(id, userId))),
        ]);

        const myReviews = Object.fromEntries(
          ids.map((id: string, index: number) => [id, myReviewsArray[index]])
        );

        const merged = parsed.map((r: Restaurant) => {
          const stats = reviewStats[r.id];
          const mine = myReviews[r.id];
          return {
            ...r,
            menu_text: menusByRestaurant[r.id] ?? r.menu_text,
            averageRating: stats?.average,
            reviewCount: stats?.count ?? 0,
            myRating: mine?.rating,
            myComment: mine?.comment ?? null,
          };
        });

        setRestaurants(merged);
      } catch (e) {
        console.warn("Menus or reviews fetch failed:", e);
        setRestaurants(parsed);
      }
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
