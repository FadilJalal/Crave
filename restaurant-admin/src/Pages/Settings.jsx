import { useEffect, useState, useRef } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { BASE_URL } from "../utils/api";
import { toast } from "react-toastify";
import { useTheme } from "../ThemeContext";

/* ─── Constants ───────────────────────────────────────────────── */
const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const DAY_SHORT = { monday:"Mon", tuesday:"Tue", wednesday:"Wed", thursday:"Thu", friday:"Fri", saturday:"Sat", sunday:"Sun" };
const DAY_FULL  = { monday:"Monday", tuesday:"Tuesday", wednesday:"Wednesday", thursday:"Thursday", friday:"Friday", saturday:"Saturday", sunday:"Sunday" };

const DEFAULT_HOURS = Object.fromEntries(
  DAYS.map(d => [d, { open: "09:00", close: "22:00", closed: false }])
);

/* ─── Helpers ─────────────────────────────────────────────────── */
function computeIsOpenNow(openingHours, isActive) {
  if (!isActive) return false;
  if (!openingHours) return isActive;
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const weekday = (parts.find((p) => p.type === "weekday")?.value || "monday").toLowerCase();
  const hour    = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute  = Number(parts.find((p) => p.type === "minute")?.value || 0);
  const mins    = hour * 60 + minute;
  const idx     = Math.max(0, DAYS.indexOf(weekday));
  const today   = DAYS[idx];
  const prev    = DAYS[(idx + 6) % 7];
  const parse   = (t) => {
    if (!t || !t.includes(":")) return null;
    const [h, m] = t.split(":").map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  };
  const h = openingHours[today];
  if (h && !h.closed) {
    if (h.open === "00:00" && h.close === "23:59") return true;
    const openMins  = parse(h.open);
    const closeMins = parse(h.close);
    if (openMins !== null && closeMins !== null) {
      if (closeMins <= openMins) { if (mins >= openMins) return true; }
      else if (mins >= openMins && mins < closeMins) return true;
    }
  }
  const prevH = openingHours[prev];
  if (prevH && !prevH.closed) {
    const prevOpen  = parse(prevH.open);
    const prevClose = parse(prevH.close);
    if (prevOpen !== null && prevClose !== null && prevClose <= prevOpen) {
      if (mins < prevClose) return true;
    }
  }
  return false;
}

