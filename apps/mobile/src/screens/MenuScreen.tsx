import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { getMenuForRestaurant } from "../services/restaurants";

type RouteParams = {
  restaurantId: string;
  restaurantName: string;
  initialMenu?: string | null;
};

export default function MenuScreen() {
  const route = useRoute();
  const { restaurantId, restaurantName, initialMenu } =
    route.params as RouteParams;

  const [menuText, setMenuText] = useState<string | null>(initialMenu ?? null);
  const [loading, setLoading] = useState(!initialMenu);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialMenu) return;

    (async () => {
      try {
        const menu = await getMenuForRestaurant(restaurantId);
        setMenuText(menu);
      } catch (fetchError) {
        console.error("Failed to load menu", fetchError);
        setError("Menun lataus epäonnistui.");
      } finally {
        setLoading(false);
      }
    })();
  }, [initialMenu, restaurantId]);

  const lines = useMemo(() => {
    if (!menuText) return [];
    return menuText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [menuText]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{restaurantName}</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#171717" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : lines.length > 0 ? (
        <View style={styles.menuCard}>
          {lines.map((line, index) => (
            <Text key={`${index}-${line}`} style={styles.menuLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>Ei lounastietoja saatavilla.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#171717",
    marginBottom: 16,
  },
  menuCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  menuLine: {
    color: "#1f2937",
    fontSize: 14,
    lineHeight: 21,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 14,
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 14,
  },
});
