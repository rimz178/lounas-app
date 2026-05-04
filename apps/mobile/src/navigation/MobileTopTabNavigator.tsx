import { Ionicons } from "@expo/vector-icons";
import {
  type MaterialTopTabBarProps,
  createMaterialTopTabNavigator,
} from "@react-navigation/material-top-tabs";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ListScreen from "../screens/ListScreen";
import MapScreen from "../screens/MapScreen";
import type { TopTabParamList } from "./types";

const Tab = createMaterialTopTabNavigator<TopTabParamList>();

function TopTabBarWithSearch(props: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRoute = props.state.routes[props.state.index];

  function openViewMenu() {
    Alert.alert("Valitse näkymä", "", [
      {
        text: "Lista",
        onPress: () => props.navigation.navigate("Lista"),
      },
      {
        text: "Kartta",
        onPress: () => props.navigation.navigate("Kartta"),
      },
      {
        text: "Peruuta",
        style: "cancel",
      },
    ]);
  }

  return (
    <View
      style={[
        styles.appBar,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <Pressable
        accessibilityLabel="Avaa valikko"
        accessibilityRole="button"
        onPress={openViewMenu}
        style={styles.iconButton}
      >
        <Ionicons name="menu" size={22} color="#171717" />
      </Pressable>

      <Text style={styles.title}>Lounas tänään</Text>

      <Pressable
        accessibilityLabel="Hae ravintoloita"
        accessibilityRole="button"
        onPress={() => {
          props.navigation.navigate(
            activeRoute.name,
            { openSearchAt: Date.now() },
            { merge: true },
          );
        }}
        style={styles.iconButton}
      >
        <Ionicons name="search" size={20} color="#171717" />
      </Pressable>
    </View>
  );
}

export default function MobileTopTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TopTabBarWithSearch {...props} />}
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
      }}
    >
      <Tab.Screen
        name="Lista"
        component={ListScreen}
        options={{ title: "Lista" }}
      />
      <Tab.Screen
        name="Kartta"
        component={MapScreen}
        options={{ title: "Kartta" }}
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
});
