import { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  type Restaurant,
  getMenuForRestaurant,
  getRestaurants,
} from "../services/restaurants";

type RootStackParamList = {
  Tabs: undefined;
  Menu: {
    restaurantId: string;
    restaurantName: string;
    initialMenu?: string | null;
  };
};

export default function ListScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuCache, setMenuCache] = useState<Record<string, string | null>>({});

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

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Lounas</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#171717" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 60,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#171717",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
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
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#171717",
    marginBottom: 10,
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
  },
});
