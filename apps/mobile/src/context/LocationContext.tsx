import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { Alert } from "react-native";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Coords = { lat: number; lng: number };

type LocationState =
  | { status: "loading" }
  | { status: "disabled" }
  | { status: "denied" }
  | { status: "granted"; coords: Coords };

type LocationContextValue = {
  locationState: LocationState;
  isLocationEnabled: boolean;
  isLocationSettingLoaded: boolean;
  setLocationEnabled: (enabled: boolean) => void;
  requestLocation: () => Promise<void>;
};

const LocationContext = createContext<LocationContextValue | null>(null);
const LOCATION_ENABLED_KEY = "location_enabled";
const LOCATION_ONBOARDING_SHOWN_KEY = "location_onboarding_shown";

export function LocationProvider({ children }: { children: ReactNode }) {
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isLocationSettingLoaded, setIsLocationSettingLoaded] = useState(false);
  const [shouldShowOnboardingPrompt, setShouldShowOnboardingPrompt] =
    useState(false);
  const [locationState, setLocationState] = useState<LocationState>({
    status: "loading",
  });

  const requestLocation = useCallback(async () => {
    setLocationState({ status: "loading" });
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationState({ status: "denied" });
      return;
    }
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocationState({
        status: "granted",
        coords: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
      });
    } catch {
      setLocationState({ status: "denied" });
    }
  }, []);

  const setLocationEnabled = useCallback((enabled: boolean) => {
    setIsLocationEnabled(enabled);

    void AsyncStorage.setItem(LOCATION_ENABLED_KEY, enabled ? "true" : "false");

    if (!enabled) {
      setLocationState({ status: "disabled" });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSetting() {
      try {
        const [storedValue, onboardingShownValue] = await Promise.all([
          AsyncStorage.getItem(LOCATION_ENABLED_KEY),
          AsyncStorage.getItem(LOCATION_ONBOARDING_SHOWN_KEY),
        ]);

        if (cancelled) return;

        if (storedValue != null) {
          setIsLocationEnabled(storedValue === "true");
        } else {
          setIsLocationEnabled(false);
        }

        if (storedValue == null && onboardingShownValue !== "true") {
          setShouldShowOnboardingPrompt(true);
        }
      } catch {
        // Keep default value on read error.
      } finally {
        if (!cancelled) {
          setIsLocationSettingLoaded(true);
        }
      }
    }

    void loadSetting();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLocationSettingLoaded) {
      return;
    }

    if (isLocationEnabled) {
      void requestLocation();
      return;
    }

    setLocationState({ status: "disabled" });
  }, [isLocationEnabled, isLocationSettingLoaded, requestLocation]);

  useEffect(() => {
    if (!shouldShowOnboardingPrompt || !isLocationSettingLoaded) {
      return;
    }

    Alert.alert(
      "Sijainti käyttöön?",
      "Saako sovellus käyttää sijaintiasi lähellä olevien lounaspaikkojen näyttämiseen?",
      [
        {
          text: "Ei",
          style: "cancel",
          onPress: () => {
            setShouldShowOnboardingPrompt(false);
            setLocationEnabled(false);
            void AsyncStorage.setItem(LOCATION_ONBOARDING_SHOWN_KEY, "true");
          },
        },
        {
          text: "Kyllä",
          onPress: () => {
            setShouldShowOnboardingPrompt(false);
            setLocationEnabled(true);
            void AsyncStorage.setItem(LOCATION_ONBOARDING_SHOWN_KEY, "true");
          },
        },
      ],
      { cancelable: false },
    );
  }, [isLocationSettingLoaded, setLocationEnabled, shouldShowOnboardingPrompt]);

  return (
    <LocationContext.Provider
      value={{
        locationState,
        isLocationEnabled,
        isLocationSettingLoaded,
        setLocationEnabled,
        requestLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used inside LocationProvider");
  return ctx;
}
