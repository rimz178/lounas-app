import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MenuScreen from "../screens/MenuScreen";
import SettingsScreen from "../screens/SettingsScreen";
import type { RootStackParamList } from "./types";
import TabsNavigator from "./TabsNavigator";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Tabs"
        component={TabsNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Menu"
        component={MenuScreen}
        options={{ title: "Menu", headerBackTitle: "Takaisin" }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Asetukset", headerBackTitle: "Takaisin" }}
      />
    </Stack.Navigator>
  );
}
