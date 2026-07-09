import { Ionicons } from "@expo/vector-icons";
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/types";
import { getMenuForRestaurant } from "../services/restaurants";
import {
  deleteUserReview,
  getReviewStats,
  getUserReview,
  type ReviewStats,
  upsertReview,
} from "../services/reviews";

export default function MenuScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "Menu">>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { restaurantId, restaurantName, initialMenu } = route.params;
  const { isLoggedIn } = useAuth();

  const hasInitialMenuParam = initialMenu !== undefined;
  const [menuText, setMenuText] = useState<string | null>(initialMenu ?? null);
  const [loading, setLoading] = useState(!hasInitialMenuParam);
  const [error, setError] = useState<string | null>(null);

  // Review state
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

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

  useEffect(() => {
    getReviewStats(restaurantId).then(setReviewStats);
  }, [restaurantId]);

  async function handleOpenReviewForm() {
    setRating(5);
    setComment("");
    setReviewError(null);
    setHasExistingReview(false);

    const existing = await getUserReview(restaurantId);
    if (existing) {
      setRating(existing.rating);
      setComment(existing.comment ?? "");
      setHasExistingReview(true);
    }
    setReviewFormOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setReviewError(null);
    try {
      await upsertReview(restaurantId, rating, comment);
      const updated = await getReviewStats(restaurantId);
      setReviewStats(updated);
      setReviewFormOpen(false);
    } catch {
      setReviewError("Tallennus epäonnistui. Yritä uudelleen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setSubmitting(true);
    setReviewError(null);
    try {
      await deleteUserReview(restaurantId);
      const updated = await getReviewStats(restaurantId);
      setReviewStats(updated);
      setReviewFormOpen(false);
    } catch {
      setReviewError("Poisto epäonnistui. Yritä uudelleen.");
    } finally {
      setSubmitting(false);
    }
  }

  const lines = useMemo(() => {
    if (!menuText) return [];
    return menuText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [menuText]);

  const roundedAvg = reviewStats ? Math.round(reviewStats.average) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{restaurantName}</Text>

      {/* Menu content */}
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

      {/* Review section */}
      <View style={styles.reviewSection}>
        <Text style={styles.reviewTitle}>Arvostelut</Text>

        {reviewStats ? (
          <View style={styles.statsRow}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons
                  key={n}
                  name={n <= roundedAvg ? "star" : "star-outline"}
                  size={18}
                  color={n <= roundedAvg ? "#f59e0b" : "#d1d5db"}
                />
              ))}
            </View>
            <Text style={styles.statsText}>
              {reviewStats.average.toFixed(1)} ({reviewStats.count}{" "}
              {reviewStats.count === 1 ? "arvostelu" : "arvostelua"})
            </Text>
          </View>
        ) : (
          <Text style={styles.noReviewsText}>Ei arvosteluja vielä</Text>
        )}

        {isLoggedIn ? (
          reviewFormOpen ? (
            <View style={styles.reviewForm}>
              {/* Star picker */}
              <View style={styles.starPicker}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setRating(n)}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={n <= rating ? "star" : "star-outline"}
                      size={32}
                      color={n <= rating ? "#f59e0b" : "#d1d5db"}
                    />
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={styles.commentInput}
                placeholder="Kommentti (valinnainen)"
                placeholderTextColor="#9ca3af"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
              />

              {reviewError ? (
                <Text style={styles.reviewErrorText}>{reviewError}</Text>
              ) : null}

              <View style={styles.formButtons}>
                <Pressable
                  style={({ pressed }) => [
                    styles.submitButton,
                    pressed && styles.buttonPressed,
                    submitting && styles.buttonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  <Text style={styles.submitButtonText}>
                    {submitting ? "..." : "Tallenna"}
                  </Text>
                </Pressable>

                {hasExistingReview ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.buttonPressed,
                      submitting && styles.buttonDisabled,
                    ]}
                    onPress={handleDelete}
                    disabled={submitting}
                  >
                    <Text style={styles.deleteButtonText}>Poista</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => setReviewFormOpen(false)}
                >
                  <Text style={styles.cancelButtonText}>Peruuta</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.reviewButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleOpenReviewForm}
            >
              <Text style={styles.reviewButtonText}>
                {hasExistingReview ? "Muokkaa arvostelua" : "Jätä arvostelu"}
              </Text>
            </Pressable>
          )
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.loginPrompt,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate("Login")}
          >
            <Ionicons name="log-in-outline" size={16} color="#171717" />
            <Text style={styles.loginPromptText}>
              Kirjaudu sisään arvostellaksesi
            </Text>
          </Pressable>
        )}
      </View>
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
    paddingBottom: 40,
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
  reviewSection: {
    marginTop: 24,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#171717",
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  statsText: {
    fontSize: 13,
    color: "#6b7280",
  },
  noReviewsText: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 12,
  },
  reviewForm: {
    marginTop: 8,
    gap: 10,
  },
  starPicker: {
    flexDirection: "row",
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
  commentInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#171717",
    textAlignVertical: "top",
  },
  reviewErrorText: {
    color: "#991b1b",
    fontSize: 12,
  },
  formButtons: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  submitButton: {
    backgroundColor: "#171717",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  reviewButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reviewButtonText: {
    color: "#171717",
    fontSize: 14,
    fontWeight: "600",
  },
  loginPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  loginPromptText: {
    color: "#171717",
    fontSize: 14,
    fontWeight: "500",
  },
});
