import * as Location from "expo-location";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Coords = { lat: number; lng: number };

type LocationState =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "granted"; coords: Coords };

type LocationContextValue = {
  locationState: LocationState;
  requestLocation: () => Promise<void>;
};

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
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

  useEffect(() => {
    void requestLocation();
  }, [requestLocation]);

  return (
    <LocationContext.Provider value={{ locationState, requestLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used inside LocationProvider");
  return ctx;
}
