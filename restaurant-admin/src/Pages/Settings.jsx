import { useEffect, useState, useRef } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { BASE_URL } from "../utils/api";
import { toast } from "react-toastify";
import { useTheme } from "../ThemeContext";

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
    timeZone: "Asia/Dubai",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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
      if (closeMins <= openMins) {
        if (mins >= openMins) return true;
      } else if (mins >= openMins && mins < closeMins) {
        return true;
      }
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

// ── Inline Leaflet map (uses window.L from CDN) ──────────────────────────────
function LocationMap({ location, onChange, dark = false }) {
  const mapRef      = useRef(null);
  const leafletRef  = useRef(null);
  const markerRef   = useRef(null);
  const onChangeRef = useRef(onChange);   // always-fresh callback ref
  const [search,    setSearch]   = useState("");
  const [results,   setResults]  = useState([]);
  const [searching, setSearching] = useState(false);

  // Keep onChangeRef current on every render
  useEffect(() => { onChangeRef.current = onChange; });

  const resultsRef = useRef([]);
  useEffect(() => { resultsRef.current = results; });

  // Search via Nominatim (UAE-biased — same region as your restaurants)
  const doSearch = async (q) => {
    if (!q || q.length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const params = new URLSearchParams({
        format: "json",
        limit: "8",
        q,
        countrycodes: "ae",
        addressdetails: "1",
        // Prefer UAE bbox (lon min, lat min, lon max, lat max)
        viewbox: "51.5,22.5,56.5,26.5",
        bounded: "0",
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { "Accept-Language": "en", Accept: "application/json" },
      });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

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

  // Init map once
  useEffect(() => {
    if (!window.L || !mapRef.current || leafletRef.current) return;
    const L = window.L;

    leafletRef.current = L.map(mapRef.current, { zoomControl: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
    }).addTo(leafletRef.current);
    mapRef.current.style.cursor = "crosshair";

    // Click to place pin
    leafletRef.current.on("click", (e) => {
      const { lat, lng } = e.latlng;
      markerRef.current?.setLatLng([lat, lng]);
      onChangeRef.current({ lat, lng });   // always uses latest setter
    });

    leafletRef.current.setView([location.lat, location.lng], 15);

    // Pin icon
    const pinIcon = L.divIcon({
      className: "",
      html: `<div style="
        width:22px;height:22px;border-radius:50%;
        background:#ff4e2a;border:3px solid white;
        box-shadow:0 0 0 2px #ff4e2a,0 4px 12px rgba(0,0,0,0.35);
      "></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    markerRef.current = L.marker([location.lat, location.lng], { icon: pinIcon, draggable: true })
      .addTo(leafletRef.current);

    markerRef.current.on("dragend", (e) => {
      const { lat, lng } = e.target.getLatLng();
      onChangeRef.current({ lat, lng });
    });

    return () => {
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; markerRef.current = null; }
    };
  }, []); // only once

  // Sync marker when location prop changes externally (GPS button)
  useEffect(() => {
    if (!leafletRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([location.lat, location.lng]);
    leafletRef.current.flyTo([location.lat, location.lng], 17, { duration: 1.2 });
  }, [location.lat, location.lng]);

  const onSearchKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const list = resultsRef.current;
    if (list.length > 0) {
      pickResult(list[0]);
    } else if (!searching && search.trim().length >= 3) {
      toast.warning("No matches yet — wait for results or try e.g. “Al Heera, Sharjah”.");
    }
  };

  return (
    <div>
      {/* z-index above Leaflet map tiles so the dropdown is not hidden under the map */}
      <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)", position:"relative", zIndex: 5000 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10,
          border:"1.5px solid var(--border)", borderRadius:10,
          padding:"8px 14px", background: dark ? "#0f172a" : "#f9fafb" }}>
          <span style={{ fontSize:16 }}>🔍</span>
          <input
            className="settings-map-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search UAE — then click a result or press Enter"
            style={{ flex:1, border:"none", background:"transparent",
              outline:"none", fontSize:14, fontFamily:"inherit", color: dark ? "#f9fafb" : "#111827" }}
          />
          {searching && <span style={{ fontSize:12, color:"var(--muted)" }}>searching…</span>}
          {search && (
            <button type="button" onClick={() => { setSearch(""); setResults([]); }}
              style={{ background:"none", border:"none", cursor:"pointer",
                fontSize:18, color:"var(--muted)", lineHeight:1, padding:0 }}>×</button>
          )}
        </div>
        <p style={{ margin:"8px 0 0", fontSize:11, color:"var(--muted)", lineHeight:1.4 }}>
          Results appear below — <strong>click one</strong> or press <strong>Enter</strong> to move the pin. Typing alone does not move the map.
        </p>
        {results.length > 0 && (
          <div style={{
            position:"absolute", top:"calc(100% - 4px)", left:16, right:16,
            background: dark ? "#0f172a" : "white", border:"1px solid var(--border)", borderRadius:10,
            boxShadow:"0 12px 32px rgba(0,0,0,0.15)", zIndex:6000, overflow:"hidden", maxHeight:220, overflowY:"auto",
          }}>
            {results.map((r, i) => (
              <div
                key={`${r.place_id ?? r.osm_id ?? "r"}-${i}-${r.lat}`}
                onClick={() => pickResult(r)}
                style={{ padding:"10px 14px", cursor:"pointer", fontSize:13,
                  borderBottom:"1px solid #f3f4f6" }}
                onMouseEnter={e => { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "#f9fafb"; }}
                onMouseLeave={e => { e.currentTarget.style.background = dark ? "#0f172a" : "white"; }}
              >
                <div style={{ fontWeight:700, color: dark ? "#f9fafb" : "#111827" }}>{(r.display_name || "").split(",")[0]}</div>
                <div style={{ color:"var(--muted)", fontSize:11, marginTop:2,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {r.display_name}
                </div>
              </div>
            ))}
          </div>
        )}
        {!searching && search.length >= 3 && results.length === 0 && (
          <p style={{ margin:"8px 0 0", fontSize:11, color:"#b45309" }}>
            No places found — try simpler text (e.g. “Al Heera Sharjah”).
          </p>
        )}
      </div>
      <div ref={mapRef} style={{ height:280, width:"100%", cursor:"crosshair", position:"relative", zIndex:1 }} />
    </div>
  );
}

export default function Settings() {
  const { dark } = useTheme();
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [savingLoc,  setSavingLoc]  = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFile,      setLogoFile]      = useState(null);
  const [logoPreview,   setLogoPreview]   = useState("");
  const [logoFilename,  setLogoFilename]  = useState("");
  const [isActive,   setIsActive]   = useState(true);
  const [prepTime,   setPrepTime]   = useState(15);
  const [deliveryRadius, setDeliveryRadius] = useState(10);
  const [minimumOrder,   setMinimumOrder]   = useState(0);
  const [sharedDropKm, setSharedDropKm] = useState(2);
  const [sharedPickupKm, setSharedPickupKm] = useState(2);
  const [sharedWindowMin, setSharedWindowMin] = useState(12);

  const [deliveryTiers,  setDeliveryTiers]  = useState([
    { upToKm: 3,    fee: 5  },
    { upToKm: 7,    fee: 10 },
    { upToKm: null, fee: 15 },
  ]);

  const [address,    setAddress]    = useState('');
  const [hours,      setHours]      = useState(DEFAULT_HOURS);
  const [openNow,    setOpenNow]    = useState(false);
  const [is24_7,     setIs24_7]     = useState(false);
  const [savedHours, setSavedHours] = useState(null);
  const [location,   setLocation]   = useState({ lat: 25.2048, lng: 55.2708 });
  const locationRef  = useRef({ lat: 25.2048, lng: 55.2708 }); // always-fresh ref

  const updateLocation = (coords) => {
    locationRef.current = coords;
    setLocation(coords);
  };

  const toggle24_7 = () => {
    if (!is24_7) {
      setSavedHours(hours);
      setHours(Object.fromEntries(DAYS.map(d => [d, { open: "00:00", close: "23:59", closed: false }])));
      setIs24_7(true);
      toast.success("Set to 24/7 \u2014 remember to save!");
    } else {
      setHours(savedHours || DEFAULT_HOURS);
      setSavedHours(null);
      setIs24_7(false);
      toast.success("Restored previous hours \u2014 remember to save!");
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

        setAddress(r.address || '');
        const h = { ...DEFAULT_HOURS, ...(r.openingHours || {}) };
        setHours(h);
        setOpenNow(computeIsOpenNow(h, r.isActive ?? true));
        const lat = Number(r.location?.lat);
        const lng = Number(r.location?.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          updateLocation({ lat, lng });
        }
        // Detect if already saved as 24/7
        const all24 = DAYS.every(d => h[d]?.open === "00:00" && h[d]?.close === "23:59" && !h[d]?.closed);
        setIs24_7(all24);
      }
    } catch { toast.error("Failed to load settings"); }
    finally   { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview("");
      return;
    }
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
    console.log("[saveLocation] sending lat:", lat, "lng:", lng);
    setSavingLoc(true);
    try {
      const res = await api.post("/api/restaurantadmin/location", { lat, lng });
      if (res.data?.success) toast.success("Location saved! The delivery map will now work.");
      else toast.error(res.data?.message || "Failed to save location");
    } catch (e) {
      console.error("[saveLocation] error:", e);
      toast.error("Network error");
    }
    finally { setSavingLoc(false); }
  };

  const save = async () => {
    const { lat, lng } = locationRef.current;
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) {
      toast.error("Set a valid location on the map first.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        isActive,
        avgPrepTime: prepTime,
        openingHours: hours,
        deliveryRadius,
        minimumOrder,
        deliveryTiers,
        address,
        location: { lat: nLat, lng: nLng },
        sharedDelivery: {
          maxDropDistanceKm: sharedDropKm,
          maxPickupDistanceKm: sharedPickupKm,
          matchWindowMin: sharedWindowMin,
        },
      };
      console.log("[Settings] Saving payload:", payload);
      const res = await api.post("/api/restaurantadmin/settings", payload);

      console.log("[Settings] Server response:", res.data);
      if (res.data?.success) {
        toast.success(`Settings saved! Address → "${res.data.data?.address}"`);
        try {
          const info = JSON.parse(localStorage.getItem("restaurantInfo") || "{}");
          const loc = res.data.data?.location;
          localStorage.setItem(
            "restaurantInfo",
            JSON.stringify({
              ...info,
              isActive,
              avgPrepTime: prepTime,
              openingHours: hours,
              deliveryRadius,
              minimumOrder,
              deliveryTiers,
              sharedDelivery: {
                maxDropDistanceKm: sharedDropKm,
                maxPickupDistanceKm: sharedPickupKm,
                matchWindowMin: sharedWindowMin,
              },
              address,
              ...(loc?.lat != null && loc?.lng != null ? { location: loc } : {}),
            })
          );
        } catch {}
      } else {
        toast.error("Save failed: " + (res.data?.message || "Unknown error"));
      }
    } catch (err) {
      console.error("[Settings] Save error:", err);
      toast.error("Network error: " + err.message);
    }
    finally  { setSaving(false); }
  };

  const uploadLogo = async () => {
    if (!logoFile) {
      toast.error("Please choose a logo image first");
      return;
    }
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append("logo", logoFile);

      const res = await api.post("/api/restaurantadmin/logo", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        const updated = res.data.data;
        setLogoFilename(updated?.logo || "");
        setLogoFile(null);
        try {
          const info = JSON.parse(localStorage.getItem("restaurantInfo") || "{}");
          localStorage.setItem("restaurantInfo", JSON.stringify({ ...info, ...updated }));
        } catch {}
        toast.success("Logo updated!");
      } else {
        toast.error(res.data?.message || "Failed to update logo");
      }
    } catch (e) {
      console.error("[Settings] Logo upload error:", e);
      toast.error("Network error");
    } finally {
      setUploadingLogo(false);
    }
  };

  const [activeTab, setActiveTab] = useState("profile");

  if (loading) return (
    <RestaurantLayout>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {[1,2,3].map(i => <div key={i} style={{ height:88, background:"white", borderRadius:16, border:"1px solid var(--border)" }} />)}
      </div>
    </RestaurantLayout>
  );

  const tabs = [
    { id: "profile", label: "Store Profile", icon: "🏢" },
    { id: "operation", label: "Operations", icon: "⚙️" },
    { id: "delivery", label: "Delivery Rules", icon: "🚚" },
    { id: "matching", label: "Shared Matching", icon: "🤝" },
  ];

  return (
    <RestaurantLayout>
      <div style={{ width: "100%", maxWidth: 1040, margin: "0 auto", padding: "0 10px 40px" }}>
        
        {/* Header Section */}
        <div style={{ 
          display: "flex", alignItems: "center", justifyContent: "space-between", 
          marginBottom: 32, flexWrap: "wrap", gap: 16 
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: "-1px" }}>Store Control</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
              Master configuration for your digital storefront
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
             <div style={{ 
               display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12,
               background: openNow ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
               border: `1px solid ${openNow ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`
             }}>
               <div style={{ 
                 width: 8, height: 8, borderRadius: "50%", 
                 background: openNow ? "#22c55e" : "#ef4444",
                 boxShadow: `0 0 10px ${openNow ? "#22c55e" : "#ef4444"}`
               }} />
               <span style={{ fontSize: 13, fontWeight: 800, color: openNow ? "#16a34a" : "#dc2626" }}>
                 {openNow ? "WE ARE OPEN" : "WE ARE CLOSED"}
               </span>
             </div>
             <button onClick={save} disabled={saving} style={{
               padding: "12px 28px", borderRadius: 16, border: "none",
               background: "linear-gradient(135deg, #ff4e2a, #ff6a3d)",
               color: "white", fontWeight: 900, fontSize: 14, cursor: saving ? "not-allowed" : "pointer",
               boxShadow: "0 8px 20px rgba(255,78,42,0.25)",
             }}>
               {saving ? "Deploying..." : "Save Changes"}
             </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" }}>
          
          {/* Sidebar Nav */}
          <div style={{ 
            background: dark ? "rgba(255,255,255,0.03)" : "white",
            borderRadius: 24, padding: "8px", border: "1px solid var(--border)",
            position: "sticky", top: 20, zIndex: 10
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px", borderRadius: 16, border: "none",
                  background: activeTab === tab.id ? (dark ? "rgba(255,255,255,0.08)" : "#f8fafc") : "transparent",
                  color: activeTab === tab.id ? "var(--orange)" : "var(--muted)",
                  fontWeight: 800, fontSize: 14, cursor: "pointer", textAlign: "left",
                  transition: "all 0.2s ease"
                }}
              >
                <span style={{ fontSize: 18 }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {activeTab === "profile" && (
              <>
                <div className="settings-card" style={{ padding: 32, borderRadius: 28 }}>
                  <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 900 }}>🏷️ Store Branding</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 24 }}>
                    <div style={{
                      width: 140, height: 140, borderRadius: 24, border: "1px solid var(--border)",
                      background: dark ? "#0f172a" : "#f8fafc", display: "grid", placeItems: "center", overflow: "hidden"
                    }}>
                      {(logoPreview || logoFilename) ? (
                        <img src={logoPreview || `${BASE_URL}/images/${logoFilename}`} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 800 }}>No Logo</span>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                        Upload a distinct logo to represent your brand on the map and in customer orders.
                      </p>
                      <input id="logo-upload-input" type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
                      <div style={{ display: "flex", gap: 12 }}>
                        <label htmlFor="logo-upload-input" style={{
                          padding: "10px 20px", borderRadius: 12, border: "1px solid var(--border)",
                          background: dark ? "#0f172a" : "white", fontWeight: 800, fontSize: 13, cursor: "pointer"
                        }}>Choose Image</label>
                        <button onClick={uploadLogo} disabled={uploadingLogo || !logoFile} style={{
                          padding: "10px 24px", borderRadius: 12, border: "none",
                          background: "#111827", color: "white", fontWeight: 800, fontSize: 13,
                          cursor: (uploadingLogo || !logoFile) ? "not-allowed" : "pointer"
                        }}>Update Logo</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="settings-card" style={{ padding: 32, borderRadius: 28 }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 900 }}>🗺️ Location & Address</h3>
                  <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--muted)" }}>Set your precise location for the delivery map</p>
                  
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ fontSize: 11, fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Display Address</label>
                    <input value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. Al Gharb, Sharjah" style={{ width: "100%", padding: "14px", borderRadius: 12, border: "1.5px solid var(--border)", fontSize: 14, fontWeight: 600, outline: "none" }} />
                  </div>

                  <div style={{ borderRadius: 20, border: "1.5px solid var(--border)", overflow: "hidden" }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: dark ? "rgba(255,255,255,0.02)" : "#f8fafc" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>PRECISE PIN DROP</span>
                      <button onClick={() => {
                        navigator.geolocation.getCurrentPosition(pos => updateLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
                      }} style={{ background: "none", border: "none", color: "var(--orange)", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>🎯 Use My GPS</button>
                    </div>
                    <LocationMap location={location} onChange={updateLocation} dark={dark} />
                  </div>
                </div>
              </>
            )}

            {activeTab === "operation" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                   <div className="settings-card" style={{ padding: 24, borderRadius: 24, border: `2px solid ${isActive ? "#22c55e" : "#ef4444"}` }}>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                       <div>
                         <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 900 }}>Store Visibility</h3>
                         <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>{isActive ? "Orders are active" : "Closed to public"}</p>
                       </div>
                       <button onClick={() => setIsActive(!isActive)} style={{
                         padding: "8px 16px", borderRadius: 12, border: "none",
                         background: isActive ? "#22c55e" : "#ef4444", color: "white", fontWeight: 900, fontSize: 12, cursor: "pointer"
                       }}>{isActive ? "GO OFFLINE" : "GO ONLINE"}</button>
                     </div>
                   </div>

                   <div className="settings-card" style={{ padding: 24, borderRadius: 24 }}>
                     <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 900 }}>Avg. Prep Time</h3>
                     <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--muted)" }}>Wait time for customers</p>
                     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                       {[15, 30, 45, 60].map(t => (
                         <button key={t} onClick={() => setPrepTime(t)} style={{
                           flex: 1, padding: "8px", borderRadius: 10, border: `1.5px solid ${prepTime === t ? "var(--orange)" : "var(--border)"}`,
                           background: prepTime === t ? "rgba(230,74,25,0.1)" : "transparent", color: prepTime === t ? "var(--orange)" : "var(--muted)",
                           fontWeight: 800, fontSize: 12, cursor: "pointer"
                         }}>{t}m</button>
                       ))}
                     </div>
                   </div>
                </div>

                <div className="settings-card" style={{ padding: 0, borderRadius: 28, overflow: "hidden", overflowX: "auto" }}>
                  <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>🕒 Operating Hours</h3>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>Set your weekly schedule</p>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => applyToAll(todayKey)} style={{
                        padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border)",
                        background: "transparent", color: "var(--muted)", fontWeight: 800, fontSize: 12, cursor: "pointer"
                      }}>COPY TODAY TO ALL</button>
                      <button onClick={toggle24_7} style={{
                        padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${is24_7 ? "var(--orange)" : "var(--border)"}`,
                        background: is24_7 ? "rgba(230,74,25,0.05)" : "transparent", color: is24_7 ? "var(--orange)" : "var(--muted)", fontWeight: 800, fontSize: 12, cursor: "pointer"
                      }}>24/7 OPEN</button>
                    </div>
                  </div>
                  <div style={{ opacity: is24_7 ? 0.3 : 1, pointerEvents: is24_7 ? "none" : "auto" }}>
                    {DAYS.map((day, idx) => (
                      <div key={day} style={{ 
                        display: "grid", gridTemplateColumns: "120px 1fr 120px 40px", gap: 20, alignItems: "center",
                        padding: "16px 20px", borderBottom: idx === 6 ? "none" : "1px solid var(--border)",
                        background: day === todayKey ? (dark ? "rgba(255,255,255,0.03)" : "#f8fafc") : "transparent"
                      }}>
                        <span style={{ fontWeight: 800, fontSize: 14 }}>{DAY_FULL[day]}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {hours[day]?.closed ? <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: 13 }}>Closed on this day</span> : (
                            <>
                              <input type="time" value={hours[day].open} onChange={e => updateDay(day, "open", e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontWeight: 700 }} />
                              <span style={{ color: "var(--muted)" }}>→</span>
                              <input type="time" value={hours[day].close} onChange={e => updateDay(day, "close", e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontWeight: 700 }} />
                              {(() => {
                                const [oh, om] = hours[day].open.split(":").map(Number);
                                const [ch, cm] = hours[day].close.split(":").map(Number);
                                let dur = (ch * 60 + cm) - (oh * 60 + om);
                                if (dur <= 0) dur += 24 * 60;
                                return <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 900, background: dark ? "rgba(255,255,255,0.05)" : "#f1f5f9", padding: "4px 8px", borderRadius: 6 }}>{Math.floor(dur/60)}h {dur%60}m</span>;
                              })()}
                            </>
                          )}
                        </div>
                        <button onClick={() => updateDay(day, "closed", !hours[day]?.closed)} style={{
                          padding: "6px 12px", borderRadius: 8, border: "none",
                          background: hours[day]?.closed ? "#fecaca" : "#dcfce7", color: hours[day]?.closed ? "#dc2626" : "#16a34a",
                          fontWeight: 800, fontSize: 11, cursor: "pointer"
                        }}>{hours[day]?.closed ? "CLOSED" : "OPEN"}</button>
                        <button onClick={() => applyToAll(day)} title="Copy to all" style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5 }}>📂</button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === "delivery" && (
              <>
                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                   <div className="settings-card" style={{ padding: 24, borderRadius: 24 }}>
                     <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 900 }}>Delivery Radius</h3>
                     <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--muted)" }}>Max km from restaurant</p>
                     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                       <input type="number" value={deliveryRadius} onChange={e => {
                         const val = e.target.value;
                         setDeliveryRadius(val === "" ? "" : Number(val));
                       }} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1.5px solid var(--border)", fontWeight: 800, background: "transparent" }} />
                       <span style={{ fontWeight: 800, color: "var(--muted)" }}>KM</span>
                     </div>
                   </div>

                   <div className="settings-card" style={{ padding: 24, borderRadius: 24 }}>
                     <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 900 }}>Min. Order Amount</h3>
                     <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--muted)" }}>Required checkout total</p>
                     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                       <input type="number" value={minimumOrder} onChange={e => {
                         const val = e.target.value;
                         setMinimumOrder(val === "" ? "" : Number(val));
                       }} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1.5px solid var(--border)", fontWeight: 800, background: "transparent" }} />
                       <span style={{ fontWeight: 800, color: "var(--muted)" }}>AED</span>
                     </div>
                   </div>
                 </div>

                 <div className="settings-card" style={{ padding: 32, borderRadius: 28 }}>
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                     <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>🚚 Delivery Fee Tiers</h3>
                     <button onClick={() => setDeliveryTiers([...deliveryTiers.filter(t => t.upToKm !== null), { upToKm: deliveryTiers.length * 5, fee: 15 }, { upToKm: null, fee: 20 }])} style={{ background: "none", border: "none", color: "var(--orange)", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>+ ADD TIER</button>
                   </div>
                   <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                     {deliveryTiers.map((tier, i) => (
                       <div key={i} style={{ 
                         display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 16, alignItems: "center",
                         padding: "12px 20px", background: dark ? "rgba(255,255,255,0.02)" : "#f8fafc", borderRadius: 16, border: "1px solid var(--border)"
                       }}>
                         <div>
                           <span style={{ fontSize: 11, fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Distance Limit</span>
                           <span style={{ fontWeight: 800 }}>{tier.upToKm === null ? "Beyond Brackets" : `Up to ${tier.upToKm} km`}</span>
                         </div>
                         <div>
                           <span style={{ fontSize: 11, fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Delivery Fee</span>
                           <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                             <input type="number" value={tier.fee} onChange={e => {
                               const next = [...deliveryTiers];
                               const val = e.target.value;
                               next[i].fee = val === "" ? "" : Number(val);
                               setDeliveryTiers(next);
                             }} style={{ width: 60, padding: "4px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontWeight: 800 }} />
                             <span style={{ fontWeight: 700, fontSize: 12 }}>AED</span>
                           </div>
                         </div>
                         {deliveryTiers.length > 1 && tier.upToKm !== null && (
                            <button onClick={() => setDeliveryTiers(deliveryTiers.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#ef4444", fontWeight: 800, cursor: "pointer" }}>✕</button>
                         )}
                       </div>
                     ))}
                   </div>
                 </div>
              </>
            )}

            {activeTab === "matching" && (
              <div className="settings-card" style={{ padding: 32, borderRadius: 28 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 900 }}>🤝 Shared Delivery Logic</h3>
                <p style={{ margin: "0 0 32px", fontSize: 13, color: "var(--muted)" }}>Optimize your dual-stop delivery efficiency</p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 32 }}>
                    <div>
                      <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 900 }}>Customer Drop Radius</h4>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>Max distance between two customers to allow sharing</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="number" value={sharedDropKm} onChange={e => {
                        const val = e.target.value;
                        setSharedDropKm(val === "" ? "" : Number(val));
                      }} style={{ width: "100%", padding: "8px", borderRadius: 10, border: "1.5px solid var(--border)", fontWeight: 800, background: "transparent" }} />
                      <span style={{ fontWeight: 800, color: "var(--muted)" }}>KM</span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 32 }}>
                    <div>
                      <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 900 }}>Pickup Window</h4>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>Max time gap between orders to bundle together</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="number" value={sharedWindowMin} onChange={e => {
                        const val = e.target.value;
                        setSharedWindowMin(val === "" ? "" : Number(val));
                      }} style={{ width: "100%", padding: "8px", borderRadius: 10, border: "1.5px solid var(--border)", fontWeight: 800, background: "transparent" }} />
                      <span style={{ fontWeight: 800, color: "var(--muted)" }}>MIN</span>
                    </div>
                  </div>

                </div>
              </div>
            )}
            
          </div>

        </div>
      </div>
    </RestaurantLayout>
  );
}