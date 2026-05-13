import { Ionicons } from "@expo/vector-icons";
import { Switch, StyleSheet, Text, View } from "react-native";
import { useLocation } from "../context/LocationContext";

export default function SettingsScreen() {
  const {
    isLocationEnabled,
    isLocationSettingLoaded,
    setLocationEnabled,
    requestLocation,
    locationState,
  } = useLocation();

  function handleLocationToggle(enabled: boolean) {
    if (!isLocationSettingLoaded) {
      return;
    }

    setLocationEnabled(enabled);
    if (enabled) {
      void requestLocation();
    }
  }

  const locationStatusText = !isLocationSettingLoaded
    ? "Ladataan asetuksia..."
    : isLocationEnabled
      ? locationState.status === "granted"
        ? "Sijainti on käytössä"
        : locationState.status === "loading"
          ? "Haetaan sijaintia..."
          : "Sijaintia ei ole sallittu"
      : "Sijainti pois päältä";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Asetukset</Text>
      <Text style={styles.subtitle}>
        Muokkaa sovelluksen toimintoja helposti.
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="location-outline" size={20} color="#171717" />
            <View>
              <Text style={styles.settingTitle}>Käytä sijaintia</Text>
              <Text style={styles.settingDescription}>
                Näytetään lähellä olevat lounaspaikat ja etäisyydet.
              </Text>
            </View>
          </View>
          <Switch
            value={isLocationEnabled && isLocationSettingLoaded}
            onValueChange={handleLocationToggle}
            disabled={!isLocationSettingLoaded}
            trackColor={{ false: "#d1d5db", true: "#86efac" }}
            thumbColor={isLocationEnabled ? "#15803d" : "#6b7280"}
          />
        </View>
        <Text style={styles.stateText}>{locationStatusText}</Text>
      </View>

      <View style={styles.cardMuted}>
        <Text style={styles.cardMutedTitle}>Tulossa myöhemmin</Text>
        <Text style={styles.cardMutedItem}>Ilmoitukset päivän lounaasta</Text>
        <Text style={styles.cardMutedItem}>Kielen valinta</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#171717",
  },
  subtitle: {
    marginTop: 6,
    color: "#4b5563",
    fontSize: 14,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  settingTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
  },
  settingDescription: {
    marginTop: 2,
    color: "#6b7280",
    fontSize: 12,
  },
  stateText: {
    marginTop: 10,
    color: "#374151",
    fontSize: 12,
    fontWeight: "500",
  },
  cardMuted: {
    marginTop: 14,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardMutedTitle: {
    color: "#6b7280",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: "700",
    marginBottom: 8,
  },
  cardMutedItem: {
    color: "#111827",
    fontSize: 14,
    marginBottom: 6,
  },
});
