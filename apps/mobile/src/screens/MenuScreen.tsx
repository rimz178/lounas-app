import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { getMenuForRestaurant } from "../services/restaurants";
import type { RootStackParamList } from "../navigation/types";

export default function MenuScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "Menu">>();
  const { restaurantId, restaurantName, initialMenu } = route.params;

  const hasInitialMenuParam = initialMenu !== undefined;

  const [menuText, setMenuText] = useState<string | null>(initialMenu ?? null);
  const [loading, setLoading] = useState(!hasInitialMenuParam);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasInitialMenuParam) return;

    (async () => {
      try {
        const menu = await getMenuForRestaurant(restaurantId);
        setMenuText(menu);
        setError(null);
      } catch (fetchError) {
        console.error("Failed to load menu", fetchError);
        setMenuText(null);
        setError("Menun lataus epäonnistui.");
      } finally {
        setLoading(false);
      }
    })();
  }, [hasInitialMenuParam, restaurantId]);

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
