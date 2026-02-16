"use client";

import { useEffect, useMemo, useRef } from "react";

import L, { type LatLngExpression } from "leaflet";

import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Restaurant } from "../service/types";

const leafletVersion = "1.9.4";

/**
 * LeafletMap renders an interactive map with restaurant markers.
 *
 * @param {Object} props - Component props
 * @param {string} [props.selectedRestaurantId] - The ID of the currently selected restaurant (if any)
 * @param {(id: string) void} [props.onSelectRestaurantId] - Callback when a restaurant marker is selected
 * @param {Array<{id: string, name: string, lat: number, lng: number, url: string}>} props.restaurants - List of restaurants to display as markers
 * @param {Object} [props.userLocation] - The user's location (if any)
 * @returns {JSX.Element} The rendered map component
 */

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
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <MapContainer
        center={
          userLocationToUse
            ? [userLocationToUse.lat, userLocationToUse.lng]
            : HELSINKI_CENTER
        }
        zoom={14}
        className="w-full min-h-[320px] h-[60vh] max-h-[520px]"
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
                <strong>{r.name}</strong>

                {typeof r.averageRating === "number" && (
                  <div style={{ margin: "4px 2px", fontSize: 12 }}>
                    Arvosana {r.averageRating.toFixed(1)}/5 (
                    {r.reviewCount ?? 0})
                  </div>
                )}

                {renderMenuList(r.menu_text, 6, r.id)}
                <a href={r.url} target="_blank" rel="noreferrer">
                  Avaa ravintolan sivut
                </a>
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
    .replace(/#+/g, "\n") // turn #### into line breaks
    .replace(/\s{2,}/g, " ") // collapse extra spaces
    .trim();
}

function parseMenuItems(text?: string, max = 6): string[] {
  const raw = cleanMenuText(text);
  if (!raw) return [];

  const tokens = raw
    .split(/\r?\n|[•–—\-,:;|]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const unique = Array.from(new Set(tokens));
  const truncate = (s: string) => (s.length > 90 ? s.slice(0, 87) + "..." : s);
  return unique.slice(0, max).map(truncate);
}

function renderMenuList(text: string | undefined, max: number, rid: string) {
  const items = parseMenuItems(text, max);
  if (!items.length) {
    return (
      <div style={{ margin: "8px 2px", color: "#6b7280" }}>
        Ei lounaslistaa saatavilla
      </div>
    );
  }
  return (
    <ul style={{ margin: "8px 2px", paddingLeft: 0, listStyle: "none" }}>
      {items.map((item) => (
        <li
          key={`${rid}:${item.toLowerCase()}`}
          style={{ display: "flex", gap: 6, marginTop: 4 }}
        >
          <span aria-hidden>•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
