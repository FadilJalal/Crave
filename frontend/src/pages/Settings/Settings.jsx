// restaurant-admin/src/Pages/Settings.jsx
import { useEffect, useState, useRef } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { BASE_URL } from "../utils/api";
import { toast } from "react-toastify";
import { useTheme } from "../ThemeContext";
import "./Settings.css";

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const DAY_SHORT = { monday:"Mon", tuesday:"Tue", wednesday:"Wed", thursday:"Thu", friday:"Fri", saturday:"Sat", sunday:"Sun" };
const DAY_FULL  = { monday:"Monday", tuesday:"Tuesday", wednesday:"Wednesday", thursday:"Thursday", friday:"Friday", saturday:"Saturday", sunday:"Sunday" };

const DEFAULT_HOURS = Object.fromEntries(
  DAYS.map(d => [d, { open: "09:00", close: "22:00", closed: false }])
);

function computeIsOpenNow(openingHours, isActive) {
  if (!isActive) return false;
  if (!openingHours) return isActive;
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai", weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const weekday = (parts.find((p) => p.type === "weekday")?.value || "monday").toLowerCase();
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  const mins = hour * 60 + minute;
  const idx = Math.max(0, DAYS.indexOf(weekday));
  const today = DAYS[idx];
  const prev = DAYS[(idx + 6) % 7];
  const parse = (t) => {
    if (!t || !t.includes(":")) return null;
    const [h, m] = t.split(":").map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  };
  const h = openingHours[today];
  if (h && !h.closed) {
    if (h.open === "00:00" && h.close === "23:59") return true;
    const openMins = parse(h.open);
    const closeMins = parse(h.close);
    if (openMins !== null && closeMins !== null) {
      if (closeMins <= openMins) { if (mins >= openMins) return true; }
      else if (mins >= openMins && mins < closeMins) return true;
    }
  }
  const prevH = openingHours[prev];
  if (prevH && !prevH.closed) {
    const prevOpen = parse(prevH.open);
    const prevClose = parse(prevH.close);
    if (prevOpen !== null && prevClose !== null && prevClose <= prevOpen) {
      if (mins < prevClose) return true;
    }
  }
  return false;
}

function fmt12(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
}

// ── Section Header component ─────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, children }) {
  return (
    <div className="st-section-header">
      <div className="st-section-header-left">
        <span className="st-section-icon">{icon}</span>
        <div>
          <div className="st-section-title">{title}</div>
          {subtitle && <div className="st-section-subtitle">{subtitle}</div>}
        </div>
      </div>
      {children && <div className="st-section-header-right">{children}</div>}
    </div>
  );
}

