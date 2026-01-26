"use client";
import { useState } from "react";
import RestaurantMap from "./Map";
import { useNearbyRestaurants } from "../service/userNearbyRestaurant";

export default function HomeClient() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | undefined>(undefined);
  const { restaurants, userLocation } = useNearbyRestaurants(1000); 

  return (
    <RestaurantMap
      selectedRestaurantId={selectedRestaurantId}
      onSelectRestaurantId={setSelectedRestaurantId}
      restaurants={restaurants}
      userLocation={userLocation}
    />
  
  );
}
