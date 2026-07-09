import { Ionicons } from "@expo/vector-icons";
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useAuth } from "../context/AuthContext";
import { useLocation } from "../context/LocationContext";
import type {
  BottomTabParamList,
  RootStackParamList,
} from "../navigation/types";
import {
  AREA_BOUNDS,
  getDistanceKm,
  getMenuForRestaurant,
  getRestaurants,
  type ManualArea,
  type Restaurant,
} from "../services/restaurants";
import {
  getReviewStats,
  getReviewStatsBatch,
  getUserReviewsBatch,
  type ReviewStats,
  upsertReview,
} from "../services/reviews";

export default function ListScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<BottomTabParamList, "Lounaspaikat">>();
  const listRef = useRef<FlatList<Restaurant>>(null);
  const searchInputRef = useRef<TextInput | null>(null);
  const { isLoggedIn } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuCache, setMenuCache] = useState<Record<string, string | null>>({});
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [area, setArea] = useState<ManualArea>("kaikki");
  const { locationState, setLocationEnabled, requestLocation } = useLocation();

  // Review state
  const [reviewStats, setReviewStats] = useState<Record<string, ReviewStats>>(
    {},
  );
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [pendingRatings, setPendingRatings] = useState<Record<string, number>>(
    {},
  );
  const [pendingComments, setPendingComments] = useState<
    Record<string, string>
  >({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    if (!restaurants.length) return;
    const ids = restaurants.map((r) => r.id);
    getReviewStatsBatch(ids).then(setReviewStats);
  }, [restaurants]);

  useEffect(() => {
    if (!isLoggedIn || !restaurants.length) {
      setUserRatings({});
      setPendingRatings({});
      return;
    }
    const ids = restaurants.map((r) => r.id);
    getUserReviewsBatch(ids).then(setUserRatings);
  }, [isLoggedIn, restaurants]);

  function handleStarTap(restaurantId: string, rating: number) {
    setPendingRatings((prev) => ({ ...prev, [restaurantId]: rating }));
  }

  async function handleSaveReview(restaurantId: string) {
    const rating = pendingRatings[restaurantId];
    if (!rating) return;

    setSavingIds((prev) => new Set(prev).add(restaurantId));
    try {
      await upsertReview(
        restaurantId,
        rating,
        pendingComments[restaurantId] ?? "",
      );
      setUserRatings((prev) => ({ ...prev, [restaurantId]: rating }));
      setPendingRatings((prev) => {
        const next = { ...prev };
        delete next[restaurantId];
        return next;
      });
      setPendingComments((prev) => {
        const next = { ...prev };
        delete next[restaurantId];
        return next;
      });
      const updated = await getReviewStats(restaurantId);
      if (updated) {
        setReviewStats((prev) => ({ ...prev, [restaurantId]: updated }));
      }
    } catch {
      // ignore; user can try again
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(restaurantId);
        return next;
      });
    }
  }

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
        {(locationState.status === "denied" ||
          locationState.status === "disabled") && (
          <Pressable
            style={styles.chip}
            onPress={() => {
              if (locationState.status === "disabled") {
                setLocationEnabled(true);
                return;
              }

              void requestLocation();
            }}
          >
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
        renderItem={({ item }) => {
          const stats = reviewStats[item.id];
          const roundedAvg = stats ? Math.round(stats.average) : 0;
          const displayRating =
            pendingRatings[item.id] ?? userRatings[item.id] ?? 0;
          const hasPendingChange =
            pendingRatings[item.id] !== undefined &&
            pendingRatings[item.id] !== userRatings[item.id];
          const isSaving = savingIds.has(item.id);

          return (
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

              {stats ? (
                <View style={styles.statsRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Ionicons
                      key={n}
                      name={n <= roundedAvg ? "star" : "star-outline"}
                      size={13}
                      color={n <= roundedAvg ? "#f59e0b" : "#d1d5db"}
                    />
                  ))}
                  <Text style={styles.statsText}>
                    {stats.average.toFixed(1)} ({stats.count})
                  </Text>
                </View>
              ) : null}

              {isLoggedIn ? (
                <View style={styles.reviewSection}>
                  <View style={styles.starPickerRow}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Pressable
                        key={n}
                        onPress={() => handleStarTap(item.id, n)}
                        style={styles.starTap}
                      >
                        <Ionicons
                          name={n <= displayRating ? "star" : "star-outline"}
                          size={22}
                          color={n <= displayRating ? "#f59e0b" : "#d1d5db"}
                        />
                      </Pressable>
                    ))}
                  </View>
                  {hasPendingChange ? (
                    <>
                      <TextInput
                        style={styles.commentInput}
                        placeholder="Kommentti (valinnainen)"
                        placeholderTextColor="#9ca3af"
                        value={pendingComments[item.id] ?? ""}
                        onChangeText={(text) =>
                          setPendingComments((prev) => ({
                            ...prev,
                            [item.id]: text,
                          }))
                        }
                        multiline
                        numberOfLines={2}
                      />
                      <Pressable
                        style={({ pressed }) => [
                          styles.saveButton,
                          pressed && styles.pressedButton,
                          isSaving && styles.disabledButton,
                        ]}
                        onPress={() => void handleSaveReview(item.id)}
                        disabled={isSaving}
                      >
                        <Text style={styles.saveButtonText}>
                          {isSaving ? "..." : "Tallenna"}
                        </Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              ) : null}

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
          );
        }}
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
    marginBottom: 6,
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
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 8,
  },
  statsText: {
    fontSize: 11,
    color: "#6b7280",
    marginLeft: 3,
  },
  reviewSection: {
    marginBottom: 10,
    gap: 8,
  },
  starPickerRow: {
    flexDirection: "row",
    gap: 2,
  },
  starTap: {
    padding: 2,
  },
  commentInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#171717",
    textAlignVertical: "top",
  },
  saveButton: {
    alignSelf: "flex-start",
    backgroundColor: "#171717",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
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
  disabledButton: {
    opacity: 0.5,
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
