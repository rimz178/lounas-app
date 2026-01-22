"use client";

import { useState, useEffect } from "react";

import RestaurantMap from "./Map";
import { supabase } from "../lib/supabaseClient";

export default function HomeClient() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | undefined
  >(undefined);
  const [restaurants, setRestaurants] = useState<any[]>([]);

  useEffect(() => {
    async function fetchRestaurants() {
      const { data, error } = await supabase.from("Ravintolat").select("*");
      if (!error) setRestaurants(data ?? []);
      if (error) console.error("Supabase error:", error);
    }
    fetchRestaurants();
  }, []);

  console.log("Ravintolat:", restaurants); // <-- Lisää tämä

  return (
    <>
      <RestaurantMap
        selectedRestaurantId={selectedRestaurantId}
        onSelectRestaurantId={setSelectedRestaurantId}
        restaurants={restaurants}
      />
    </>
  );
}
