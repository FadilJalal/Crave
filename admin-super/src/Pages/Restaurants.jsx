import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Plus, Mail, Lock, MapPin, LocateFixed, Image as ImageIcon, Loader2 } from "lucide-react";
import { api, BASE_URL as BACKEND_URL } from "../utils/api";
import "leaflet/dist/leaflet.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (map) map.setView([center.lat, center.lng], map.getZoom());
  }, [center, map]);
  return null;
};

const MapClickSetter = ({ onPick }) => {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const FormField = ({ label, children }) => (
  <div style={styles.fieldContainer}>
    <label style={styles.label}>{label}</label>
    {children}
  </div>
);

export default function AddRestaurant() {
  const navigate = useNavigate();

  const DEFAULT_COORDS = { lat: 25.2048, lng: 55.2708 };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [addressResults, setAddressResults] = useState([]);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    address: "",
    lat: DEFAULT_COORDS.lat,
    lng: DEFAULT_COORDS.lng,
    avgPrepTime: 15,
  });

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (formData.address.length > 3) {
        performUAEStreetSearch(formData.address);
      } else {
        setAddressResults([]);
      }
    }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [formData.address]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const performUAEStreetSearch = async (query) => {
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: query,
          format: "json",
          countrycodes: "ae",
          addressdetails: 1,
          limit: 6,
          viewbox: "51.5,22.5,56.5,26.5",
          bounded: 1,
        })
      );
      const results = await res.json();
      const filtered = results.filter(
        (item) => item.address.road || item.address.suburb || item.address.building || item.address.amenity
      );
      setAddressResults(filtered);
    } catch (error) {
      console.error("UAE Search Error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Logo size must be less than 2MB");
    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLocationDetection = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }));
        toast.info("GPS Coordinates Synchronized");
      },
      () => toast.error("Please enable location permissions")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key !== "lat" && key !== "lng") {
          payload.append(key, formData[key]);
        }
      });
      payload.append("location", JSON.stringify({ lat: formData.lat, lng: formData.lng }));
      if (logo) payload.append("logo", logo);

      // ✅ Fixed: uses api instance with auth token
      const { data } = await api.post(`/api/restaurant/add`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data.success) {
        toast.success("Restaurant registered successfully");
        navigate("/restaurants/list");
      } else {
        toast.error(data.message || "Registration failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const markerPosition = useMemo(() => [formData.lat, formData.lng], [formData.lat, formData.lng]);

  return (
    <div style={styles.container}>
      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Partner Onboarding</h1>
          <p style={styles.subtitle}>Register a new Crave restaurant partner.</p>
        </div>
        <button style={styles.secondaryBtn} onClick={() => navigate("/restaurants/list")}>
          View Active Partners
        </button>
      </header>

      <div style={styles.card}>
        <form onSubmit={handleSubmit}>
          <div style={styles.sectionHeader}>
            <Plus size={18} color="#ff4e2a" />
            <h2 style={styles.sectionTitle}>Brand Identity</h2>
          </div>

          <div style={styles.grid}>
            <FormField label="Legal Restaurant Name">
              <input
                style={styles.input}
                name="name"
                placeholder="e.g., Al Safadi"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </FormField>

            <FormField label="Business Email">
              <div style={styles.iconInputWrapper}>
                <Mail size={16} color="#94a3b8" />
                <input
                  style={styles.inputBare}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </FormField>

            <FormField label="Admin Password">
              <div style={styles.iconInputWrapper}>
                <Lock size={16} color="#94a3b8" />
                <input
                  style={styles.inputBare}
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </FormField>

            <FormField label="Avg Preparation Time (Mins)">
              <input
                style={styles.input}
                type="number"
                name="avgPrepTime"
                value={formData.avgPrepTime}
                onChange={handleInputChange}
              />
            </FormField>
          </div>

          <div style={styles.sectionHeader}>
            <MapPin size={18} color="#ff4e2a" />
            <h2 style={styles.sectionTitle}>Location Details</h2>
          </div>

          <div style={styles.grid}>
            <div style={{ position: "relative" }}>
              <FormField label="Street Address (UAE Search)">
                <div style={styles.iconInputWrapper}>
                  <MapPin size={16} color="#94a3b8" />
                  <input
                    style={styles.inputBare}
                    name="address"
                    placeholder="Search street, road, or area..."
                    value={formData.address}
                    onChange={handleInputChange}
                    autoComplete="off"
                    required
                  />
                  {isSearching && <Loader2 size={14} className="animate-spin" color="#ff4e2a" />}
                </div>
              </FormField>

              {addressResults.length > 0 && (
                <div style={styles.dropdown}>
                  {addressResults.map((r) => {
                    const street = r.address.road || r.address.pedestrian || "";
                    const suburb = r.address.suburb || r.address.neighbourhood || "";
                    const city = r.address.city || r.address.state || "";
                    const label = [street, suburb, city].filter(Boolean).join(", ");
                    return (
                      <div
                        key={r.place_id}
                        style={styles.dropdownItem}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            address: label || r.display_name,
                            lat: parseFloat(r.lat),
                            lng: parseFloat(r.lon),
                          }));
                          setAddressResults([]);
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: "13px" }}>
                          {street || r.display_name.split(",")[0]}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.display_name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <FormField label="Geolocation Sync">
              <button type="button" style={styles.actionBtn} onClick={handleLocationDetection}>
                <LocateFixed size={16} /> Fetch Current GPS
              </button>
            </FormField>
          </div>

          <div style={styles.mapContainer}>
            <MapContainer center={markerPosition} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapUpdater center={{ lat: formData.lat, lng: formData.lng }} />
              <MapClickSetter onPick={(lat, lng) => setFormData((p) => ({ ...p, lat, lng }))} />
              <Marker
                position={markerPosition}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const { lat, lng } = e.target.getLatLng();
                    setFormData((p) => ({ ...p, lat, lng }));
                  },
                }}
              >
                <Popup>Storefront PIN</Popup>
              </Marker>
            </MapContainer>
          </div>

          <div style={styles.footer}>
            <div style={styles.logoUploadSection}>
              <label style={styles.uploadBox}>
                <ImageIcon size={18} />
                <span>{logo ? "Change Logo" : "Upload Brand Logo"}</span>
                <input type="file" accept="image/*" onChange={handleLogoChange} hidden />
              </label>
              {logoPreview && <img src={logoPreview} alt="Preview" style={styles.previewImg} />}
            </div>

            <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "REGISTER RESTAURANT"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: "1000px", margin: "0 auto", padding: "40px 20px", fontFamily: "'Inter', sans-serif" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px" },
  title: { fontSize: "28px", fontWeight: "800", color: "#1e293b", margin: 0 },
  subtitle: { color: "#64748b", marginTop: "4px" },
  secondaryBtn: { padding: "10px 18px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: "#475569" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "32px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" },
  sectionHeader: { display: "flex", alignItems: "center", gap: "10px", margin: "24px 0 16px 0" },
  sectionTitle: { fontSize: "14px", fontWeight: "700", color: "#334155", textTransform: "uppercase", letterSpacing: "1px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" },
  fieldContainer: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#475569" },
  input: { padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", transition: "border 0.2s" },
  iconInputWrapper: { display: "flex", alignItems: "center", gap: "10px", padding: "0 12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff" },
  inputBare: { border: "none", outline: "none", width: "100%", padding: "12px 0", fontSize: "14px" },
  actionBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", background: "#fff", border: "1px solid #ff4e2a", color: "#ff4e2a", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  mapContainer: { height: "320px", borderRadius: "12px", overflow: "hidden", marginTop: "24px", border: "1px solid #e2e8f0" },
  footer: { marginTop: "32px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", borderTop: "1px solid #f1f5f9", paddingTop: "24px" },
  logoUploadSection: { display: "flex", alignItems: "center", gap: "15px" },
  uploadBox: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", border: "2px dashed #cbd5e1", borderRadius: "8px", cursor: "pointer", fontSize: "14px", color: "#64748b", fontWeight: "500" },
  previewImg: { width: "50px", height: "50px", borderRadius: "8px", objectFit: "cover", border: "1px solid #e2e8f0" },
  submitBtn: { flex: 1, padding: "16px", background: "#ff4e2a", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "15px", display: "flex", justifyContent: "center", alignItems: "center" },
  dropdown: { position: "absolute", top: "72px", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", zIndex: 9999, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", maxHeight: "250px", overflowY: "auto" },
  dropdownItem: { padding: "12px 16px", borderBottom: "1px solid #f8fafc", cursor: "pointer", transition: "background 0.2s" },
};