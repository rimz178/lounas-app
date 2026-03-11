"use client";

import L, { type LatLngExpression } from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Restaurant } from "../service/types";

const leafletVersion = "1.9.4";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: `https://unpkg.com/leaflet@${leafletVersion}/dist/images/marker-icon-2x.png`,
  iconUrl: `https://unpkg.com/leaflet@${leafletVersion}/dist/images/marker-icon.png`,
  shadowUrl: `https://unpkg.com/leaflet@${leafletVersion}/dist/images/marker-shadow.png`,
});

const HELSINKI_CENTER: LatLngExpression = [60.1699, 24.9384];

const isValidLat = (lat: number) =>
  Number.isFinite(lat) && lat >= -90 && lat <= 90;
const isValidLng = (lng: number) =>
  Number.isFinite(lng) && lng >= -180 && lng <= 180;

type Props = {
  selectedRestaurantId?: string;
  onSelectRestaurantId?: (id: string) => void;
  restaurants: Restaurant[];
  userLocation?: { lat: number; lng: number } | null;
};

function SelectedRestaurantController({
  selectedRestaurantId,
  target,
  markerRefs,
}: {
  selectedRestaurantId?: string;
  target?: { lat: number; lng: number };
  markerRefs: React.MutableRefObject<Record<string, L.Marker | null>>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedRestaurantId || !target) return;

    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 16), {
      animate: true,
      duration: 0.6,
    });

    const marker = markerRefs.current[selectedRestaurantId];
    marker?.openPopup();
  }, [map, markerRefs, selectedRestaurantId, target]);

  return null;
}

function UserLocationController({
  userLocation,
  selectedRestaurantId,
}: {
  userLocation?: { lat: number; lng: number } | null;
  selectedRestaurantId?: string;
}) {
  const map = useMap();
  const prevRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (selectedRestaurantId) return;

    if (
      userLocation &&
      isValidLat(userLocation.lat) &&
      isValidLng(userLocation.lng)
    ) {
      const prev = prevRef.current;
      const moved =
        !prev ||
        Math.abs(prev.lat - userLocation.lat) > 0.0001 ||
        Math.abs(prev.lng - userLocation.lng) > 0.0001;

      if (moved) {
        prevRef.current = userLocation;
        map.flyTo(
          [userLocation.lat, userLocation.lng],
          Math.max(map.getZoom(), 14),
          {
            animate: true,
            duration: 0.8,
          },
        );
      }
    }
  }, [userLocation, selectedRestaurantId, map]);

  return null;
}

export default function LeafletMap({
  selectedRestaurantId,
  onSelectRestaurantId,
  restaurants,
  userLocation,
}: Props) {
  const restaurantsToUse = restaurants;
  const userLocationToUse = userLocation ?? null;

  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const selectedTarget = useMemo(() => {
    if (!selectedRestaurantId) return undefined;
    const r = restaurantsToUse.find((x) => x.id === selectedRestaurantId);
    return r ? { lat: r.lat, lng: r.lng } : undefined;
  }, [selectedRestaurantId, restaurantsToUse]);

  return (
    <div className="w-full h-[300px] sm:h-[400px] lg:h-[70vh] rounded-lg overflow-hidden mx-auto mt-2">
      <MapContainer
        center={
          userLocationToUse
            ? [userLocationToUse.lat, userLocationToUse.lng]
            : HELSINKI_CENTER
        }
        zoom={14}
        className="w-full h-full rounded-lg"
      >
        <UserLocationController
          userLocation={userLocationToUse}
          selectedRestaurantId={selectedRestaurantId}
        />
        <SelectedRestaurantController
          selectedRestaurantId={selectedRestaurantId}
          target={selectedTarget}
          markerRefs={markerRefs}
        />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {restaurantsToUse.map((r) => {
          const position: LatLngExpression = [r.lat, r.lng];
          const previewItems = parseMenuItems(r.menu_text, 2);

          return (
            <Marker
              key={r.id}
              position={position}
              ref={(marker) => {
                markerRefs.current[r.id] = marker;
              }}
              eventHandlers={{
                click: () => {
                  onSelectRestaurantId?.(r.id);
                },
              }}
            >
              <Popup>
                <div className="min-w-[220px] max-w-[280px] space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {r.name}
                  </h3>

                  {typeof r.averageRating === "number" &&
                  (r.reviewCount ?? 0) > 0 ? (
                    <p className="text-base text-slate-700,">
                      Arvosana {r.averageRating.toFixed(1)}/5 (
                      {r.reviewCount ?? 0} arvostelua)
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Ei arvosteluja vielä
                    </p>
                  )}

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
                      Päivän nosto
                    </p>

                    {previewItems.length > 0 ? (
                      <ul className="space-y-1">
                        {previewItems.map((item) => (
                          <li
                            key={item}
                            className="text-sm font-medium text-slate-900"
                          >
                            • {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Ei lounaslistaa saatavilla
                      </p>
                    )}
                  </div>

                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-sm font-medium text-blue-700 hover:underline"
                  >
                    Avaa ravintolan sivut
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {userLocationToUse && (
          <Marker
            position={[userLocationToUse.lat, userLocationToUse.lng]}
            icon={L.divIcon({
              className: "",
              html: `<div style="background:#2563eb;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 6px #2563eb;"></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          >
            <Popup>Olet tässä</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

function cleanMenuText(text?: string): string {
  return (text ?? "")
    .replace(/#+/g, "\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseMenuItems(text?: string, max = 6): string[] {
  const raw = cleanMenuText(text);
  if (!raw) return [];

  const lines = raw
    .split(/\r?\n|[•;|]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const cleaned = lines
    .map((line) =>
      line
        .replace(
          /^(ma|ti|ke|to|pe|la|su|maanantai|tiistai|keskiviikko|torstai|perjantai|lauantai|sunnuntai)\b\.?\s*/i,
          "",
        )
        .replace(/^\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?\.?\s*/, "")
        .replace(/^[-:|]\s*/, "")
        .trim(),
    )
    .filter((line) => {
      if (line.length < 4) return false;
      if (/^\d+$/.test(line)) return false;
      if (!/[a-zA-ZåäöÅÄÖ]/.test(line)) return false;
      return true;
    });

  return Array.from(new Set(cleaned)).slice(0, max);
}

