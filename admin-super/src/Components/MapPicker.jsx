import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useMemo } from "react";

// Fix default marker icon issue in Vite/React
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

export default function MapPicker({
  value, // { lat, lng } or null
  onChange, // (latlng) => void
  center = { lat: 25.2048, lng: 55.2708 }, // Dubai default
  height = 320,
}) {
  const position = useMemo(() => {
    if (!value || value.lat == null || value.lng == null) return null;
    return [value.lat, value.lng];
  }, [value]);

  return (
    <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid #e2e8f0" }}>
      <MapContainer
        center={position || [center.lat, center.lng]}
        zoom={12}
        style={{ height, width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={(latlng) => onChange(latlng)} />
        {position && <Marker position={position} />}
      </MapContainer>
    </div>
  );
}