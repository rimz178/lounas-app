"use client";

import { useState } from "react";

import RestaurantMap from "./Map";
import RestaurantList from "./RestaurantList";

export default function HomeClient() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | undefined
  >(undefined);

  return (
    <>
      <RestaurantMap
        selectedRestaurantId={selectedRestaurantId}
        onSelectRestaurantId={setSelectedRestaurantId}
      />

      <RestaurantList
        selectedRestaurantId={selectedRestaurantId}
        onSelectRestaurantId={setSelectedRestaurantId}
      />
    </>
  );
}
