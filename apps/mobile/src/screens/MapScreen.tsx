import { useEffect, useMemo, useRef, useState } from "react";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import {
  type Restaurant,
  getMenuForRestaurant,
  getRestaurants,
} from "../services/restaurants";
import type { RootStackParamList, TopTabParamList } from "../navigation/types";
import { useLocation } from "../context/LocationContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CoordinateRestaurant = Restaurant & { lat: number; lng: number };

const HELSINKI_REGION = {
  latitude: 60.1699,
  longitude: 24.9384,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const { width: screenWidth } = Dimensions.get("window");

function isValidLatitude(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidLongitude(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function extractDailyHighlight(menuText: string | null): string {
  if (!menuText) return "Ei lounastietoja saatavilla.";

  const lines = menuText
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^[-*•]\s*/, "")
        .replace(/^\d+[.)]\s*/, ""),
    )
    .filter(Boolean);

  const headingPattern =
    /^(maanantai|tiistai|keskiviikko|torstai|perjantai|lauantai|sunnuntai|ma|ti|ke|to|pe|la|su|ma-pe|ma\s*-\s*pe|today|tanaan|tänään)\b/i;

  const firstItem = lines.find((line) => !headingPattern.test(line));
  if (!firstItem) return "Ei lounastietoja saatavilla.";

  return firstItem;
}

