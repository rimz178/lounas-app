import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getLatestMenusByRestaurant } from "./restaurants";
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

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("ravintolat").select("*");
    if (error || !Array.isArray(data)) {
      console.warn("Supabase error:", error?.message);
      setRestaurants([]);
      setLoading(false);
      return;
    }

    const parsed = (data ?? [])
      .map(toRestaurant)
      .filter((r): r is Restaurant => r !== null);

    try {
      const ids = parsed.map((r) => r.id);
      const menusByRestaurant = await getLatestMenusByRestaurant(ids);
      const merged = parsed.map((r) => ({
        ...r,
        menu_text: menusByRestaurant[r.id] ?? r.menu_text,
      }));
      setRestaurants(merged);
    } catch (e) {
      console.warn("Menus fetch failed:", e);
      setRestaurants(parsed);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    const channel = supabase
      .channel("lounas-app-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ravintolat" },
        (payload) => {
          console.log("ravintolat INSERT:", payload);
          fetchRestaurants().catch((err) => {
            console.error("Error fetching restaurants after INSERT:", err);
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ravintolat" },
        (payload) => {
          console.log("ravintolat UPDATE:", payload);
          fetchRestaurants().catch((err) => {
            console.error("Error fetching restaurants after UPDATE:", err);
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "ravintolat" },
        (payload) => {
          console.log("ravintolat DELETE:", payload);
          fetchRestaurants().catch((err) => {
            console.error("Error fetching restaurants after DELETE:", err);
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "menus" },
        (payload) => {
          console.log("menus INSERT:", payload);
          fetchRestaurants().catch((err) => {
            console.error(
              "Error fetching restaurants after menus INSERT:",
              err,
            );
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "menus" },
        (payload) => {
          console.log("menus UPDATE:", payload);
          fetchRestaurants().catch((err) => {
            console.error(
              "Error fetching restaurants after menus UPDATE:",
              err,
            );
          });
        },
      )
      .subscribe((status) => {
        console.log("Realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
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
