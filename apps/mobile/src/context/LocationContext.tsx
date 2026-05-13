import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
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
  setLocationEnabled: (enabled: boolean) => void;
  requestLocation: () => Promise<void>;
};

const LocationContext = createContext<LocationContextValue | null>(null);
const LOCATION_ENABLED_KEY = "location_enabled";

export function LocationProvider({ children }: { children: ReactNode }) {
  const [isLocationEnabled, setIsLocationEnabled] = useState<boolean | null>(
    null,
  );
  const [locationState, setLocationState] = useState<LocationState>({
    status: "loading",
  });

  const requestLocation = useCallback(async () => {
    if (isLocationEnabled !== true) {
      setLocationState({ status: "disabled" });
      return;
    }

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
  }, [isLocationEnabled]);

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
        const storedValue = await AsyncStorage.getItem(LOCATION_ENABLED_KEY);
        if (cancelled) return;

        if (storedValue == null) {
          setIsLocationEnabled(true);
          return;
        }

        setIsLocationEnabled(storedValue === "true");
      } catch {
        if (!cancelled) {
          setIsLocationEnabled(true);
        }
      }
    }

    void loadSetting();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLocationEnabled == null) {
      return;
    }

    if (isLocationEnabled) {
      void requestLocation();
      return;
    }

    setLocationState({ status: "disabled" });
  }, [isLocationEnabled, requestLocation]);

  return (
    <LocationContext.Provider
      value={{
        locationState,
        isLocationEnabled: isLocationEnabled ?? false,
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
