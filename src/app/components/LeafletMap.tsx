"use client";

import L, { type LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import { restaurants } from "../data/restaurants";

const leafletVersion = "1.9.4";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: `https://unpkg.com/leaflet@${leafletVersion}/dist/images/marker-icon-2x.png`,
  iconUrl: `https://unpkg.com/leaflet@${leafletVersion}/dist/images/marker-icon.png`,
  shadowUrl: `https://unpkg.com/leaflet@${leafletVersion}/dist/images/marker-shadow.png`,
});

const HELSINKI_CENTER: LatLngExpression = [60.1699, 24.9384];

export default function LeafletMap() {
  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <MapContainer
        center={HELSINKI_CENTER}
        zoom={14}
        className="w-full min-h-[320px] h-[60vh] max-h-[520px]"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {restaurants.map((r) => {
          const position: LatLngExpression = [r.lat, r.lng];
          return (
            <Marker key={r.id} position={position}>
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