export default function MapScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<TopTabParamList, "Kartta">>();
  const insets = useSafeAreaInsets();
  const { locationState, requestLocation } = useLocation();
  const mapRef = useRef<MapView | null>(null);
  const searchInputRef = useRef<TextInput | null>(null);
  const pendingCenterOnUserRef = useRef(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<CoordinateRestaurant | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuCache, setMenuCache] = useState<Record<string, string | null>>({});
  const menuRequestIdRef = useRef(0);
  const selectedRestaurantIdRef = useRef<string | null>(null);

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

  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fi-FI");
    if (!normalizedQuery) return restaurantsWithCoordinates;

    return restaurantsWithCoordinates.filter((restaurant) =>
      restaurant.name.toLocaleLowerCase("fi-FI").includes(normalizedQuery),
    );
  }, [restaurantsWithCoordinates, query]);

  useEffect(() => {
    if (!selectedRestaurant) return;

    const stillVisible = filteredRestaurants.some(
      (restaurant) => restaurant.id === selectedRestaurant.id,
    );

    if (!stillVisible) {
      selectedRestaurantIdRef.current = null;
      menuRequestIdRef.current += 1;
      setSelectedRestaurant(null);
      setSelectedMenu(null);
      setMenuLoading(false);
    }
  }, [filteredRestaurants, selectedRestaurant]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery || !mapRef.current) return;

    const firstMatch = filteredRestaurants[0];
    if (!firstMatch) return;

    mapRef.current.animateToRegion(
      {
        latitude: firstMatch.lat,
        longitude: firstMatch.lng,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      450,
    );
  }, [query, filteredRestaurants]);

  useEffect(() => {
    if (
      pendingCenterOnUserRef.current &&
      locationState.status === "granted" &&
      mapRef.current
    ) {
      pendingCenterOnUserRef.current = false;
      mapRef.current.animateToRegion(
        {
          latitude: locationState.coords.lat,
          longitude: locationState.coords.lng,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        450,
      );
    }

    if (locationState.status === "denied") {
      pendingCenterOnUserRef.current = false;
    }
  }, [locationState]);

  useEffect(() => {
    if (!route.params?.openSearchAt) {
      return;
    }

    setIsSearchOpen((prev) => !prev);
  }, [route.params?.openSearchAt]);

  useEffect(() => {
    if (!isSearchOpen) {
      setQuery("");
      return;
    }

    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [isSearchOpen]);

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
    selectedRestaurantIdRef.current = restaurant.id;
    setSelectedRestaurant(restaurant);
    setSelectedMenu(null);

    const cachedMenu = menuCache[restaurant.id];
    if (cachedMenu !== undefined) {
      setMenuLoading(false);
      setSelectedMenu(cachedMenu);
      return;
    }

    const requestId = menuRequestIdRef.current + 1;
    menuRequestIdRef.current = requestId;

    setMenuLoading(true);
    try {
      const menuText = await getMenuForRestaurant(restaurant.id);

      if (
        requestId !== menuRequestIdRef.current ||
        selectedRestaurantIdRef.current !== restaurant.id
      ) {
        return;
      }

      setMenuCache((prev) => ({ ...prev, [restaurant.id]: menuText }));
      setSelectedMenu(menuText);
    } catch (menuError) {
      if (
        requestId !== menuRequestIdRef.current ||
        selectedRestaurantIdRef.current !== restaurant.id
      ) {
        return;
      }

      console.error("Failed to load restaurant menu", menuError);
      setSelectedMenu(null);
    } finally {
      if (
        requestId === menuRequestIdRef.current &&
        selectedRestaurantIdRef.current === restaurant.id
      ) {
        setMenuLoading(false);
      }
    }
  }

  async function openUrl(url: string) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) return;
      await Linking.openURL(url);
    } catch (openUrlError) {
      console.error("Failed to open URL", openUrlError);
    }
  }

  function openDirections(restaurant: CoordinateRestaurant) {
    const destination = `${restaurant.lat},${restaurant.lng}`;
    const mapsUrl =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?daddr=${destination}`
        : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

    void openUrl(mapsUrl);
  }

  function centerOnUser() {
    if (locationState.status === "granted" && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: locationState.coords.lat,
          longitude: locationState.coords.lng,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        450,
      );
      return;
    }

    pendingCenterOnUserRef.current = true;
    void requestLocation();
  }

  const selectedCachedMenu = selectedRestaurant
    ? menuCache[selectedRestaurant.id]
    : undefined;

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#171717" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={locationState.status === "granted"}
          showsMyLocationButton={false}
        >
          {filteredRestaurants.map((restaurant) => (
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

          {locationState.status === "granted" ? (
            <Marker
              coordinate={{
                latitude: locationState.coords.lat,
                longitude: locationState.coords.lng,
              }}
              title="Sijaintisi"
              pinColor="#2563eb"
            />
          ) : null}
        </MapView>
      )}

      {!loading && !error ? (
        <View
          style={[
            styles.mapTopControls,
            {
              top: insets.top + (Platform.OS === "android" ? 14 : 8),
            },
          ]}
        >
          <View style={styles.topButtonsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.topButton,
                pressed && styles.pressedButton,
              ]}
              onPress={centerOnUser}
            >
              <Text style={styles.topButtonText}>Sijainti</Text>
            </Pressable>
          </View>

          {isSearchOpen ? (
            <TextInput
              ref={searchInputRef}
              style={styles.mapSearchInput}
              placeholder="Hae kartalta..."
              placeholderTextColor="#9ca3af"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          ) : null}
        </View>
      ) : null}

      {selectedRestaurant && !loading && !error ? (
        <View style={styles.detailCard}>
          <View style={styles.detailHeaderRow}>
            <Text style={styles.detailTitle}>{selectedRestaurant.name}</Text>
            <Pressable
              onPress={() => {
                selectedRestaurantIdRef.current = null;
                menuRequestIdRef.current += 1;
                setSelectedRestaurant(null);
                setSelectedMenu(null);
                setMenuLoading(false);
              }}
              hitSlop={8}
            >
              <Text style={styles.closeText}>Sulje</Text>
            </Pressable>
          </View>

          {menuLoading ? (
            <ActivityIndicator size="small" color="#171717" />
          ) : (
            <>
              <Text style={styles.highlightLabel}>Päivän nosto</Text>
              <Text style={styles.highlightText} numberOfLines={3}>
                {extractDailyHighlight(selectedMenu)}
              </Text>
              <Text style={styles.menuText} numberOfLines={4}>
                {selectedMenu?.trim() || "Ei lounastietoja saatavilla."}
              </Text>
            </>
          )}

          <View style={styles.actionRow}>
            <Pressable
              disabled={menuLoading}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && !menuLoading && styles.pressedButton,
                menuLoading && styles.disabledButton,
              ]}
              onPress={() => {
                navigation.navigate("Menu", {
                  restaurantId: selectedRestaurant.id,
                  restaurantName: selectedRestaurant.name,
                  ...(selectedCachedMenu !== undefined
                    ? { initialMenu: selectedCachedMenu }
                    : {}),
                });
              }}
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
  mapTopControls: {
    position: "absolute",
    right: 12,
    left: 12,
    alignItems: "flex-end",
  },
  topButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  topButton: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  topButtonActive: {
    backgroundColor: "#171717",
    borderColor: "#171717",
  },
  topButtonText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "600",
  },
  topButtonTextActive: {
    color: "#ffffff",
  },
  mapSearchInput: {
    marginTop: 8,
    width: Math.min(320, Math.max(250, screenWidth * 0.72)),
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#111827",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
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
  highlightLabel: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  highlightText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginBottom: 8,
  },
  menuText: {
    color: "#374151",
    fontSize: 12,
    lineHeight: 18,
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
    opacity: 0.5,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 14,
    paddingHorizontal: 20,
    textAlign: "center",
  },
});
