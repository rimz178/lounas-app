import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigator from "./src/navigation/RootNavigator";
import { LocationProvider } from "./src/context/LocationContext";

export default function App() {
  return (
    <LocationProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </LocationProvider>
  );
}
