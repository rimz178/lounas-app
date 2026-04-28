import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { type Restaurant, getRestaurants } from "../services/restaurants";

type CoordinateRestaurant = Restaurant & { lat: number; lng: number };

const HELSINKI_REGION = {
  latitude: 60.1699,
  longitude: 24.9384,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

function isValidLatitude(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidLongitude(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export default function MapScreen() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getRestaurants();
        setRestaurants(data);
      } catch (fetchError) {
        console.error("Failed to load restaurants for map", fetchError);
        setError("Kartan lataus epäonnistui.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const restaurantsWithCoordinates = useMemo(
    () =>
      restaurants.filter(
        (restaurant): restaurant is CoordinateRestaurant =>
          isValidLatitude(restaurant.lat) && isValidLongitude(restaurant.lng),
      ),
    [restaurants],
  );

  const initialRegion =
    restaurantsWithCoordinates.length > 0
      ? {
          latitude: restaurantsWithCoordinates[0].lat,
          longitude: restaurantsWithCoordinates[0].lng,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        }
      : HELSINKI_REGION;

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#171717" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <MapView style={styles.map} initialRegion={initialRegion}>
          {restaurantsWithCoordinates.map((restaurant) => (
            <Marker
              key={restaurant.id}
              coordinate={{
                latitude: restaurant.lat,
                longitude: restaurant.lng,
              }}
              title={restaurant.name}
            />
          ))}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  map: {
    flex: 1,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 14,
    paddingHorizontal: 20,
    textAlign: "center",
  },
});
