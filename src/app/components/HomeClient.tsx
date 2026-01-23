"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import RestaurantMap from "./Map";

interface Restaurant {
  id: string;
  name: string;
}

export default function HomeClient() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | undefined
  >(undefined);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    async function fetchRestaurants() {
      const { data, error } = await supabase.from("ravintolat").select("*");
      if (!error) setRestaurants((data ?? []) as Restaurant[]);
      if (error) console.error("Supabase error:", error);
    }
    fetchRestaurants();
  }, []);

  return (
    <RestaurantMap
      selectedRestaurantId={selectedRestaurantId}
      onSelectRestaurantId={setSelectedRestaurantId}
      restaurants={restaurants}
    />
  );
}