/* ─── Leaflet Map ─────────────────────────────────────────────── */
function LocationMap({ location, onChange, dark = false }) {
  const mapRef      = useRef(null);
  const leafletRef  = useRef(null);
  const markerRef   = useRef(null);
  const onChangeRef = useRef(onChange);
  const [search,    setSearch]    = useState("");
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => { onChangeRef.current = onChange; });
  const resultsRef = useRef([]);
  useEffect(() => { resultsRef.current = results; });

  const doSearch = async (q) => {
    if (!q || q.length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const params = new URLSearchParams({ format:"json", limit:"8", q, countrycodes:"ae", addressdetails:"1", viewbox:"51.5,22.5,56.5,26.5", bounded:"0" });
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { "Accept-Language":"en", Accept:"application/json" } });
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
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
    }).addTo(leafletRef.current);
    leafletRef.current.on("click", (e) => {
      const { lat, lng } = e.latlng;
      markerRef.current?.setLatLng([lat, lng]);
      onChangeRef.current({ lat, lng });
    });
    leafletRef.current.setView([location.lat, location.lng], 15);
    const pinIcon = L.divIcon({
      className: "",
      html: `<div style="width:20px;height:20px;border-radius:50%;background:#ff4e2a;border:3px solid white;box-shadow:0 0 0 2px #ff4e2a,0 4px 12px rgba(0,0,0,0.35);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    markerRef.current = L.marker([location.lat, location.lng], { icon: pinIcon, draggable: true }).addTo(leafletRef.current);
    markerRef.current.on("dragend", (e) => {
      const { lat, lng } = e.target.getLatLng();
      onChangeRef.current({ lat, lng });
    });
    return () => {
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; markerRef.current = null; }
    };
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
    else if (!searching && search.trim().length >= 3) toast.warning('No matches yet — try e.g. "Al Heera, Sharjah".');
  };

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", position: "relative", zIndex: 5000, background: dark ? "#0f172a" : "#fafafa" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", background: dark ? "#1e293b" : "white" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search UAE address — press Enter to move pin"
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, fontFamily: "inherit", color: dark ? "#f1f5f9" : "#0f172a" }}
          />
          {searching && <span style={{ fontSize: 11, color: "var(--muted)" }}>Searching…</span>}
          {search && (
            <button type="button" onClick={() => { setSearch(""); setResults([]); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--muted)", lineHeight: 1, padding: 0 }}>×</button>
          )}
        </div>
        {results.length > 0 && (
          <div style={{
            position: "absolute", top: "calc(100% - 2px)", left: 12, right: 12,
            background: dark ? "#1e293b" : "white", border: "1px solid var(--border)", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 6000, overflow: "hidden", maxHeight: 200, overflowY: "auto",
          }}>
            {results.map((r, i) => (
              <div key={`${r.place_id ?? r.osm_id}-${i}`} onClick={() => pickResult(r)}
                style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: i < results.length - 1 ? "1px solid var(--border)" : "none" }}
                onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ fontWeight: 600, color: dark ? "#f1f5f9" : "#0f172a", fontSize: 13 }}>{(r.display_name || "").split(",")[0]}</div>
                <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.display_name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div ref={mapRef} style={{ height: 280, width: "100%", position: "relative", zIndex: 1 }} />
    </div>
  );
}

/* ─── Reusable UI pieces ──────────────────────────────────────── */
const FieldLabel = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>{children}</div>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: "var(--card-bg,white)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, ...style }}>{children}</div>
);

const SectionTitle = ({ children }) => (
  <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "var(--text,#0f172a)", letterSpacing: "-0.01em" }}>{children}</h3>
);

const SectionSub = ({ children }) => (
  <p style={{ margin: "0 0 24px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>{children}</p>
);

const NumberInput = ({ value, onChange, unit, min }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
    <input type="number" value={value} min={min ?? 0} onChange={onChange}
      style={{ flex: 1, padding: "10px 14px", border: "none", background: "transparent", fontWeight: 700, fontSize: 14, outline: "none", color: "inherit", fontFamily: "inherit" }} />
    <div style={{ padding: "0 14px", fontSize: 12, fontWeight: 700, color: "var(--muted)", background: "var(--unit-bg, #f8fafc)", borderLeft: "1px solid var(--border)", height: "100%", display: "flex", alignItems: "center", minWidth: 44 }}>{unit}</div>
  </div>
);

/* ─── Main Page ───────────────────────────────────────────────── */
export default function Settings() {
  const { dark } = useTheme();

  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
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
  const [sharedWindowMin,setSharedWindowMin] = useState(12);
  const [deliveryTiers,  setDeliveryTiers]  = useState([
    { upToKm: 3,    fee: 5  },
    { upToKm: 7,    fee: 10 },
    { upToKm: null, fee: 15 },
  ]);
  const [address,    setAddress]    = useState("");
  const [hours,      setHours]      = useState(DEFAULT_HOURS);
  const [openNow,    setOpenNow]    = useState(false);
  const [is24_7,     setIs24_7]     = useState(false);
  const [savedHours, setSavedHours] = useState(null);
  const [location,   setLocation]   = useState({ lat: 25.2048, lng: 55.2708 });
  const locationRef  = useRef({ lat: 25.2048, lng: 55.2708 });
  const [activeTab,  setActiveTab]  = useState("profile");

  const updateLocation = (coords) => { locationRef.current = coords; setLocation(coords); };

  const toggle24_7 = () => {
    if (!is24_7) {
      setSavedHours(hours);
      setHours(Object.fromEntries(DAYS.map(d => [d, { open: "00:00", close: "23:59", closed: false }])));
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
        if (r.sharedDelivery) {
          setSharedDropKm(r.sharedDelivery.maxDropDistanceKm ?? 3);
          setSharedPickupKm(r.sharedDelivery.maxPickupDistanceKm ?? 1);
          setSharedWindowMin(r.sharedDelivery.matchWindowMin ?? 10);
        }
        if (r.deliveryTiers?.length) setDeliveryTiers(r.deliveryTiers);
        setAddress(r.address || "");
        const h = { ...DEFAULT_HOURS, ...(r.openingHours || {}) };
        setHours(h);
        setOpenNow(computeIsOpenNow(h, r.isActive ?? true));
        const lat = Number(r.location?.lat);
        const lng = Number(r.location?.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) updateLocation({ lat, lng });
        setIs24_7(DAYS.every(d => h[d]?.open === "00:00" && h[d]?.close === "23:59" && !h[d]?.closed));
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

  const updateDay    = (day, field, value) => setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  const applyToAll   = (sourceDay) => { setHours(Object.fromEntries(DAYS.map(d => [d, { ...hours[sourceDay] }]))); toast.success(`${DAY_FULL[sourceDay]}'s hours applied to all days`); };

  const save = async () => {
    const { lat, lng } = locationRef.current;
    const nLat = Number(lat), nLng = Number(lng);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) { toast.error("Set a valid location on the map first."); return; }
    setSaving(true);
    try {
      const payload = { isActive, avgPrepTime: prepTime, openingHours: hours, deliveryRadius, minimumOrder, deliveryTiers, address, location: { lat: nLat, lng: nLng }, sharedDelivery: { maxDropDistanceKm: sharedDropKm, maxPickupDistanceKm: sharedPickupKm, matchWindowMin: sharedWindowMin } };
      const res = await api.post("/api/restaurantadmin/settings", payload);
      if (res.data?.success) {
        toast.success("Settings saved successfully");
        try {
          const info = JSON.parse(localStorage.getItem("restaurantInfo") || "{}");
          const loc  = res.data.data?.location;
          localStorage.setItem("restaurantInfo", JSON.stringify({ ...info, isActive, avgPrepTime: prepTime, openingHours: hours, deliveryRadius, minimumOrder, deliveryTiers, sharedDelivery: { maxDropDistanceKm: sharedDropKm, maxPickupDistanceKm: sharedPickupKm, matchWindowMin: sharedWindowMin }, address, ...(loc?.lat != null && loc?.lng != null ? { location: loc } : {}) }));
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
      const res = await api.post("/api/restaurantadmin/logo", form, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data?.success) {
        const updated = res.data.data;
        setLogoFilename(updated?.logo || "");
        setLogoFile(null);
        try { const info = JSON.parse(localStorage.getItem("restaurantInfo") || "{}"); localStorage.setItem("restaurantInfo", JSON.stringify({ ...info, ...updated })); } catch {}
        toast.success("Logo updated successfully");
      } else toast.error(res.data?.message || "Failed to update logo");
    } catch { toast.error("Network error"); }
    finally { setUploadingLogo(false); }
  };

  /* ─── Inline styles (CSS-in-JS tokens) ───────────────────── */
  const css = `
    .s-tab-btn { transition: background 0.15s, color 0.15s; }
    .s-tab-btn:hover { background: ${dark ? "rgba(255,255,255,0.06)" : "#f1f5f9"} !important; color: #0f172a !important; }
    .s-pill-btn { transition: background 0.15s, border-color 0.15s; cursor: pointer; }
    .s-pill-btn:hover { opacity: 0.85; }
    .s-icon-btn:hover { opacity: 0.7; }
    .s-row-hover:hover { background: ${dark ? "rgba(255,255,255,0.03)" : "#f8fafc"} !important; }
    .s-time-input { padding: 7px 10px; border-radius: 8px; border: 1px solid var(--border); background: transparent; font-weight: 600; font-size: 13px; color: inherit; font-family: inherit; outline: none; transition: border-color 0.15s; }
    .s-time-input:focus { border-color: #ff4e2a; }
    .s-text-input { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border); background: transparent; font-weight: 500; font-size: 14px; color: inherit; font-family: inherit; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
    .s-text-input:focus { border-color: #ff4e2a; }
    .s-num-input { flex: 1; padding: 10px 14px; border: none; background: transparent; font-weight: 700; font-size: 14px; outline: none; color: inherit; font-family: inherit; }
    .s-num-input::-webkit-inner-spin-button { opacity: 0; }
    .s-save-btn { padding: 10px 28px; border-radius: 10px; border: none; background: #ff4e2a; color: white; font-weight: 700; font-size: 13.5px; cursor: pointer; letter-spacing: 0.01em; transition: opacity 0.15s, transform 0.1s; }
    .s-save-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
    .s-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `;

  /* ── Tab definitions ───────────────────────────────────────── */
  const tabs = [
    { id: "profile",   label: "Store Profile",    icon: <StorefrontIcon /> },
    { id: "operation", label: "Operations",        icon: <ClockIcon /> },
    { id: "delivery",  label: "Delivery Rules",    icon: <TruckIcon /> },
    { id: "matching",  label: "Shared Matching",   icon: <ShareIcon /> },
  ];

  if (loading) return (
    <RestaurantLayout>
      <style>{css}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 800, margin: "0 auto" }}>
        {[1,2,3].map(i => <div key={i} style={{ height: 80, background: dark ? "rgba(255,255,255,0.04)" : "#f1f5f9", borderRadius: 14, animation: "pulse 1.5s ease-in-out infinite" }} />)}
      </div>
    </RestaurantLayout>
  );

  return (
    <RestaurantLayout>
      <style>{css}</style>
      <div style={{ width: "100%", maxWidth: 1060, margin: "0 auto", padding: "0 4px 56px" }}>

        {/* ── Page Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: dark ? "#f1f5f9" : "#0f172a", letterSpacing: "-0.02em" }}>Settings</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>Manage your store configuration and delivery preferences</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Status badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, background: openNow ? (dark ? "rgba(34,197,94,0.12)" : "#f0fdf4") : (dark ? "rgba(239,68,68,0.1)" : "#fff1f2"), border: `1px solid ${openNow ? (dark ? "rgba(34,197,94,0.2)" : "#bbf7d0") : (dark ? "rgba(239,68,68,0.2)" : "#fecdd3")}` }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: openNow ? "#22c55e" : "#ef4444" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: openNow ? (dark ? "#4ade80" : "#15803d") : (dark ? "#f87171" : "#dc2626"), letterSpacing: "0.03em" }}>
                {openNow ? "Open now" : "Closed"}
              </span>
            </div>
            <button className="s-save-btn" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24, alignItems: "start" }}>

          {/* Sidebar */}
          <nav style={{ background: dark ? "rgba(255,255,255,0.03)" : "white", borderRadius: 14, border: "1px solid var(--border)", padding: 6, position: "sticky", top: 20 }}>
            {tabs.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} className="s-tab-btn"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 13px",
                    borderRadius: 10, border: "none",
                    background: active ? (dark ? "rgba(255,78,42,0.12)" : "#fff5f2") : "transparent",
                    color: active ? "#ff4e2a" : "var(--muted)",
                    fontWeight: active ? 700 : 500, fontSize: 13.5, cursor: "pointer", textAlign: "left",
                    marginBottom: 2,
                  }}>
                  <span style={{ opacity: active ? 1 : 0.6, display: "flex" }}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Content panels */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── PROFILE TAB ── */}
            {activeTab === "profile" && (
              <>
                <Card>
                  <SectionTitle>Logo & Branding</SectionTitle>
                  <SectionSub>Your logo appears on the map and in customer order confirmations.</SectionSub>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
                    <div style={{ width: 88, height: 88, borderRadius: 14, border: "1px solid var(--border)", background: dark ? "#1e293b" : "#f8fafc", display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0 }}>
                      {(logoPreview || logoFilename)
                        ? <img src={logoPreview || `${BASE_URL}/images/${logoFilename}`} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>No logo</span>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                      {logoFile && <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>Selected: <strong style={{ color: "inherit" }}>{logoFile.name}</strong></p>}
                      <div style={{ display: "flex", gap: 10 }}>
                        <input id="logo-upload-input" type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
                        <label htmlFor="logo-upload-input" style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", fontWeight: 600, fontSize: 13, cursor: "pointer", color: "inherit" }}>
                          Choose File
                        </label>
                        <button onClick={uploadLogo} disabled={uploadingLogo || !logoFile}
                          style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: dark ? "#1e293b" : "#0f172a", color: "white", fontWeight: 700, fontSize: 13, cursor: (uploadingLogo || !logoFile) ? "not-allowed" : "pointer", opacity: (!logoFile) ? 0.45 : 1 }}>
                          {uploadingLogo ? "Uploading…" : "Upload Logo"}
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <SectionTitle>Location & Address</SectionTitle>
                  <SectionSub>Pin your exact location so customers and drivers can find you.</SectionSub>

                  <div style={{ marginBottom: 20 }}>
                    <FieldLabel>Display Address</FieldLabel>
                    <input className="s-text-input" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. Al Gharb, Sharjah" />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <FieldLabel>Map Pin</FieldLabel>
                    <button onClick={() => navigator.geolocation.getCurrentPosition(pos => updateLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }))}
                      style={{ background: "none", border: "none", color: "#ff4e2a", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
                      Use GPS
                    </button>
                  </div>
                  <LocationMap location={location} onChange={updateLocation} dark={dark} />
                  <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "var(--muted)" }}>
                    Coordinates: <code style={{ fontSize: 11 }}>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</code>
                  </p>
                </Card>
              </>
            )}

            {/* ── OPERATIONS TAB ── */}
            {activeTab === "operation" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  {/* Store toggle */}
                  <Card style={{ padding: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div>
                        <SectionTitle>Store Status</SectionTitle>
                        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--muted)" }}>{isActive ? "Accepting orders" : "Not visible to customers"}</p>
                      </div>
                      <button onClick={() => setIsActive(!isActive)} style={{
                        padding: "7px 16px", borderRadius: 8, border: "none", flexShrink: 0,
                        background: isActive ? "#dcfce7" : "#fee2e2",
                        color: isActive ? "#16a34a" : "#dc2626",
                        fontWeight: 700, fontSize: 12.5, cursor: "pointer"
                      }}>{isActive ? "Online" : "Offline"}</button>
                    </div>
                    <div style={{ marginTop: 18, height: 3, borderRadius: 99, background: dark ? "rgba(255,255,255,0.06)" : "#f1f5f9" }}>
                      <div style={{ height: "100%", borderRadius: 99, background: isActive ? "#22c55e" : "#ef4444", width: isActive ? "100%" : "0%", transition: "width 0.4s ease" }} />
                    </div>
                  </Card>

                  {/* Prep time */}
                  <Card style={{ padding: 24 }}>
                    <SectionTitle>Preparation Time</SectionTitle>
                    <p style={{ margin: "4px 0 16px", fontSize: 12.5, color: "var(--muted)" }}>Shown to customers at checkout</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[15, 30, 45, 60].map(t => (
                        <button key={t} className="s-pill-btn" onClick={() => setPrepTime(t)} style={{
                          flex: 1, padding: "8px 0", borderRadius: 8,
                          border: `1.5px solid ${prepTime === t ? "#ff4e2a" : "var(--border)"}`,
                          background: prepTime === t ? (dark ? "rgba(255,78,42,0.12)" : "#fff5f2") : "transparent",
                          color: prepTime === t ? "#ff4e2a" : "var(--muted)",
                          fontWeight: 700, fontSize: 13,
                        }}>{t}m</button>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Operating hours */}
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <SectionTitle>Operating Hours</SectionTitle>
                      <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--muted)" }}>Set your weekly schedule</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => applyToAll(todayKey)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                        Copy today to all
                      </button>
                      <button onClick={toggle24_7} style={{ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${is24_7 ? "#ff4e2a" : "var(--border)"}`, background: is24_7 ? (dark ? "rgba(255,78,42,0.1)" : "#fff5f2") : "transparent", color: is24_7 ? "#ff4e2a" : "var(--muted)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        24 / 7
                      </button>
                    </div>
                  </div>

                  <div style={{ opacity: is24_7 ? 0.35 : 1, pointerEvents: is24_7 ? "none" : "auto" }}>
                    {DAYS.map((day, idx) => {
                      const isToday  = day === todayKey;
                      const isClosed = hours[day]?.closed;
                      const [oh, om] = (hours[day]?.open  || "00:00").split(":").map(Number);
                      const [ch, cm] = (hours[day]?.close || "00:00").split(":").map(Number);
                      let dur = (ch * 60 + cm) - (oh * 60 + om);
                      if (dur <= 0) dur += 24 * 60;

                      return (
                        <div key={day} className="s-row-hover" style={{
                          display: "grid", gridTemplateColumns: "108px 1fr auto auto", gap: 16, alignItems: "center",
                          padding: "13px 24px",
                          borderBottom: idx < 6 ? "1px solid var(--border)" : "none",
                          background: isToday ? (dark ? "rgba(255,255,255,0.02)" : "#fafafa") : "transparent",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {isToday && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff4e2a", flexShrink: 0 }} />}
                            <span style={{ fontWeight: isToday ? 700 : 500, fontSize: 13.5, color: isToday ? (dark ? "#f1f5f9" : "#0f172a") : "var(--muted)" }}>{DAY_FULL[day]}</span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {isClosed
                              ? <span style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>Closed</span>
                              : <>
                                  <input className="s-time-input" type="time" value={hours[day].open}  onChange={e => updateDay(day, "open",  e.target.value)} />
                                  <span style={{ color: "var(--muted)", fontSize: 12 }}>–</span>
                                  <input className="s-time-input" type="time" value={hours[day].close} onChange={e => updateDay(day, "close", e.target.value)} />
                                  <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, background: dark ? "rgba(255,255,255,0.06)" : "#f1f5f9", padding: "3px 8px", borderRadius: 6 }}>
                                    {Math.floor(dur/60)}h {dur%60 > 0 ? `${dur%60}m` : ""}
                                  </span>
                                </>}
                          </div>

                          <button onClick={() => updateDay(day, "closed", !isClosed)} style={{
                            padding: "5px 12px", borderRadius: 7, border: "none",
                            background: isClosed ? (dark ? "rgba(239,68,68,0.12)" : "#fee2e2") : (dark ? "rgba(34,197,94,0.1)" : "#dcfce7"),
                            color: isClosed ? "#dc2626" : "#16a34a",
                            fontWeight: 700, fontSize: 11.5, cursor: "pointer", letterSpacing: "0.02em",
                          }}>{isClosed ? "Closed" : "Open"}</button>

                          <button className="s-icon-btn" title="Copy to all days" onClick={() => applyToAll(day)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 14, padding: 4 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </>
            )}

            {/* ── DELIVERY TAB ── */}
            {activeTab === "delivery" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <Card style={{ padding: 24 }}>
                    <SectionTitle>Delivery Radius</SectionTitle>
                    <p style={{ margin: "4px 0 16px", fontSize: 12.5, color: "var(--muted)" }}>Maximum distance from restaurant</p>
                    <NumberInput value={deliveryRadius} onChange={e => setDeliveryRadius(e.target.value === "" ? "" : Number(e.target.value))} unit="km" />
                  </Card>
                  <Card style={{ padding: 24 }}>
                    <SectionTitle>Minimum Order</SectionTitle>
                    <p style={{ margin: "4px 0 16px", fontSize: 12.5, color: "var(--muted)" }}>Required checkout total</p>
                    <NumberInput value={minimumOrder} onChange={e => setMinimumOrder(e.target.value === "" ? "" : Number(e.target.value))} unit="AED" />
                  </Card>
                </div>

                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <SectionTitle>Delivery Fee Tiers</SectionTitle>
                      <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--muted)" }}>Charge based on delivery distance</p>
                    </div>
                    <button onClick={() => setDeliveryTiers([...deliveryTiers.filter(t => t.upToKm !== null), { upToKm: deliveryTiers.length * 5, fee: 15 }, { upToKm: null, fee: 20 }])}
                      style={{ background: "none", border: "none", color: "#ff4e2a", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                      + Add tier
                    </button>
                  </div>

                  {/* Table header */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 16, padding: "8px 16px", marginBottom: 6 }}>
                    <FieldLabel>Distance limit</FieldLabel>
                    <FieldLabel>Fee (AED)</FieldLabel>
                    <div style={{ width: 20 }} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {deliveryTiers.map((tier, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 16, alignItems: "center", padding: "12px 16px", border: "1px solid var(--border)", borderRadius: 10 }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5, color: "inherit" }}>
                          {tier.upToKm === null ? "Beyond all tiers" : `Up to ${tier.upToKm} km`}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                          <input type="number" className="s-num-input" value={tier.fee} onChange={e => {
                            const next = [...deliveryTiers];
                            next[i].fee = e.target.value === "" ? "" : Number(e.target.value);
                            setDeliveryTiers(next);
                          }} style={{ flex: 1, padding: "7px 12px", border: "none", background: "transparent", fontWeight: 700, fontSize: 13.5, outline: "none", color: "inherit", fontFamily: "inherit", width: "100%" }} />
                          <span style={{ padding: "0 12px", fontSize: 12, fontWeight: 700, color: "var(--muted)", borderLeft: "1px solid var(--border)", background: dark ? "rgba(255,255,255,0.04)" : "#f8fafc", lineHeight: "38px" }}>AED</span>
                        </div>
                        {deliveryTiers.length > 1 && tier.upToKm !== null
                          ? <button onClick={() => setDeliveryTiers(deliveryTiers.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, padding: 4, lineHeight: 1 }}>×</button>
                          : <div style={{ width: 28 }} />}
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {/* ── MATCHING TAB ── */}
            {activeTab === "matching" && (
              <Card>
                <SectionTitle>Shared Delivery Configuration</SectionTitle>
                <SectionSub>Control how orders are bundled together for dual-stop deliveries.</SectionSub>

                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    { label: "Customer Drop Radius", sub: "Max distance between two drop-off points to allow bundling", value: sharedDropKm, setter: setSharedDropKm, unit: "km" },
                    { label: "Pickup Window", sub: "Max time gap between orders to be bundled together", value: sharedWindowMin, setter: setSharedWindowMin, unit: "min" },
                  ].map((row, i, arr) => (
                    <div key={row.label} style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 24, alignItems: "center", padding: "22px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{row.label}</div>
                        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{row.sub}</div>
                      </div>
                      <NumberInput value={row.value} onChange={e => row.setter(e.target.value === "" ? "" : Number(e.target.value))} unit={row.unit} />
                    </div>
                  ))}
                </div>
              </Card>
            )}

          </div>
        </div>
      </div>
    </RestaurantLayout>
  );
}

/* ─── Inline SVG icons ────────────────────────────────────────── */
const StorefrontIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const TruckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const ShareIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);