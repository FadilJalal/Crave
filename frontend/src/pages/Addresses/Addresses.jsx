
import React, { useState } from "react";
import "./Addresses.css";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icon issue with Vite
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState({
    street: "",
    area: "",
    city: "",
    building: "",
  });

  const [adding, setAdding] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapPosition, setMapPosition] = useState([24.4539, 54.3773]); // Abu Dhabi
  const [markerPosition, setMarkerPosition] = useState(null);
  const [loadingLoc, setLoadingLoc] = useState(false);

  /* ===== Form Change ===== */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ===== Reverse Geocode ===== */
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            "User-Agent": "crave-app-demo"
          }
        }
      );
      if (!res.ok) throw new Error("API failed");
      const data = await res.json();
      return data?.address || {};
    } catch (err) {
      console.error("Geocode error:", err);
      return {};
    }
  };

  /* ===== Map Click ===== */
  function LocationMarker() {
    useMapEvents({
      click(e) {
        if (!e?.latlng) return;
        setMarkerPosition([e.latlng.lat, e.latlng.lng]);
        handleMapPick(e.latlng.lat, e.latlng.lng);
      },
    });
    return markerPosition ? <Marker position={markerPosition} /> : null;
  }

  /* ===== Handle Map Pick ===== */
  const handleMapPick = async (lat, lng) => {
    try {
      setLoadingLoc(true);
      const addr = await reverseGeocode(lat, lng);
      setForm((prev) => ({
        ...prev,
        street: addr?.road || prev.street,
        area:
          addr?.suburb ||
          addr?.neighbourhood ||
          addr?.village ||
          addr?.town ||
          prev.area,
        city: addr?.city || addr?.town || addr?.village || prev.city,
        building: addr?.building || prev.building,
      }));
      setShowMap(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLoc(false);
    }
  };

  /* ===== Use GPS ===== */
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    setLoadingLoc(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        setMapPosition([latitude, longitude]);
        setMarkerPosition([latitude, longitude]);

        await handleMapPick(latitude, longitude);
      },
      () => {
        alert("Failed to get location");
        setLoadingLoc(false);
      }
    );
  };

  /* ===== Add Address ===== */
  const handleAdd = (e) => {
    e.preventDefault();
    if (adding) return;

    if (!form.street || !form.city) return;

    setAdding(true);

    setAddresses((prev) => [
      ...prev,
      { ...form, isDefault: prev.length === 0 },
    ]);

    setForm({
      street: "",
      area: "",
      city: "",
      building: "",
    });

    setAdding(false);
  };

  const setDefaultAddressIndex = (idx) => {
    setAddresses((prev) =>
      prev.map((a, i) => ({ ...a, isDefault: i === idx }))
    );
  };

  const deleteAddress = (idx) => {
    setAddresses((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <main className="addresses-page-main">
      <div className="addresses-container">

        {/* ===== FORM ===== */}
        <section className="address-form-section">
          <h1 className="address-title">Your Addresses</h1>
          <p className="address-desc">Add and manage delivery locations</p>

          <form className="address-form" onSubmit={handleAdd}>
            <input
              className="address-input"
              name="street"
              placeholder="Street"
              value={form.street}
              onChange={handleChange}
            />

            <input
              className="address-input"
              name="area"
              placeholder="Area"
              value={form.area}
              onChange={handleChange}
            />

            <input
              className="address-input"
              name="city"
              placeholder="City"
              value={form.city}
              onChange={handleChange}
            />

            <input
              className="address-input"
              name="building"
              placeholder="Building / Apartment"
              value={form.building}
              onChange={handleChange}
            />

            {/* Map Buttons */}
            <div style={{ gridColumn: "span 2", display: "flex", gap: 8 }}>
              <button
                type="button"
                className="address-map-btn"
                onClick={() => setShowMap(true)}
              >
                🗺️ Pick on Map
              </button>

              <button
                type="button"
                className="address-map-btn"
                onClick={handleUseCurrentLocation}
              >
                📍 Use my location
              </button>

              {loadingLoc && <span>Loading...</span>}
            </div>

            <button className="address-btn" disabled={adding}>
              {adding ? "Adding..." : "Add Address"}
            </button>
          </form>

          {/* ===== MAP MODAL ===== */}
          {showMap && (
            <div className="address-map-modal">
              <div
                className="address-map-modal-bg"
                onClick={() => setShowMap(false)}
              />

              <div className="address-map-modal-content">
                <h3>Pick Location</h3>

                <MapContainer
                  key={showMap ? "open" : "closed"}
                  center={mapPosition}
                  zoom={14}
                  style={{ height: 350, width: 350, borderRadius: 12 }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationMarker />
                </MapContainer>

                <button
                  className="address-map-btn"
                  onClick={() => setShowMap(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ===== LIST ===== */}
        <section className="address-list-section">
          <div className="address-list">
            {addresses.length === 0 && (
              <p className="address-empty">No addresses yet</p>
            )}

            {addresses.map((addr, idx) => (
              <div
                key={idx}
                className={`address-item ${
                  addr.isDefault ? "address-default" : ""
                }`}
              >
                <div>
                  <div className="address-main">
                    {addr.street}, {addr.city}
                    {addr.isDefault && <span> • Default</span>}
                  </div>

                  <div className="address-building">
                    {addr.area} {addr.building && `• ${addr.building}`}
                  </div>
                </div>

                <div className="address-actions">
                  {!addr.isDefault && (
                    <button onClick={() => setDefaultAddressIndex(idx)}>
                      Set Default
                    </button>
                  )}

                  <button onClick={() => deleteAddress(idx)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}