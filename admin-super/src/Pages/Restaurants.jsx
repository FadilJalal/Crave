import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Plus, Mail, Lock, MapPin, LocateFixed, Image as ImageIcon, Loader2, Utensils } from "lucide-react";
import { api } from "../utils/api";
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
        (item) =>
          item.address &&
          (item.address.road || item.address.suburb || item.address.building || item.address.amenity || item.address.city)
      );
      setAddressResults(filtered.length ? filtered : results.slice(0, 6));
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
      payload.append("avgPrepTime", "15");
      const lat = Number(formData.lat);
      const lng = Number(formData.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        toast.error("Set a valid pin on the map (click or drag the marker).");
        setIsSubmitting(false);
        return;
      }
      payload.append("location", JSON.stringify({ lat, lng }));
      if (logo) payload.append("logo", logo);

      console.log("🔍 Submitting restaurant form...");
      // ✅ Fixed: uses api instance with auth token
      // NOTE: Do NOT set Content-Type header — axios auto-detects FormData
      const { data } = await api.post(`/api/restaurant/add`, payload);

      console.log("📊 Response:", data);
      if (data.success) {
        toast.success("Restaurant registered successfully");
        navigate("/restaurants/list");
      } else {
        toast.error(data.message || "Registration failed");
      }
    } catch (err) {
      console.error("❌ Error submitting form:", err);
      const errorMsg = err?.response?.data?.message || err?.message || "Registration failed";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const markerPosition = useMemo(
    () => [Number(formData.lat) || 25.2048, Number(formData.lng) || 55.2708],
    [formData.lat, formData.lng]
  );

  return (
    <div className="dash animate-fade-in">
      <header className="dash-header">
        <div>
          <div className="dash-kicker">SYSTEM EXPANSION MODULE</div>
          <h1 className="dash-title">Partner <span style={{ color: '#ff4e2a' }}>Onboarding</span></h1>
          <p className="dash-subtitle">Register and deploy a new Crave restaurant entity to the network.</p>
        </div>
        <div className="dash-actions">
          <button className="btn-outline" onClick={() => navigate("/restaurants/list")}>
            DIRECTORY OVERVIEW
          </button>
        </div>
      </header>

      <div className="dash-row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1.2 }}>
          <form onSubmit={handleSubmit} className="dash-panel" style={{ padding: '32px' }}>
            <div className="dash-panel-head" style={{ marginBottom: '24px' }}>
               <div>
                  <h3 className="dash-panel-title">📡 OPERATIONAL IDENTITY</h3>
                  <p className="dash-panel-sub">Brand credentials and access keys</p>
               </div>
               <div className="pill">SECURE ENTRY</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div className="field">
                <label className="label">LEGAL ENTITY NAME</label>
                <div className="search-wrap">
                   <div style={{ position: 'absolute', left: '12px', color: 'var(--muted)' }}><Utensils size={15}/></div>
                   <input
                    className="input"
                    style={{ paddingLeft: '40px' }}
                    name="name"
                    placeholder="e.g., Al Safadi"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="label">ADMINISTRATIVE EMAIL</label>
                <div className="search-wrap">
                  <div style={{ position: 'absolute', left: '12px', color: 'var(--muted)' }}><Mail size={15}/></div>
                  <input
                    className="input"
                    style={{ paddingLeft: '40px' }}
                    type="email"
                    name="email"
                    placeholder="partner@crave.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label className="label">SECURE ACCESS KEY (PASSWORD)</label>
                <div className="search-wrap">
                  <div style={{ position: 'absolute', left: '12px', color: 'var(--muted)' }}><Lock size={15}/></div>
                  <input
                    className="input"
                    style={{ paddingLeft: '40px' }}
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="dash-panel-head" style={{ marginBottom: '24px' }}>
               <div>
                  <h3 className="dash-panel-title">📍 DEPLOYMENT PARAMETERS</h3>
                  <p className="dash-panel-sub">Geospatial sync and location data</p>
               </div>
               <div className="pill">SYNC ACTIVE</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ position: "relative" }}>
                <div className="field">
                  <label className="label">STREET ADDRESS (UAE NETWORK SEARCH)</label>
                  <div className="search-wrap">
                    <div style={{ position: 'absolute', left: '12px', color: 'var(--muted)' }}><MapPin size={15}/></div>
                    <input
                      className="input"
                      style={{ paddingLeft: '40px' }}
                      name="address"
                      placeholder="Search street, road, or area..."
                      value={formData.address}
                      onChange={handleInputChange}
                      autoComplete="off"
                      required
                    />
                    <div style={{ position: 'absolute', right: '12px' }}>
                       {isSearching && <Loader2 size={14} className="animate-spin" color="#ff4e2a" />}
                    </div>
                  </div>
                </div>

                {addressResults.length > 0 && (
                  <div className="as-glass-card" style={{ position: 'absolute', top: '75px', left: 0, right: 0, zIndex: 1000, overflow: 'hidden' }}>
                    {addressResults.map((r) => {
                      const street = r.address.road || r.address.pedestrian || "";
                      const suburb = r.address.suburb || r.address.neighbourhood || "";
                      const city = r.address.city || r.address.state || "";
                      const label = [street, suburb, city].filter(Boolean).join(", ");
                      return (
                        <div
                          key={r.place_id}
                          className="rl-table-row"
                          style={{ padding: '12px 16px', gridTemplateColumns: '1fr', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
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
                          <div style={{ fontWeight: 800, fontSize: "13px", color: 'var(--text)' }}>
                            {street || r.display_name.split(",")[0]}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.display_name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="field">
                <label className="label">GEOLOCATION RADIUS SYNC</label>
                <button type="button" className="btn-outline" style={{ justifyContent: 'center', width: '100%', height: '45px' }} onClick={handleLocationDetection}>
                  <LocateFixed size={16} /> SYCHRONIZE CURRENT GPS
                </button>
              </div>
            </div>

            <div className="footer-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '40px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
               <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <label className="as-glass-card" style={{ padding: '12px 16px', borderStyle: 'dashed', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ImageIcon size={18} className="muted" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>{logo ? "ID: LOADED" : "UPLOAD LOGO"}</span>
                    <input type="file" accept="image/*" onChange={handleLogoChange} hidden />
                  </label>
                  {logoPreview && <img src={logoPreview} alt="Preview" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)' }} />}
               </div>

               <button type="submit" className="as-logout-btn" style={{ flex: 1.5, background: '#ff4e2a', color: '#fff', height: '50px' }} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "🚀 DEPLOY RESTAURANT ENTITY"}
               </button>
            </div>
          </form>
        </div>

        <div style={{ flex: 0.8 }}>
          <div className="dash-panel" style={{ height: '640px', overflow: 'hidden', padding: 0 }}>
             <div className="dash-panel-head" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <div>
                   <h3 className="dash-panel-title">📍 SPATIAL VERIFICATION</h3>
                   <p className="dash-panel-sub">Precision Storefront Placement</p>
                </div>
                <div className="pill pill-ok">LIVE FEED</div>
             </div>
             <div style={{ height: 'calc(100% - 85px)', width: '100%', filter: 'grayscale(0.2) contrast(1.1)' }}>
                <MapContainer center={markerPosition} zoom={13} style={{ height: "100%", width: "100%" }}>
                  <TileLayer
                    attribution='&copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                  />
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
                    <Popup>Precision Storefront PIN</Popup>
                  </Marker>
                </MapContainer>
             </div>
          </div>
        </div>
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