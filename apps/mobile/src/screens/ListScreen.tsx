import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  type Restaurant,
  type ManualArea,
  AREA_BOUNDS,
  getDistanceKm,
  getMenuForRestaurant,
  getRestaurants,
} from "../services/restaurants";
import type {
  RootStackParamList,
  BottomTabParamList,
} from "../navigation/types";
import { useLocation } from "../context/LocationContext";

export default function ListScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<BottomTabParamList, "Lounaspaikat">>();
  const listRef = useRef<FlatList<Restaurant>>(null);
  const searchInputRef = useRef<TextInput | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuCache, setMenuCache] = useState<Record<string, string | null>>({});
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [area, setArea] = useState<ManualArea>("kaikki");
  const { locationState, requestLocation } = useLocation();

  const resetListToTop = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    resetListToTop();
  }

  function handleAreaChange(value: ManualArea) {
    setArea(value);
    resetListToTop();
  }

  useEffect(() => {
    (async () => {
      try {
        const data = await getRestaurants();
        setRestaurants(data);
      } catch (fetchError) {
        console.error("Failed to load restaurants", fetchError);
        setError("Ravintoloiden lataus epäonnistui.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function openMenu(restaurant: Restaurant) {
    const cached = menuCache[restaurant.id];

    if (cached !== undefined) {
      navigation.navigate("Menu", {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        initialMenu: cached,
      });
      return;
    }

    try {
      const menu = await getMenuForRestaurant(restaurant.id);
      setMenuCache((prev) => ({ ...prev, [restaurant.id]: menu }));
      navigation.navigate("Menu", {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        initialMenu: menu,
      });
    } catch (menuError) {
      console.error("Failed to load menu for list item", menuError);
      navigation.navigate("Menu", {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
      });
    }
  }

  const filteredRestaurants = useMemo(() => {
    const userCoords =
      locationState.status === "granted" ? locationState.coords : null;

    let list = restaurants;

    // Area filter
    if (area !== "kaikki") {
      const bounds = AREA_BOUNDS[area];
      list = list.filter(
        (r) =>
          r.lat != null &&
          r.lng != null &&
          r.lat >= bounds.minLat &&
          r.lat <= bounds.maxLat &&
          r.lng >= bounds.minLng &&
          r.lng <= bounds.maxLng,
      );
    }

    // Search filter
    const q = query.trim().toLocaleLowerCase("fi-FI");
    if (q) {
      list = list.filter((r) => r.name.toLocaleLowerCase("fi-FI").includes(q));
    }

    // Sort by distance
    if (userCoords) {
      list = [...list].sort((a, b) => {
        const da =
          a.lat != null && a.lng != null
            ? getDistanceKm(userCoords.lat, userCoords.lng, a.lat, a.lng)
            : Number.POSITIVE_INFINITY;
        const db =
          b.lat != null && b.lng != null
            ? getDistanceKm(userCoords.lat, userCoords.lng, b.lat, b.lng)
            : Number.POSITIVE_INFINITY;
        return da - db;
      });
    }

    return list;
  }, [restaurants, area, query, locationState]);

  useEffect(() => {
    if (!loading) {
      resetListToTop();
    }
  }, [loading, resetListToTop]);

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

    resetListToTop();
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [isSearchOpen, resetListToTop]);

  const listHeader = (
    <>
      {isSearchOpen ? (
        <View style={styles.searchRow}>
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Hae ravintolaa..."
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {(["kaikki", "helsinki", "espoo", "vantaa"] as ManualArea[]).map(
          (a) => (
            <Pressable
              key={a}
              style={[styles.chip, area === a && styles.chipActive]}
              onPress={() => handleAreaChange(a)}
            >
              <Text
                style={[styles.chipText, area === a && styles.chipTextActive]}
              >
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </Text>
            </Pressable>
          ),
        )}
        {locationState.status === "denied" && (
          <Pressable style={styles.chip} onPress={() => void requestLocation()}>
            <Text style={styles.chipText}>Salli sijainti</Text>
          </Pressable>
        )}
      </ScrollView>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        style={styles.listView}
        data={loading || error ? [] : filteredRestaurants}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#171717" />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.emptyText}>Ei ravintoloita valinnalla.</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.name}</Text>
              {locationState.status === "granted" &&
                item.lat != null &&
                item.lng != null && (
                  <Text style={styles.distance}>
                    {getDistanceKm(
                      locationState.coords.lat,
                      locationState.coords.lng,
                      item.lat,
                      item.lng,
                    ).toFixed(1)}{" "}
                    km
                  </Text>
                )}
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.menuButton,
                pressed && styles.pressedButton,
              ]}
              onPress={() => {
                void openMenu(item);
              }}
            >
              <Text style={styles.menuButtonText}>Avaa menu</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#171717",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  chipsRow: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 36,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipActive: {
    backgroundColor: "#171717",
    borderColor: "#171717",
  },
  chipText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#fff",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
    flexGrow: 1,
  },
  listView: {
    flex: 1,
  },
  cardSeparator: {
    height: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#171717",
    flex: 1,
    marginRight: 8,
  },
  distance: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  menuButton: {
    alignSelf: "flex-start",
    backgroundColor: "#171717",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  pressedButton: {
    opacity: 0.85,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 14,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 12,
    paddingHorizontal: 20,
  },
});
