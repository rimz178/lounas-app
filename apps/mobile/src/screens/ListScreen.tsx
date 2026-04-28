import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { type Restaurant, getRestaurants } from "../services/restaurants";

export default function ListScreen() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getRestaurants();
        setRestaurants(data);
      } catch (fetchError) {
        console.error("Failed to load restaurants", fetchError);
        setError("Ravintoloiden lataus epaonnistui.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
  },
  errorText: {
    color: "#991b1b",
    fontSize: 14,
    paddingHorizontal: 20,
  },
});