// ── Leaflet Map ───────────────────────────────────────────────────────────────
function LocationMap({ location, onChange }) {
  const mapRef      = useRef(null);
  const leafletRef  = useRef(null);
  const markerRef   = useRef(null);
  const onChangeRef = useRef(onChange);
  const [search,    setSearch]   = useState("");
  const [results,   setResults]  = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => { onChangeRef.current = onChange; });

  const resultsRef = useRef([]);
  useEffect(() => { resultsRef.current = results; });

  const doSearch = async (q) => {
    if (!q || q.length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const params = new URLSearchParams({ format:"json", limit:"8", q, countrycodes:"ae", addressdetails:"1", viewbox:"51.5,22.5,56.5,26.5", bounded:"0" });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { "Accept-Language":"en", Accept:"application/json" } });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  useEffect(() => { const t = setTimeout(() => doSearch(search), 500); return () => clearTimeout(t); }, [search]);

  const pickResult = (r) => {
    if (!r) return;
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (leafletRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      leafletRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
    }
    onChangeRef.current({ lat, lng });
    setSearch(r.display_name.split(",").slice(0, 2).join(","));
    setResults([]);
  };

  useEffect(() => {
    if (!window.L || !mapRef.current || leafletRef.current) return;
    const L = window.L;
    leafletRef.current = L.map(mapRef.current, { zoomControl: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 20,
    }).addTo(leafletRef.current);
    leafletRef.current.on("click", (e) => {
      const { lat, lng } = e.latlng;
      markerRef.current?.setLatLng([lat, lng]);
      onChangeRef.current({ lat, lng });
    });
    leafletRef.current.setView([location.lat, location.lng], 15);
    const pinIcon = L.divIcon({
      className: "",
      html: `<div style="width:22px;height:22px;border-radius:50%;background:#ff4e2a;border:3px solid white;box-shadow:0 0 0 2px #ff4e2a,0 4px 12px rgba(0,0,0,0.35);"></div>`,
      iconSize: [22, 22], iconAnchor: [11, 11],
    });
    markerRef.current = L.marker([location.lat, location.lng], { icon: pinIcon, draggable: true }).addTo(leafletRef.current);
    markerRef.current.on("dragend", (e) => { const { lat, lng } = e.target.getLatLng(); onChangeRef.current({ lat, lng }); });
    return () => { if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; markerRef.current = null; } };
  }, []);

  useEffect(() => {
    if (!leafletRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([location.lat, location.lng]);
    leafletRef.current.flyTo([location.lat, location.lng], 17, { duration: 1.2 });
  }, [location.lat, location.lng]);

  const onSearchKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const list = resultsRef.current;
    if (list.length > 0) pickResult(list[0]);
    else if (!searching && search.trim().length >= 3) toast.warning("No matches — try e.g. 'Al Heera, Sharjah'.");
  };

  return (
    <div className="st-map-wrapper">
      <div className="st-map-search-area">
        <div className="st-map-search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            className="st-map-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search location in UAE…"
          />
          {searching && <span className="st-map-searching">searching…</span>}
          {search && <button type="button" className="st-map-clear" onClick={() => { setSearch(""); setResults([]); }}>×</button>}
        </div>
        {results.length > 0 && (
          <div className="st-map-results">
            {results.map((r, i) => (
              <div key={`${r.place_id ?? r.osm_id ?? "r"}-${i}`} className="st-map-result-item" onClick={() => pickResult(r)}>
                <div className="st-map-result-name">{(r.display_name || "").split(",")[0]}</div>
                <div className="st-map-result-addr">{r.display_name}</div>
              </div>
            ))}
          </div>
        )}
        {!searching && search.length >= 3 && results.length === 0 && (
          <p className="st-map-no-results">No places found — try simpler text (e.g. "Al Heera Sharjah").</p>
        )}
      </div>
      <div ref={mapRef} className="st-map-container" />
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────
export default function Settings() {
  const { dark } = useTheme();
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [savingLoc,     setSavingLoc]     = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFile,      setLogoFile]      = useState(null);
  const [logoPreview,   setLogoPreview]   = useState("");
  const [logoFilename,  setLogoFilename]  = useState("");
  const [isActive,      setIsActive]      = useState(true);
  const [prepTime,      setPrepTime]      = useState(15);
  const [deliveryRadius, setDeliveryRadius] = useState(10);
  const [minimumOrder,   setMinimumOrder]   = useState(0);
  const [sharedDropKm,   setSharedDropKm]   = useState(2);
  const [sharedPickupKm, setSharedPickupKm] = useState(2);
  const [sharedWindowMin, setSharedWindowMin] = useState(12);
  const [deliveryTiers, setDeliveryTiers] = useState([
    { upToKm: 3, fee: 5 }, { upToKm: 7, fee: 10 }, { upToKm: null, fee: 15 },
  ]);
  const [address,    setAddress]    = useState("");
  const [hours,      setHours]      = useState(DEFAULT_HOURS);
  const [openNow,    setOpenNow]    = useState(false);
  const [is24_7,     setIs24_7]     = useState(false);
  const [savedHours, setSavedHours] = useState(null);
  const [location,   setLocation]   = useState({ lat: 25.2048, lng: 55.2708 });
  const locationRef = useRef({ lat: 25.2048, lng: 55.2708 });

  const updateLocation = (coords) => { locationRef.current = coords; setLocation(coords); };

  const toggle24_7 = () => {
    if (!is24_7) {
      setSavedHours(hours);
      setHours(Object.fromEntries(DAYS.map(d => [d, { open:"00:00", close:"23:59", closed:false }])));
      setIs24_7(true);
      toast.success("Set to 24/7 — remember to save!");
    } else {
      setHours(savedHours || DEFAULT_HOURS);
      setSavedHours(null);
      setIs24_7(false);
      toast.success("Restored previous hours — remember to save!");
    }
  };

  const todayKey = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/restaurantadmin/me");
      if (res.data?.success) {
        const r = res.data.data;
        setLogoFilename(r.logo || "");
        setIsActive(r.isActive ?? true);
        setPrepTime(r.avgPrepTime ?? 15);
        setDeliveryRadius(r.deliveryRadius ?? 10);
        setMinimumOrder(r.minimumOrder ?? 0);
        setSharedDropKm(r.sharedDelivery?.maxDropDistanceKm ?? 2);
        setSharedPickupKm(r.sharedDelivery?.maxPickupDistanceKm ?? 2);
        setSharedWindowMin(r.sharedDelivery?.matchWindowMin ?? 12);
        if (r.deliveryTiers?.length) setDeliveryTiers(r.deliveryTiers);
        setAddress(r.address || "");
        const h = { ...DEFAULT_HOURS, ...(r.openingHours || {}) };
        setHours(h);
        setOpenNow(computeIsOpenNow(h, r.isActive ?? true));
        const lat = Number(r.location?.lat);
        const lng = Number(r.location?.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) updateLocation({ lat, lng });
        const all24 = DAYS.every(d => h[d]?.open === "00:00" && h[d]?.close === "23:59" && !h[d]?.closed);
        setIs24_7(all24);
      }
    } catch { toast.error("Failed to load settings"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!logoFile) { setLogoPreview(""); return; }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  useEffect(() => {
    setOpenNow(computeIsOpenNow(hours, isActive));
    const t = setInterval(() => setOpenNow(computeIsOpenNow(hours, isActive)), 60000);
    return () => clearInterval(t);
  }, [hours, isActive]);

  const updateDay = (day, field, value) =>
    setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

  const applyToAll = (sourceDay) => {
    const src = hours[sourceDay];
    setHours(Object.fromEntries(DAYS.map(d => [d, { ...src }])));
    toast.success(`${DAY_FULL[sourceDay]}'s hours applied to all days`);
  };

  const saveLocation = async () => {
    const { lat, lng } = locationRef.current;
    setSavingLoc(true);
    try {
      const res = await api.post("/api/restaurantadmin/location", { lat, lng });
      if (res.data?.success) toast.success("Location saved!");
      else toast.error(res.data?.message || "Failed to save location");
    } catch { toast.error("Network error"); }
    finally { setSavingLoc(false); }
  };

  const save = async () => {
    const { lat, lng } = locationRef.current;
    const nLat = Number(lat), nLng = Number(lng);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) { toast.error("Set a valid location on the map first."); return; }
    setSaving(true);
    try {
      const payload = {
        isActive, avgPrepTime: prepTime, openingHours: hours,
        deliveryRadius, minimumOrder, deliveryTiers, address,
        location: { lat: nLat, lng: nLng },
        sharedDelivery: { maxDropDistanceKm: sharedDropKm, maxPickupDistanceKm: sharedPickupKm, matchWindowMin: sharedWindowMin },
      };
      const res = await api.post("/api/restaurantadmin/settings", payload);
      if (res.data?.success) {
        toast.success("Settings saved successfully!");
        try {
          const info = JSON.parse(localStorage.getItem("restaurantInfo") || "{}");
          const loc = res.data.data?.location;
          localStorage.setItem("restaurantInfo", JSON.stringify({
            ...info, isActive, avgPrepTime: prepTime, openingHours: hours,
            deliveryRadius, minimumOrder, deliveryTiers, address,
            sharedDelivery: { maxDropDistanceKm: sharedDropKm, maxPickupDistanceKm: sharedPickupKm, matchWindowMin: sharedWindowMin },
            ...(loc?.lat != null && loc?.lng != null ? { location: loc } : {}),
          }));
        } catch {}
      } else toast.error("Save failed: " + (res.data?.message || "Unknown error"));
    } catch (err) { toast.error("Network error: " + err.message); }
    finally { setSaving(false); }
  };

  const uploadLogo = async () => {
    if (!logoFile) { toast.error("Please choose a logo image first"); return; }
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append("logo", logoFile);
      const res = await api.post("/api/restaurantadmin/logo", form, { headers: { "Content-Type":"multipart/form-data" } });
      if (res.data?.success) {
        const updated = res.data.data;
        setLogoFilename(updated?.logo || "");
        setLogoFile(null);
        try {
          const info = JSON.parse(localStorage.getItem("restaurantInfo") || "{}");
          localStorage.setItem("restaurantInfo", JSON.stringify({ ...info, ...updated }));
        } catch {}
        toast.success("Logo updated!");
      } else toast.error(res.data?.message || "Failed to update logo");
    } catch { toast.error("Network error"); }
    finally { setUploadingLogo(false); }
  };

  if (loading) return (
    <RestaurantLayout>
      <div className="st-loading-wrap">
        {[1,2,3,4].map(i => <div key={i} className="st-skeleton" />)}
      </div>
    </RestaurantLayout>
  );

  return (
    <RestaurantLayout>
      <div className={`st-page ${dark ? "st-dark" : ""}`}>

        {/* ── TOP HEADER ── */}
        <div className="st-page-header">
          <div className="st-page-title-group">
            <h1 className="st-page-title">Settings</h1>
            <p className="st-page-subtitle">Manage your store profile, delivery rules, and opening hours</p>
          </div>
          <div className="st-page-header-right">
            <div className={`st-status-badge ${openNow ? "st-status-open" : "st-status-closed"}`}>
              <span className="st-status-dot" />
              {openNow ? "Open Now" : "Closed Now"}
            </div>
            <button className="st-btn-primary" onClick={save} disabled={saving}>
              {saving ? (
                <><span className="st-spinner" /> Saving…</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Settings</>
              )}
            </button>
          </div>
        </div>

        {/* ── LOGO ── */}
        <div className="st-card">
          <SectionHeader icon="🏷️" title="Restaurant Logo" subtitle="Upload a square logo — shown on your sidebar and restaurant card." />
          <div className="st-logo-grid">
            <div className="st-logo-preview">
              {(logoPreview || logoFilename) ? (
                <img src={logoPreview || `${BASE_URL}/images/${logoFilename}`} alt="Logo"
                  onError={e => { e.currentTarget.style.display = "none"; }} />
              ) : (
                <div className="st-logo-placeholder">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span>No logo</span>
                </div>
              )}
            </div>
            <div className="st-logo-controls">
              <input id="logo-upload-input" type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} style={{ display:"none" }} />
              <label htmlFor="logo-upload-input" className="st-upload-zone">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <div>
                  <strong>Click to choose file</strong>
                  <span>{logoFile?.name || (logoFilename ? `Current: ${logoFilename}` : "PNG, JPG or WebP")}</span>
                </div>
              </label>
              <div className="st-logo-actions">
                <button className="st-btn-primary" onClick={uploadLogo} disabled={uploadingLogo || !logoFile}>
                  {uploadingLogo ? <><span className="st-spinner" /> Uploading…</> : "Upload Logo"}
                </button>
                {logoFile && (
                  <button className="st-btn-ghost" onClick={() => setLogoFile(null)}>Cancel</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 2-COL ROW: Status + Prep Time ── */}
        <div className="st-grid-2">

          {/* Active toggle */}
          <div className={`st-card st-status-card ${isActive ? "st-status-card-open" : "st-status-card-closed"}`}>
            <SectionHeader icon={isActive ? "🟢" : "🔴"} title="Restaurant Status" subtitle={isActive ? "Customers can see & order from you" : "Hidden from all customers"} />
            <div className="st-toggle-row">
              <span className="st-toggle-label">{isActive ? "Active" : "Inactive"}</span>
              <button className={`st-toggle ${isActive ? "st-toggle-on" : ""}`} onClick={() => setIsActive(p => !p)} type="button">
                <span className="st-toggle-thumb" />
              </button>
            </div>
            {!isActive && (
              <div className="st-alert st-alert-danger">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Customers cannot place orders right now.
              </div>
            )}
          </div>

          {/* Prep time */}
          <div className="st-card">
            <SectionHeader icon="⏱️" title="Prep Time" subtitle="Estimated preparation time shown to customers" />
            <div className="st-chip-row">
              {[15, 20, 30, 45, 60].map(t => (
                <button key={t} className={`st-chip ${prepTime === t ? "st-chip-active" : ""}`} onClick={() => setPrepTime(t)}>{t}m</button>
              ))}
              <div className="st-custom-input-wrap">
                <input type="number" min={5} max={120} value={prepTime} onChange={e => setPrepTime(Number(e.target.value))} className="st-num-input" />
                <span className="st-input-unit">min</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Address ── */}
        <div className="st-card">
          <SectionHeader icon="📍" title="Display Address" subtitle="Shown on your restaurant card on the homepage." />
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="e.g. Al Gharb, Sharjah"
            className="st-text-input"
          />
        </div>

        {/* ── Delivery Radius ── */}
        <div className="st-card">
          <SectionHeader icon="🚴" title="Delivery Radius" subtitle="Orders outside this range will be rejected. Set to 0 for unlimited delivery.">
            {deliveryRadius === 0 && <span className="st-badge st-badge-green">🌍 Unlimited</span>}
          </SectionHeader>
          <div className="st-chip-row">
            {[3, 5, 10, 15, 20].map(r => (
              <button key={r} className={`st-chip ${deliveryRadius === r ? "st-chip-active" : ""}`} onClick={() => setDeliveryRadius(r)}>{r} km</button>
            ))}
            <button className={`st-chip ${deliveryRadius === 0 ? "st-chip-green" : ""}`} onClick={() => setDeliveryRadius(0)}>∞ Unlimited</button>
            <div className="st-custom-input-wrap">
              <input type="number" min={0} max={200} value={deliveryRadius} onChange={e => setDeliveryRadius(Number(e.target.value))} className="st-num-input" />
              <span className="st-input-unit">km</span>
            </div>
          </div>
          {deliveryRadius > 0 && (
            <div className="st-alert st-alert-warn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Customers more than <strong>{deliveryRadius} km</strong> away cannot place orders.
            </div>
          )}
        </div>

        {/* ── Minimum Order ── */}
        <div className="st-card">
          <SectionHeader icon="🛒" title="Minimum Order Amount" subtitle="Orders below this amount will be rejected. Set to 0 for no minimum.">
            {minimumOrder === 0 && <span className="st-badge st-badge-green">No Minimum</span>}
          </SectionHeader>
          <div className="st-chip-row">
            {[0, 20, 30, 50, 75, 100].map(v => (
              <button key={v} className={`st-chip ${minimumOrder === v ? (v === 0 ? "st-chip-green" : "st-chip-active") : ""}`} onClick={() => setMinimumOrder(v)}>
                {v === 0 ? "None" : `AED ${v}`}
              </button>
            ))}
            <div className="st-custom-input-wrap">
              <span className="st-input-unit" style={{ left: 10, right: "auto" }}>AED</span>
              <input type="number" min={0} max={500} value={minimumOrder} onChange={e => setMinimumOrder(Number(e.target.value))} className="st-num-input" style={{ paddingLeft: 42 }} />
            </div>
          </div>
          {minimumOrder > 0 && (
            <div className="st-alert st-alert-warn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Minimum order is <strong>AED {minimumOrder}</strong>.
            </div>
          )}
        </div>

        {/* ── Delivery Fee Tiers ── */}
        <div className="st-card">
          <SectionHeader icon="🚚" title="Delivery Fee Tiers" subtitle="Set fee per distance bracket. Use AED 0 for free delivery." />
          <div className="st-tiers-list">
            {deliveryTiers.map((tier, i) => (
              <div className="st-tier-row" key={i}>
                <div className="st-tier-index">#{i + 1}</div>
                <div className="st-tier-range">
                  <span className="st-tier-label">Up to</span>
                  {tier.upToKm === null ? (
                    <span className="st-tier-beyond">Beyond</span>
                  ) : (
                    <input type="number" min={1} max={100} value={tier.upToKm ?? ""}
                      onChange={e => { const next = [...deliveryTiers]; next[i] = { ...next[i], upToKm: e.target.value === "" ? "" : Number(e.target.value) }; setDeliveryTiers(next); }}
                      onBlur={() => { const next = [...deliveryTiers]; const p = Number(next[i].upToKm); next[i] = { ...next[i], upToKm: Number.isFinite(p) && p >= 1 ? p : 1 }; setDeliveryTiers(next); }}
                      className="st-tier-input" />
                  )}
                  <span className="st-tier-unit">km</span>
                </div>
                <div className="st-tier-fee">
                  <span className="st-tier-label">Fee</span>
                  <span className="st-tier-unit">AED</span>
                  <input type="number" min={0} max={200} value={tier.fee}
                    onChange={e => { const next = [...deliveryTiers]; next[i] = { ...next[i], fee: Number(e.target.value) }; setDeliveryTiers(next); }}
                    className="st-tier-input" />
                  {tier.fee === 0 && <span className="st-badge st-badge-green" style={{ fontSize: 10 }}>FREE</span>}
                </div>
                {deliveryTiers.length > 1 && tier.upToKm !== null && (
                  <button className="st-tier-remove" onClick={() => setDeliveryTiers(prev => prev.filter((_, j) => j !== i))}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            ))}
            <button className="st-add-tier-btn" onClick={() => {
              const last = deliveryTiers[deliveryTiers.length - 1];
              const secondLast = deliveryTiers[deliveryTiers.length - 2];
              const newUpTo = last.upToKm !== null ? last.upToKm + 5 : (secondLast?.upToKm ?? 5) + 5;
              const updated = deliveryTiers.map((t, i) => i === deliveryTiers.length - 1 ? { ...t, upToKm: newUpTo } : t);
              setDeliveryTiers([...updated, { upToKm: null, fee: 20 }]);
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add tier
            </button>
          </div>
          <div className="st-alert st-alert-info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            The last tier (Beyond) catches all distances beyond the previous bracket.
          </div>
        </div>

        {/* ── Shared Delivery ── */}
        <div className="st-card">
          <SectionHeader icon="🤝" title="Shared Delivery Matching" subtitle="Control how far apart nearby orders can be to qualify for shared delivery." />
          <div className="st-shared-grid">
            {[
              { label: "Customer drop distance", value: sharedDropKm, set: setSharedDropKm, unit: "km", step: 0.5 },
              { label: "Restaurant pickup distance", value: sharedPickupKm, set: setSharedPickupKm, unit: "km", step: 0.5 },
              { label: "Match time window", value: sharedWindowMin, set: setSharedWindowMin, unit: "min", step: 1 },
            ].map(({ label, value, set, unit, step }) => (
              <div key={label} className="st-shared-cell">
                <div className="st-shared-cell-label">{label}</div>
                <div className="st-custom-input-wrap">
                  <input type="number" min={0.5} max={60} step={step} value={value} onChange={e => set(Number(e.target.value))} className="st-num-input" />
                  <span className="st-input-unit">{unit}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="st-alert st-alert-info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Shared delivery is offered only when a nearby active route matches all three limits.
          </div>
        </div>

        {/* ── Location Map ── */}
        <div className="st-card st-card-no-overflow">
          <SectionHeader icon="🗺️" title="Restaurant Location" subtitle="Click the map or drag the pin. Save Settings (top) saves the pin with other settings.">
            <div className="st-map-btn-row">
              <button className="st-btn-ghost" onClick={() => {
                if (!navigator.geolocation) return toast.error("Geolocation not supported");
                navigator.geolocation.getCurrentPosition(
                  pos => { updateLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast.success("GPS location detected!"); },
                  () => toast.error("Enable location permissions first")
                );
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>
                Use My GPS
              </button>
              <button className="st-btn-primary" onClick={saveLocation} disabled={savingLoc}>
                {savingLoc ? <><span className="st-spinner" /> Saving…</> : "Save Location"}
              </button>
            </div>
          </SectionHeader>
          <LocationMap location={location} onChange={updateLocation} />
          <div className="st-coords-bar">
            <span>📌 Lat: <strong>{location.lat.toFixed(5)}</strong></span>
            <span>📌 Lng: <strong>{location.lng.toFixed(5)}</strong></span>
          </div>
        </div>

        {/* ── Opening Hours ── */}
        <div className="st-card st-hours-card">
          <SectionHeader icon="🕐" title="Opening Hours" subtitle="Toggle a day's status · Copy icon applies that day's hours to all days">
            <div className="st-hours-header-actions">
              <button className={`st-btn-ghost ${is24_7 ? "st-btn-ghost-active" : ""}`} onClick={toggle24_7}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {is24_7 ? "24/7 ON" : "Set 24/7"}
              </button>
              <button className="st-btn-ghost" onClick={() => applyToAll(todayKey)} disabled={is24_7}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copy today to all
              </button>
              <button className="st-btn-ghost st-btn-ghost-danger" disabled={is24_7} onClick={() => { setHours(Object.fromEntries(DAYS.map(d => [d, { open:"09:00", close:"22:00", closed:false }]))); setIs24_7(false); toast.success("Hours reset to defaults"); }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                Reset
              </button>
            </div>
          </SectionHeader>

          {is24_7 && (
            <div className="st-247-banner">
              <div className="st-247-banner-left">
                <span className="st-247-icon">🕐</span>
                <div>
                  <div className="st-247-title">Open 24 hours, 7 days a week</div>
                  <div className="st-247-sub">All days set to 12:00 AM – 11:59 PM. Click "24/7 ON" to restore.</div>
                </div>
              </div>
              <button className="st-btn-ghost" onClick={toggle24_7}>Turn off</button>
            </div>
          )}

          <div className={`st-hours-list ${is24_7 ? "st-hours-disabled" : ""}`}>
            {DAYS.map((day, i) => {
              const d = hours[day] || { open:"09:00", close:"22:00", closed:false };
              const isToday = day === todayKey;
              const isLast = i === DAYS.length - 1;
              let durLabel = null;
              if (!d.closed) {
                const [oh, om] = d.open.split(":").map(Number);
                const [ch, cm] = d.close.split(":").map(Number);
                let dur = (ch * 60 + cm) - (oh * 60 + om);
                if (dur <= 0) dur += 24 * 60;
                const hrs = Math.floor(dur / 60), mins = dur % 60;
                durLabel = `${hrs > 0 ? hrs + "h" : ""}${mins > 0 ? " " + mins + "m" : ""}`.trim();
              }
              return (
                <div key={day} className={`st-day-row ${isToday ? "st-day-today" : ""} ${isLast ? "st-day-last" : ""}`}>
                  <div className="st-day-name">
                    {isToday && <span className="st-today-dot" />}
                    <div>
                      <span className={`st-day-label ${d.closed ? "st-day-label-closed" : ""}`}>{DAY_FULL[day]}</span>
                      {isToday && <span className="st-today-tag">Today</span>}
                    </div>
                  </div>

                  <div className="st-day-times">
                    {d.closed ? (
                      <span className="st-closed-text">Closed all day</span>
                    ) : (
                      <>
                        <div className="st-time-group">
                          <span className="st-time-label">From</span>
                          <input type="time" value={d.open} onChange={e => updateDay(day, "open", e.target.value)} className="st-time-input" />
                        </div>
                        <span className="st-time-arrow">→</span>
                        <div className="st-time-group">
                          <span className="st-time-label">To</span>
                          <input type="time" value={d.close} onChange={e => updateDay(day, "close", e.target.value)} className="st-time-input" />
                        </div>
                        {durLabel && <span className="st-duration-tag">{durLabel}</span>}
                      </>
                    )}
                  </div>

                  <div className="st-day-actions">
                    <button className={`st-open-close-btn ${d.closed ? "st-btn-closed" : "st-btn-open"}`} onClick={() => updateDay(day, "closed", !d.closed)}>
                      {d.closed ? "Closed" : "Open"}
                    </button>
                    <button className="st-copy-day-btn" title={`Copy ${DAY_FULL[day]} to all days`} onClick={() => applyToAll(day)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Week summary footer */}
          <div className="st-week-summary">
            {DAYS.map(day => {
              const d = hours[day] || {};
              const isToday = day === todayKey;
              return (
                <div key={day} className={`st-week-cell ${isToday ? "st-week-cell-today" : ""} ${d.closed ? "st-week-cell-closed" : ""}`}>
                  <span className="st-week-day">{DAY_SHORT[day]}</span>
                  {d.closed ? (
                    <span className="st-week-closed">—</span>
                  ) : (
                    <span className="st-week-time">{fmt12(d.open)}<br />{fmt12(d.close)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </RestaurantLayout>
  );
}