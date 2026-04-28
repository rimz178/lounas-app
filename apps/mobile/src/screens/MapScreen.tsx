import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import {
  type Restaurant,
  getMenuForRestaurant,
  getRestaurants,
} from "../services/restaurants";

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
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<CoordinateRestaurant | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuCache, setMenuCache] = useState<Record<string, string | null>>({});

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

  async function handleSelectRestaurant(restaurant: CoordinateRestaurant) {
    setSelectedRestaurant(restaurant);

    if (menuCache[restaurant.id] !== undefined) {
      setSelectedMenu(menuCache[restaurant.id]);
      return;
    }

    setMenuLoading(true);
    try {
      const menuText = await getMenuForRestaurant(restaurant.id);
      setMenuCache((prev) => ({ ...prev, [restaurant.id]: menuText }));
      setSelectedMenu(menuText);
    } catch (menuError) {
      console.error("Failed to load restaurant menu", menuError);
      setSelectedMenu(null);
    } finally {
      setMenuLoading(false);
    }
  }

  async function openUrl(url: string) {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) return;
    await Linking.openURL(url);
  }

  function openDirections(restaurant: CoordinateRestaurant) {
    const destination = `${restaurant.lat},${restaurant.lng}`;
    const mapsUrl =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?daddr=${destination}`
        : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

    void openUrl(mapsUrl);
  }

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
              onPress={() => {
                void handleSelectRestaurant(restaurant);
              }}
            />
          ))}
        </MapView>
      )}
      {selectedRestaurant && !loading && !error ? (
        <View style={styles.detailCard}>
          <View style={styles.detailHeaderRow}>
            <Text style={styles.detailTitle}>{selectedRestaurant.name}</Text>
            <Pressable
              onPress={() => {
                setSelectedRestaurant(null);
                setSelectedMenu(null);
              }}
              hitSlop={8}
            >
              <Text style={styles.closeText}>Sulje</Text>
            </Pressable>
          </View>

          {menuLoading ? (
            <ActivityIndicator size="small" color="#171717" />
          ) : (
            <Text style={styles.menuText} numberOfLines={5}>
              {selectedMenu?.trim() || "Ei lounastietoja saatavilla."}
            </Text>
          )}

          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                !selectedRestaurant.url && styles.disabledButton,
                pressed && styles.pressedButton,
              ]}
              onPress={() => {
                if (!selectedRestaurant.url) return;
                void openUrl(selectedRestaurant.url);
              }}
              disabled={!selectedRestaurant.url}
            >
              <Text style={styles.actionButtonText}>Avaa menu</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.pressedButton,
              ]}
              onPress={() => openDirections(selectedRestaurant)}
            >
              <Text style={styles.actionButtonText}>Reitti</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
  detailCard: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 16,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  detailHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#171717",
    paddingRight: 8,
  },
  closeText: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "600",
  },
  menuText: {
    color: "#374151",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#171717",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  pressedButton: {
    opacity: 0.85,
  },
  disabledButton: {
    opacity: 0.45,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 14,
    paddingHorizontal: 20,
    textAlign: "center",
  },
});
