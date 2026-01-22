"use client";

import { useEffect, useMemo, useRef } from "react";

import L, { type LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

const leafletVersion = "1.9.4";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: `https://unpkg.com/leaflet@${leafletVersion}/dist/images/marker-icon-2x.png`,
  iconUrl: `https://unpkg.com/leaflet@${leafletVersion}/dist/images/marker-icon.png`,
  shadowUrl: `https://unpkg.com/leaflet@${leafletVersion}/dist/images/marker-shadow.png`,
});

const HELSINKI_CENTER: LatLngExpression = [60.1699, 24.9384];

type Props = {
  selectedRestaurantId?: string;
  onSelectRestaurantId?: (id: string) => void;
  restaurants: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    url: string;
  }>;
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

export default function LeafletMap({
  selectedRestaurantId,
  onSelectRestaurantId,
  restaurants,
}: Props) {
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  const selectedTarget = useMemo(() => {
    if (!selectedRestaurantId) return undefined;
    const r = restaurants.find((x) => x.id === selectedRestaurantId);
    return r ? { lat: r.lat, lng: r.lng } : undefined;
  }, [selectedRestaurantId, restaurants]);

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <MapContainer
        center={HELSINKI_CENTER}
        zoom={14}
        className="w-full min-h-[320px] h-[60vh] max-h-[520px]"
      >
        <SelectedRestaurantController
          selectedRestaurantId={selectedRestaurantId}
          target={selectedTarget}
          markerRefs={markerRefs}
        />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {restaurants.map((r) => {
          const position: LatLngExpression = [r.lat, r.lng];
          return (
            <Marker
              key={r.id}
              position={position}
              // react-leaflet ref gives access to underlying Leaflet marker instance
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
                <br />
                <a href={r.url} target="_blank" rel="noreferrer">
                  Avaa ravintolan sivut
                </a>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
