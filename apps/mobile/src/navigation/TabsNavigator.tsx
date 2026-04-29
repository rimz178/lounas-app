import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import ListScreen from "../screens/ListScreen";
import MapScreen from "../screens/MapScreen";
import { Text, View } from "react-native";

function ProfileScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Profiili</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();

export default function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#171717",
        tabBarInactiveTintColor: "#8e8e93",
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === "Lista"
              ? "list"
              : route.name === "Kartta"
                ? "map"
                : "person";

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Lista"
        component={ListScreen}
        options={{ unmountOnBlur: true }}
      />
      <Tab.Screen name="Kartta" component={MapScreen} />
      <Tab.Screen name="Profiili" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
