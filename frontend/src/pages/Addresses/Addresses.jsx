import React, { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import "./Addresses.css";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { StoreContext } from "../../Context/StoreContext";

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
  const { t } = useTranslation();
  const { 
    addresses, 
    addAddress, 
    deleteAddress, 
    setDefaultAddressIndex, 
  } = useContext(StoreContext);

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
  const [coords, setCoords] = useState({ lat: null, lng: null });

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
      setCoords({ lat, lng });
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
  const handleAdd = async (e) => {
    e.preventDefault();
    if (adding) return;
    if (!form.street || !form.city) return;

    setAdding(true);
    try {
      // Use global context function instead of local state
      await addAddress({ ...form, location: coords });
      
      setForm({
        street: "",
        area: "",
        city: "",
        building: "",
      });
      setCoords({ lat: null, lng: null });
    } catch (err) {
      console.error("Failed to add address:", err);
    } finally {
      setAdding(false);
    }
  };

  // Note: functions are already bound to context state, no local logic needed here.

  return (
    <main className="addresses-page-main">
      <div className="addresses-container">

        {/* ===== FORM ===== */}
        <section className="address-form-section">
          <h1 className="address-title">{t("your_addresses")}</h1>
          <p className="address-desc">{t("add_manage_locations")}</p>

          <form className="address-form" onSubmit={handleAdd}>
            <input
              className="address-input"
              name="street"
              placeholder={t("street_placeholder")}
              value={form.street}
              onChange={handleChange}
            />

            <input
              className="address-input"
              name="area"
              placeholder={t("area_placeholder")}
              value={form.area}
              onChange={handleChange}
            />

            <input
              className="address-input"
              name="city"
              placeholder={t("city_placeholder")}
              value={form.city}
              onChange={handleChange}
            />

            <input
              className="address-input"
              name="building"
              placeholder={t("building_placeholder")}
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
                {t("pick_on_map")}
              </button>

              <button
                type="button"
                className="address-map-btn"
                onClick={handleUseCurrentLocation}
              >
                {t("use_my_location")}
              </button>

              {loadingLoc && <span>{t("loading")}</span>}
            </div>

            <button className="address-btn" disabled={adding}>
              {adding ? t("adding") : t("add_address")}
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
                <h3>{t("pick_location")}</h3>

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
                  {t("close")}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ===== LIST ===== */}
        <section className="address-list-section">
          <div className="address-list">
            {addresses.length === 0 && (
              <p className="address-empty">{t("no_addresses_yet")}</p>
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
                    {addr.isDefault && <span className="address-default-badge">{t("default")}</span>}
                  </div>

                  <div className="address-building">
                    {addr.area} {addr.building && `• ${addr.building}`}
                  </div>
                </div>

                <div className="address-actions">
                  {!addr.isDefault && (
                    <button className="address-set-btn" onClick={() => setDefaultAddressIndex(idx)}>
                      {t("set_default")}
                    </button>
                  )}

                  <button className="address-delete-btn" onClick={() => deleteAddress(idx)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    {t("delete")}
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