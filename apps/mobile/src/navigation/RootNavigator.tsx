import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import MenuScreen from "../screens/MenuScreen";
import SettingsScreen from "../screens/SettingsScreen";
import TabsNavigator from "./TabsNavigator";
import type { RootStackParamList } from "./types";

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
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: "Kirjaudu sisään",
          headerBackTitle: "Takaisin",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
