import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ListScreen from "../screens/ListScreen";
import MapScreen from "../screens/MapScreen";
import type { BottomTabParamList } from "./types";

const DRAWER_WIDTH = 240;

const TAB_ITEMS: {
  label: string;
  icon: "map" | "list";
  screen: keyof BottomTabParamList;
}[] = [
  { label: "Kartta", icon: "map", screen: "Kartta" },
  { label: "Lounaspaikat", icon: "list", screen: "Lounaspaikat" },
];

type AppBarProps = {
  navigation: {
    navigate: (screen: string, params?: object) => void;
  };
  route: { name: string };
};

function AppBar({ navigation, route }: AppBarProps) {
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  function openDrawer() {
    setDrawerOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }

  function closeDrawer(callback?: () => void) {
    Animated.timing(slideAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setDrawerOpen(false);
      callback?.();
    });
  }

  function navigateTo(screen: keyof BottomTabParamList) {
    closeDrawer(() => navigation.navigate(screen));
  }

  return (
    <>
      <View style={[styles.appBar, { paddingTop: insets.top }]}>
        <Pressable
          accessibilityLabel="Avaa valikko"
          accessibilityRole="button"
          onPress={openDrawer}
          style={styles.iconButton}
        >
          <Ionicons name="menu" size={22} color="#171717" />
        </Pressable>

        <Text style={styles.title}>Lounas tänään</Text>

        <Pressable
          accessibilityLabel="Hae ravintoloita"
          accessibilityRole="button"
          onPress={() => {
            navigation.navigate(route.name, { openSearchAt: Date.now() });
          }}
          style={styles.iconButton}
        >
          <Ionicons name="search" size={20} color="#171717" />
        </Pressable>
      </View>

      <Modal
        visible={drawerOpen}
        transparent
        animationType="none"
        onRequestClose={() => closeDrawer()}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={() => closeDrawer()} />
          <Animated.View
            style={[
              styles.drawer,
              {
                paddingTop: insets.top,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <Text style={styles.drawerTitle}>Näkymä</Text>
            {TAB_ITEMS.map((item) => (
              <Pressable
                key={item.screen}
                style={({ pressed }) => [
                  styles.drawerItem,
                  route.name === item.screen && styles.drawerItemActive,
                  pressed && styles.drawerItemPressed,
                ]}
                onPress={() => navigateTo(item.screen)}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={route.name === item.screen ? "#fff" : "#171717"}
                />
                <Text
                  style={[
                    styles.drawerItemText,
                    route.name === item.screen && styles.drawerItemTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: (props) => <AppBar {...props} />,
        tabBarActiveTintColor: "#171717",
        tabBarInactiveTintColor: "#8e8e93",
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={route.name === "Kartta" ? "map" : "list"}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Kartta" component={MapScreen} />
      <Tab.Screen
        name="Lounaspaikat"
        component={ListScreen}
        options={{ title: "Lounaspaikat" }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  appBar: {
    alignItems: "center",
    backgroundColor: "#fff",
    flexDirection: "row",
    width: "100%",
    minHeight: 56,
    borderBottomColor: "#e5e7eb",
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  title: {
    flex: 1,
    color: "#171717",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
  },
  modalOverlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 4, height: 0 },
    elevation: 8,
  },
  drawerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  drawerItemActive: {
    backgroundColor: "#171717",
  },
  drawerItemPressed: {
    opacity: 0.7,
  },
  drawerItemText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#171717",
  },
  drawerItemTextActive: {
    color: "#fff",
  },
});
