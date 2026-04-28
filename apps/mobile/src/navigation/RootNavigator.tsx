import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MenuScreen from "../screens/MenuScreen";
import TabsNavigator from "./TabsNavigator";

const Stack = createNativeStackNavigator();

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
        options={{ title: "Menu" }}
      />
    </Stack.Navigator>
  );
}
