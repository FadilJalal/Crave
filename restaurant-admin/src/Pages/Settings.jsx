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
        setSharedDropKm(r.sharedDelivery?.maxDropDistanceKm ?? 2);
        setSharedPickupKm(r.sharedDelivery?.maxPickupDistanceKm ?? 2);
        setSharedWindowMin(r.sharedDelivery?.matchWindowMin ?? 12);

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

  if (loading) return (
    <RestaurantLayout>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {[1,2,3].map(i => <div key={i} style={{ height:88, background:"white", borderRadius:16, border:"1px solid var(--border)" }} />)}
      </div>
    </RestaurantLayout>
  );

  return (
    <RestaurantLayout>
      <div className="settings-page">
        {(() => {
          const textPrimary = dark ? "#f9fafb" : "#111827";
          const textMuted = dark ? "rgba(249,250,251,0.68)" : "var(--muted)";
          const cardBg = dark ? "#111827" : "white";
          const softBg = dark ? "#0f172a" : "#f9fafb";
          const inputBg = dark ? "#0b1324" : "white";
          const borderClr = dark ? "rgba(255,255,255,0.12)" : "var(--border)";

          return (
            <>
        {/* Page header */}
        <div className="settings-header">
          <div>
            <h2 style={{ margin:0, fontSize:26, fontWeight:900, letterSpacing:"-0.5px" }}>Settings</h2>
            <p style={{ margin:"4px 0 0", fontSize:13, color:"var(--muted)" }}>Manage your store profile, delivery rules, and opening hours</p>
          </div>
          <div className="settings-actions">
            <div style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 14px", borderRadius:12,
              background: openNow ? "#f0fdf4" : "#fef2f2",
              border:`1px solid ${openNow ? "#86efac" : "#fecaca"}` }}>
              <div style={{ width:8, height:8, borderRadius:"50%",
                background: openNow ? "#22c55e" : "#ef4444",
                boxShadow: openNow ? "0 0 0 3px #bbf7d0" : "0 0 0 3px #fecaca" }} />
              <span style={{ fontSize:13, fontWeight:800, color: openNow ? "#16a34a" : "#dc2626" }}>
                {openNow ? "Open Now" : "Closed Now"}
              </span>
            </div>
            <button onClick={save} disabled={saving} style={{
              padding:"10px 22px", borderRadius:12, border:"none",
              background:"linear-gradient(135deg, #ff4e2a, #ff6a3d)",
              color:"white", fontWeight:800, fontSize:14, cursor: saving ? "not-allowed":"pointer",
              opacity: saving ? 0.7 : 1, boxShadow:"0 4px 14px rgba(255,78,42,0.3)",
            }}>{saving ? "Saving…" : "Save Settings"}</button>
          </div>
        </div>

        <div className="settings-card">
          <div style={{ fontWeight:900, fontSize:14, color: dark ? "white" : "#111827", marginBottom:2 }}>🏷️ Restaurant Logo</div>
          <div style={{ fontSize:12, color:"var(--muted)", marginBottom:14 }}>
            Upload a square logo for your sidebar and restaurant card.
          </div>

          <div style={{
            display:"grid",
            gridTemplateColumns:"120px 1fr",
            gap:16,
            alignItems:"start",
          }}>
            <div style={{
              width:120,
              height:120,
              borderRadius:18,
              border:"1px solid var(--border)",
              background: dark ? "#0f172a" : "#f8fafc",
              display:"grid",
              placeItems:"center",
              overflow:"hidden",
              boxShadow: dark ? "0 8px 18px rgba(0,0,0,0.22)" : "0 6px 16px rgba(15,23,42,0.08)",
            }}>
              {(logoPreview || logoFilename) ? (
                <img
                  src={logoPreview || `${BASE_URL}/images/${logoFilename}`}
                  alt="Logo"
                  style={{ width:"100%", height:"100%", objectFit:"cover" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <span style={{ fontSize:12, color:"var(--muted)", fontWeight:800 }}>No logo</span>
              )}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:10, minWidth:260 }}>
              <input
                id="logo-upload-input"
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                style={{ display:"none" }}
              />

              <div style={{
                display:"flex",
                alignItems:"center",
                gap:8,
                flexWrap:"wrap",
                padding:"10px",
                borderRadius:12,
                border:"1px dashed var(--border)",
                background: dark ? "rgba(255,255,255,0.02)" : "#f8fafc",
              }}>
                <label
                  htmlFor="logo-upload-input"
                  style={{
                    padding:"8px 14px",
                    borderRadius:10,
                    border:"1px solid var(--border)",
                    background: dark ? "#0f172a" : "white",
                    fontWeight:700,
                    fontSize:13,
                    cursor:"pointer",
                    color: dark ? "#f9fafb" : "#1f2937",
                  }}
                >
                  Choose File
                </label>
                <span style={{ fontSize:13, color:"var(--muted)", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"100%" }}>
                  {logoFile?.name || (logoFilename ? `Current: ${logoFilename}` : "No file selected")}
                </span>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                <button
                  onClick={uploadLogo}
                  disabled={uploadingLogo || !logoFile}
                  style={{
                    padding:"9px 20px",
                    borderRadius:12,
                    border:"none",
                    background:"linear-gradient(135deg, #ff4e2a, #ff6a3d)",
                    color:"white",
                    fontWeight:900,
                    fontSize:14,
                    cursor: (uploadingLogo || !logoFile) ? "not-allowed" : "pointer",
                    opacity: (uploadingLogo || !logoFile) ? 0.65 : 1,
                    boxShadow:"0 10px 24px rgba(255,78,42,0.26)",
                  }}
                >
                  {uploadingLogo ? "Uploading…" : "Upload Logo"}
                </button>
                {logoFile && (
                  <button
                    onClick={() => setLogoFile(null)}
                    style={{
                      padding:"9px 14px",
                      borderRadius:12,
                      border:"1px solid var(--border)",
                      background: dark ? "#0f172a" : "#f9fafb",
                      color: dark ? "#e5e7eb" : "#374151",
                      fontWeight:700,
                      fontSize:13,
                      cursor:"pointer"
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Display Address */}
        <div className="settings-card">
          <div style={{ fontWeight:900, fontSize:14, color: dark ? "white" : "#111827", marginBottom:2 }}>📍 Display Address</div>
          <div style={{ fontSize:12, color:"var(--muted)", marginBottom:12 }}>
            This is the address shown on your restaurant card on the homepage.
          </div>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="e.g. Al Gharb, Sharjah"
            style={{ width:"100%", padding:"10px 14px", borderRadius:10,
              border:"1.5px solid var(--border)", fontSize:14, fontWeight:600,
              outline:"none", fontFamily:"inherit", color:"#111827",
              boxSizing:"border-box", transition:"border 0.2s" }}
            onFocus={e => e.target.style.borderColor = "#ff4e2a"}
            onBlur={e => e.target.style.borderColor = "var(--border)"}
          />
        </div>

        {/* Status + Prep time side by side */}
        <div className="settings-grid-2">

          {/* Active toggle */}
          <div style={{ background:"white", borderRadius:16,
            border:`1.5px solid ${isActive ? "#86efac" : "#fecaca"}`,
            boxShadow:"0 2px 12px rgba(0,0,0,0.04)", padding:"18px 20px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: isActive ? 0 : 12 }}>
              <div>
                <div style={{ fontWeight:900, fontSize:14, color: dark ? "white" : "#111827" }}>Restaurant Active</div>
                <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>
                  {isActive ? "Customers can see & order" : "Hidden from customers"}
                </div>
              </div>
              <div onClick={() => setIsActive(p => !p)} style={{
                width:50, height:27, borderRadius:999, cursor:"pointer",
                background: isActive ? "#22c55e" : "#d1d5db",
                position:"relative", transition:"background 0.2s", flexShrink:0,
              }}>
                <div style={{
                  position:"absolute", top:3, left: isActive ? 26 : 3,
                  width:21, height:21, borderRadius:"50%", background:"white",
                  boxShadow:"0 1px 4px rgba(0,0,0,0.2)", transition:"left 0.2s",
                }} />
              </div>
            </div>
            {!isActive && (
              <div style={{ padding:"8px 12px", background:"#fef2f2", border:"1px solid #fecaca",
                borderRadius:9, fontSize:12, color:"#dc2626", fontWeight:600 }}>
                ⚠️ Customers cannot order right now
              </div>
            )}
          </div>

          {/* Prep time */}
          <div className="settings-card" style={{ marginBottom:0 }}>
            <div style={{ fontWeight:900, fontSize:14, color: dark ? "white" : "#111827", marginBottom:2 }}>Prep Time</div>
            <div style={{ fontSize:12, color:"var(--muted)", marginBottom:12 }}>Shown to customers as wait time</div>
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
              {[15, 20, 30, 45, 60].map(t => (
                <button key={t} onClick={() => setPrepTime(t)} style={{
                  padding:"7px 13px", borderRadius:10,
                  border:`1.5px solid ${prepTime === t ? "#ff4e2a" : "var(--border)"}`,
                  background: dark ? "#000000" : (prepTime === t ? "#fff1ee" : "#f9fafb"),
                  color: dark ? "#ffffff" : (prepTime === t ? "#ff4e2a" : "#6b7280"),
                  fontWeight:800, fontSize:13, cursor:"pointer", transition:"all 0.15s",
                }}>{t}m</button>
              ))}
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <input type="number" min={5} max={120} value={prepTime}
                  onChange={e => setPrepTime(Number(e.target.value))}
                  style={{ width:54, padding:"7px 8px", borderRadius:10,
                    border:"1.5px solid var(--border)", fontSize:13, fontWeight:800,
                    background: dark ? "#000000" : undefined,
                    color: dark ? "#ffffff" : undefined,
                    textAlign:"center", outline:"none", fontFamily:"inherit" }} />
                <span style={{ fontSize:12, color: dark ? "#ffffff" : "var(--muted)" }}>min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Radius card */}
        <div className="settings-card">
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontWeight:900, fontSize:14, color: dark ? "white" : "#111827", marginBottom:2 }}>🚴 Delivery Radius</div>
              <div style={{ fontSize:12, color:"var(--muted)", marginBottom:12 }}>
                Orders outside this range will be rejected. Set to <b>0</b> for unlimited delivery.
              </div>
            </div>
            {deliveryRadius === 0 && (
              <div style={{ padding:"4px 12px", borderRadius:999, background:"#f0fdf4",
                border:"1px solid #86efac", fontSize:11, fontWeight:800, color:"#16a34a", whiteSpace:"nowrap" }}>
                🌍 Unlimited
              </div>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            {[3, 5, 10, 15, 20].map(r => (
              <button key={r} onClick={() => setDeliveryRadius(r)} style={{
                padding:"7px 13px", borderRadius:10,
                border:`1.5px solid ${deliveryRadius === r ? "#ff4e2a" : "var(--border)"}`,
                background: dark ? "#000000" : (deliveryRadius === r ? "#fff1ee" : "#f9fafb"),
                color: dark ? "#ffffff" : (deliveryRadius === r ? "#ff4e2a" : "#6b7280"),
                fontWeight:800, fontSize:13, cursor:"pointer", transition:"all 0.15s",
              }}>{r} km</button>
            ))}
            <button onClick={() => setDeliveryRadius(0)} style={{
              padding:"7px 13px", borderRadius:10,
              border:`1.5px solid ${deliveryRadius === 0 ? "#16a34a" : "var(--border)"}`,
              background: dark ? "#000000" : (deliveryRadius === 0 ? "#f0fdf4" : "#f9fafb"),
              color: dark ? "#ffffff" : (deliveryRadius === 0 ? "#16a34a" : "#6b7280"),
              fontWeight:800, fontSize:13, cursor:"pointer", transition:"all 0.15s",
            }}>∞ Unlimited</button>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <input type="number" min={0} max={200} value={deliveryRadius}
                onChange={e => setDeliveryRadius(Number(e.target.value))}
                style={{ width:60, padding:"7px 8px", borderRadius:10,
                  border:"1.5px solid var(--border)", fontSize:13, fontWeight:800,
                  textAlign:"center", outline:"none", fontFamily:"inherit" }} />
              <span style={{ fontSize:12, color:"var(--muted)" }}>km</span>
            </div>
          </div>
          {deliveryRadius > 0 && (
            <div style={{ marginTop:14, padding:"10px 14px", borderRadius:10,
              background: dark ? "#000000" : "#fff7ed", border: dark ? "1px solid rgba(255,255,255,0.14)" : "1px solid #fed7aa", fontSize:12, color: dark ? "#ffffff" : "#92400e", fontWeight:600 }}>
              🗺️ Customers more than <strong>{deliveryRadius} km</strong> from your restaurant will not be able to place an order.
            </div>
          )}
        </div>

        {/* Minimum Order card */}
        <div className="settings-card">
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontWeight:900, fontSize:14, color: dark ? "white" : "#111827", marginBottom:2 }}>🛒 Minimum Order Amount</div>
              <div style={{ fontSize:12, color:"var(--muted)", marginBottom:12 }}>
                Orders below this amount will be rejected. Set to <b>0</b> for no minimum.
              </div>
            </div>
            {minimumOrder === 0 && (
              <div style={{ padding:"4px 12px", borderRadius:999, background:"#f0fdf4",
                border:"1px solid #86efac", fontSize:11, fontWeight:800, color:"#16a34a", whiteSpace:"nowrap" }}>
                No Minimum
              </div>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            {[0, 20, 30, 50, 75, 100].map(v => (
              <button key={v} onClick={() => setMinimumOrder(v)} style={{
                padding:"7px 13px", borderRadius:10,
                border:`1.5px solid ${minimumOrder === v ? "#ff4e2a" : "var(--border)"}`,
                background: dark ? "#000000" : (minimumOrder === v ? "#fff1ee" : "#f9fafb"),
                color: dark ? "#ffffff" : (minimumOrder === v ? "#ff4e2a" : "#6b7280"),
                fontWeight:800, fontSize:13, cursor:"pointer", transition:"all 0.15s",
              }}>{v === 0 ? "None" : `AED ${v}`}</button>
            ))}
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:12, color:"var(--muted)" }}>AED</span>
              <input type="number" min={0} max={500} value={minimumOrder}
                onChange={e => setMinimumOrder(Number(e.target.value))}
                style={{ width:70, padding:"7px 8px", borderRadius:10,
                  border:"1.5px solid var(--border)", fontSize:13, fontWeight:800,
                  textAlign:"center", outline:"none", fontFamily:"inherit" }} />
            </div>
          </div>
          {minimumOrder > 0 && (
            <div style={{ marginTop:14, padding:"10px 14px", borderRadius:10,
              background: dark ? "#000000" : "#fff7ed", border: dark ? "1px solid rgba(255,255,255,0.14)" : "1px solid #fed7aa", fontSize:12, color: dark ? "#ffffff" : "#92400e", fontWeight:600 }}>
              🛒 Customers must order at least <strong>AED {minimumOrder}</strong> to place an order.
            </div>
          )}
        </div>

        {/* Delivery Tiers card */}
        <div className="settings-card">
          <div style={{ fontWeight:900, fontSize:14, color:textPrimary, marginBottom:2 }}>🚚 Delivery Fee Tiers</div>
          <div style={{ fontSize:12, color:"var(--muted)", marginBottom:14 }}>
            Set fee per distance bracket. Use AED 0 for free delivery on any tier.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {deliveryTiers.map((tier, i) => (
              <div className="settings-tier-row" key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background: dark ? "#0f172a" : "#f9fafb", borderRadius:12, border:"1px solid var(--border)", transition:"box-shadow 0.2s ease" }}>
                <div style={{ fontSize:13, color:textMuted, fontWeight:700, minWidth:20 }}>#{i+1}</div>
                <div style={{ display:"flex", alignItems:"center", gap:6, flex:1 }}>
                  <span style={{ fontSize:12, color:textMuted }}>Up to</span>
                  {tier.upToKm === null ? (
                    <span style={{ fontSize:13, fontWeight:800, color:textPrimary, padding:"5px 10px", background: dark ? "#111827" : "white", borderRadius:8, border:"1px solid var(--border)" }}>Beyond</span>
                  ) : (
                    <input type="number" min={1} max={100} value={tier.upToKm ?? ""}
                      onChange={e => {
                        const next = [...deliveryTiers];
                        const raw = e.target.value;

                        // Allow temporary empty state while typing; enforce min on blur.
                        if (raw === "") {
                          next[i] = { ...next[i], upToKm: "" };
                        } else {
                          const parsed = Number(raw);
                          next[i] = { ...next[i], upToKm: Number.isFinite(parsed) ? parsed : 1 };
                        }

                        setDeliveryTiers(next);
                      }}
                      onBlur={() => {
                        const next = [...deliveryTiers];
                        const parsed = Number(next[i].upToKm);
                        next[i] = { ...next[i], upToKm: Number.isFinite(parsed) && parsed >= 1 ? parsed : 1 };
                        setDeliveryTiers(next);
                      }}
                      style={{ width:60, padding:"5px 8px", borderRadius:8, border:"1px solid var(--border)", background: dark ? "#111827" : "white", color: textPrimary, fontSize:13, fontWeight:800, textAlign:"center", outline:"none", fontFamily:"inherit" }} />
                  )}
                  <span style={{ fontSize:12, color:textMuted }}>km</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:12, color:textMuted }}>Fee</span>
                  <span style={{ fontSize:12, color:textMuted }}>AED</span>
                  <input type="number" min={0} max={200} value={tier.fee}
                    onChange={e => {
                      const next = [...deliveryTiers];
                      next[i] = { ...next[i], fee: Number(e.target.value) };
                      setDeliveryTiers(next);
                    }}
                    style={{ width:60, padding:"5px 8px", borderRadius:8, border:"1px solid var(--border)", background: dark ? "#111827" : "white", color: textPrimary, fontSize:13, fontWeight:800, textAlign:"center", outline:"none", fontFamily:"inherit" }} />
                  {tier.fee === 0 && <span style={{ fontSize:11, fontWeight:800, color:"#16a34a", background: dark ? "rgba(34,197,94,0.18)" : "#f0fdf4", padding:"2px 8px", borderRadius:999 }}>FREE</span>}
                </div>
                {deliveryTiers.length > 1 && tier.upToKm !== null && (
                  <button onClick={() => setDeliveryTiers(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: dark ? "rgba(220,38,38,0.18)" : "#fef2f2", border:"none", borderRadius:8, padding:"5px 8px", cursor:"pointer", fontSize:13, color:"#dc2626", fontWeight:700 }}>✕</button>
                )}
              </div>
            ))}
            <button
              onClick={() => {
                const last = deliveryTiers[deliveryTiers.length - 1];
                const secondLast = deliveryTiers[deliveryTiers.length - 2];
                const newUpTo = last.upToKm !== null ? last.upToKm + 5 : (secondLast?.upToKm ?? 5) + 5;
                const updated = deliveryTiers.map((t, i) =>
                  i === deliveryTiers.length - 1 ? { ...t, upToKm: newUpTo } : t
                );
                setDeliveryTiers([...updated, { upToKm: null, fee: 20 }]);
              }}
              style={{ padding:"8px 14px", borderRadius:10, border:"1.5px dashed var(--border)", background: dark ? "#0f172a" : "white", cursor:"pointer", fontSize:13, fontWeight:700, color:textMuted, fontFamily:"inherit", textAlign:"left" }}>
              + Add tier
            </button>
          </div>
          <div style={{ marginTop:12, padding:"10px 14px", borderRadius:10, background: dark ? "rgba(29,78,216,0.16)" : "#eff6ff", border: dark ? "1px solid rgba(96,165,250,0.35)" : "1px solid #bfdbfe", fontSize:12, color: dark ? "#93c5fd" : "#1d4ed8", fontWeight:600 }}>
            💡 The last tier (Beyond) catches all distances beyond the previous bracket.
          </div>
        </div>

        {/* Shared Delivery Matching card */}
        <div className="settings-card">
          <div style={{ fontWeight:900, fontSize:14, color:textPrimary, marginBottom:2 }}>🤝 Shared Delivery Matching</div>
          <div style={{ fontSize:12, color:"var(--muted)", marginBottom:14 }}>
            Control how far apart nearby orders can be to qualify for shared delivery.
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <div style={{ padding:"10px 12px", border:"1px solid var(--border)", borderRadius:12, background: dark ? "#0f172a" : "#f9fafb" }}>
              <div style={{ fontSize:12, color:textMuted, fontWeight:700, marginBottom:8 }}>Customer drop distance</div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <input
                  type="number"
                  min={0.5}
                  max={20}
                  step={0.5}
                  value={sharedDropKm}
                  onChange={e => setSharedDropKm(Number(e.target.value))}
                  style={{ width:70, padding:"6px 8px", borderRadius:8, border:"1px solid var(--border)", background: dark ? "#111827" : "white", color:textPrimary, fontSize:13, fontWeight:800, textAlign:"center", outline:"none", fontFamily:"inherit" }}
                />
                <span style={{ fontSize:12, color:textMuted }}>km</span>
              </div>
            </div>

            <div style={{ padding:"10px 12px", border:"1px solid var(--border)", borderRadius:12, background: dark ? "#0f172a" : "#f9fafb" }}>
              <div style={{ fontSize:12, color:textMuted, fontWeight:700, marginBottom:8 }}>Restaurant pickup distance</div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <input
                  type="number"
                  min={0.5}
                  max={20}
                  step={0.5}
                  value={sharedPickupKm}
                  onChange={e => setSharedPickupKm(Number(e.target.value))}
                  style={{ width:70, padding:"6px 8px", borderRadius:8, border:"1px solid var(--border)", background: dark ? "#111827" : "white", color:textPrimary, fontSize:13, fontWeight:800, textAlign:"center", outline:"none", fontFamily:"inherit" }}
                />
                <span style={{ fontSize:12, color:textMuted }}>km</span>
              </div>
            </div>

            <div style={{ padding:"10px 12px", border:"1px solid var(--border)", borderRadius:12, background: dark ? "#0f172a" : "#f9fafb" }}>
              <div style={{ fontSize:12, color:textMuted, fontWeight:700, marginBottom:8 }}>Match time window</div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <input
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  value={sharedWindowMin}
                  onChange={e => setSharedWindowMin(Number(e.target.value))}
                  style={{ width:70, padding:"6px 8px", borderRadius:8, border:"1px solid var(--border)", background: dark ? "#111827" : "white", color:textPrimary, fontSize:13, fontWeight:800, textAlign:"center", outline:"none", fontFamily:"inherit" }}
                />
                <span style={{ fontSize:12, color:textMuted }}>min</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop:12, padding:"10px 14px", borderRadius:10, background: dark ? "rgba(29,78,216,0.16)" : "#eff6ff", border: dark ? "1px solid rgba(96,165,250,0.35)" : "1px solid #bfdbfe", fontSize:12, color: dark ? "#93c5fd" : "#1d4ed8", fontWeight:600 }}>
            Shared delivery offers are shown to customers only when a nearby active route matches these limits.
          </div>
        </div>

        {/* Location card — overflow visible so search dropdown is not clipped under the map */}
        <div style={{ background:"white", borderRadius:16, border:"1px solid var(--border)",
          boxShadow:"0 2px 12px rgba(0,0,0,0.04)", overflow:"visible", marginBottom:14 }}>
          <div style={{ padding:"18px 22px 16px", borderBottom:"1px solid var(--border)",
            display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontWeight:900, fontSize:15, color:"#111827" }}>📍 Restaurant Location</div>
              <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>
                Click the map or drag the pin. <strong>Save Settings</strong> (top) saves your pin with other settings.
                Use <strong>Save Location</strong> if you only want to update the map and auto-fill the display address from the pin.
              </div>
            </div>
            <div className="settings-map-actions">
              <button onClick={() => {
                if (!navigator.geolocation) return toast.error("Geolocation not supported");
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    updateLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    toast.success("GPS location detected!");
                  },
                  () => toast.error("Enable location permissions first")
                );
              }} style={{ padding:"8px 16px", borderRadius:10, border:"1px solid var(--border)",
                background:"#f9fafb", color:"#374151", fontWeight:700, fontSize:13, cursor:"pointer",
                display:"flex", alignItems:"center", gap:6 }}>
                🎯 Use My GPS
              </button>
              <button onClick={saveLocation} disabled={savingLoc} style={{
                padding:"8px 22px", borderRadius:10, border:"none",
                background:"linear-gradient(135deg, #ff4e2a, #ff6a3d)",
                color:"white", fontWeight:800, fontSize:13,
                cursor: savingLoc ? "not-allowed" : "pointer",
                opacity: savingLoc ? 0.7 : 1,
                boxShadow:"0 4px 14px rgba(255,78,42,0.3)",
              }}>{savingLoc ? "Saving…" : "Save Location"}</button>
            </div>
          </div>
          <div style={{ padding:"0 0 0 0" }}>
            <LocationMap location={location} onChange={updateLocation} dark={dark} />
          </div>
          <div style={{ padding:"10px 20px", background:"#f9fafb", borderTop:"1px solid var(--border)",
            fontSize:12, color:"var(--muted)", display:"flex", gap:16 }}>
            <span>📌 Lat: <b style={{ color:"#111827" }}>{location.lat.toFixed(5)}</b></span>
            <span>📌 Lng: <b style={{ color:"#111827" }}>{location.lng.toFixed(5)}</b></span>
          </div>
        </div>

        {/* Opening Hours card */}
        <div style={{ background:cardBg, borderRadius:16, border:`1px solid ${borderClr}`,
          boxShadow:"0 2px 12px rgba(0,0,0,0.04)", overflow:"hidden" }}>

          {/* Card header */}
          <div style={{ padding:"18px 22px 16px", borderBottom: is24_7 ? "none" : "1px solid var(--border)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
              <div>
                <div style={{ fontWeight:900, fontSize:15, color:textPrimary }}>Opening Hours</div>
                <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>
                  Click Open/Closed to toggle a day · Copy icon applies that day's hours to all
                </div>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>

                {/* 24/7 toggle */}
                <button onClick={toggle24_7} style={{
                  display:"flex", alignItems:"center", gap:7,
                  padding:"8px 16px", borderRadius:10, cursor:"pointer",
                  fontWeight:800, fontSize:13, border:"1.5px solid",
                  borderColor: is24_7 ? "#ff4e2a" : "var(--border)",
                  background:  is24_7 ? (dark ? "rgba(255,78,42,0.16)" : "#fff5f3") : (dark ? "#0f172a" : "#f9fafb"),
                  color:       is24_7 ? "#ff4e2a" : "#374151",
                  transition:"all 0.15s",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {is24_7 ? "24/7 ON" : "Set 24/7"}
                </button>

                <button onClick={() => applyToAll(todayKey)} disabled={is24_7} style={{
                  display:"flex", alignItems:"center", gap:6,
                  padding:"8px 14px", borderRadius:10, border:"1px solid var(--border)",
                  background: dark ? "#0f172a" : "#f9fafb", color: is24_7 ? "#d1d5db" : (dark ? "#e5e7eb" : "#374151"),
                  cursor: is24_7 ? "not-allowed" : "pointer",
                  fontSize:12, fontWeight:700, opacity: is24_7 ? 0.5 : 1,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                  Copy today to all
                </button>
                <button disabled={is24_7} onClick={() => {
                  setHours(Object.fromEntries(DAYS.map(d => [d, { open:"09:00", close:"22:00", closed:false }])));
                  setIs24_7(false);
                  toast.success("Hours reset to defaults");
                }} style={{
                  display:"flex", alignItems:"center", gap:6,
                  padding:"8px 14px", borderRadius:10, border:"1px solid #fecaca",
                  background: dark ? "rgba(220,38,38,0.16)" : "#fef2f2", color: is24_7 ? "#fca5a5" : "#dc2626",
                  cursor: is24_7 ? "not-allowed" : "pointer",
                  fontSize:12, fontWeight:700, opacity: is24_7 ? 0.5 : 1,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                  </svg>
                  Reset
                </button>
              </div>
            </div>

            {/* 24/7 active banner */}
            {is24_7 && (
              <div style={{ marginTop:14, padding:"12px 16px", borderRadius:12,
                background: dark ? "linear-gradient(135deg, rgba(255,78,42,0.18), rgba(255,106,61,0.12))" : "linear-gradient(135deg, #fff5f3, #fff1ee)",
                border:"1.5px solid #fca89a",
                display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ fontSize:22 }}>🕐</div>
                  <div>
                    <div style={{ fontWeight:900, fontSize:13, color:"#ff4e2a" }}>
                      Open 24 hours, 7 days a week
                    </div>
                    <div style={{ fontSize:12, color: dark ? "rgba(255,255,255,0.72)" : "#9ca3af", marginTop:2 }}>
                      All days set to 12:00 AM – 11:59 PM. Click "24/7 ON" to restore previous hours.
                    </div>
                  </div>
                </div>
                <button onClick={toggle24_7} style={{
                  padding:"7px 14px", borderRadius:9, border:"1.5px solid #fca89a",
                  background: dark ? "#0f172a" : "white", color:"#ff4e2a", fontWeight:800,
                  fontSize:12, cursor:"pointer", whiteSpace:"nowrap",
                }}>
                  Turn off
                </button>
              </div>
            )}
          </div>

          {/* Day rows */}
          <div style={{ opacity: is24_7 ? 0.4 : 1, pointerEvents: is24_7 ? "none" : "auto",
            borderTop: is24_7 ? "none" : "1px solid var(--border)" }}>
          {DAYS.map((day, i) => {
            const d = hours[day] || { open:"09:00", close:"22:00", closed:false };
            const isToday = day === todayKey;
            const isLast  = i === DAYS.length - 1;

            // Compute duration label
            let durLabel = null;
            if (!d.closed) {
              const [oh,om] = d.open.split(":").map(Number);
              const [ch,cm] = d.close.split(":").map(Number);
              let dur = (ch*60+cm) - (oh*60+om);
              // Handle overnight: close time is next day (e.g. 09:00 AM → 03:00 AM)
              if (dur <= 0) dur += 24 * 60;
              const hrs  = Math.floor(dur/60);
              const mins = dur % 60;
              durLabel = `${hrs > 0 ? hrs+"h" : ""}${mins > 0 ? " "+mins+"m" : ""}`.trim();
            }

            return (
              <div key={day} style={{
                display:"flex", alignItems:"center",
                borderBottom: isLast ? "none" : "1px solid var(--border)",
                background: isToday ? (dark ? "rgba(34,197,94,0.14)" : "#f0fdf4") : cardBg,
              }}>

                {/* Day name col */}
                <div style={{ width:130, padding:"13px 12px 13px 20px", flexShrink:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    {isToday && (
                      <div style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e",
                        flexShrink:0, boxShadow:"0 0 0 2px #bbf7d0" }} />
                    )}
                    <span style={{ fontWeight:800, fontSize:14,
                      color: d.closed ? (dark ? "rgba(255,255,255,0.45)" : "#9ca3af") : textPrimary }}>
                      {DAY_FULL[day]}
                    </span>
                  </div>
                  {isToday && (
                    <span style={{ fontSize:10, fontWeight:700, color:"#16a34a",
                      marginLeft:14, display:"block", marginTop:2 }}>Today</span>
                  )}
                </div>

                {/* Time range col */}
                <div style={{ flex:1, padding:"10px 8px", display:"flex", alignItems:"center", gap:8 }}>
                  {d.closed ? (
                    <span style={{ fontSize:13, color:"#9ca3af", fontWeight:600, fontStyle:"italic" }}>
                      Closed all day
                    </span>
                  ) : (
                    <>
                      <div style={{ display:"flex", alignItems:"center", gap:7, flex:1 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:"var(--muted)",
                          textTransform:"uppercase", letterSpacing:"0.4px", flexShrink:0, width:28 }}>
                          From
                        </span>
                        <input type="time" value={d.open}
                          onChange={e => updateDay(day, "open", e.target.value)}
                          style={{ flex:1, minWidth:0, padding:"8px 10px", borderRadius:10,
                            border:"1.5px solid var(--border)", fontSize:14, fontWeight:700,
                            outline:"none", fontFamily:"inherit", color:textPrimary,
                            background:inputBg, cursor:"pointer" }} />
                      </div>
                      <span style={{ color:"#d1d5db", fontSize:18 }}>→</span>
                      <div style={{ display:"flex", alignItems:"center", gap:7, flex:1 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:"var(--muted)",
                          textTransform:"uppercase", letterSpacing:"0.4px", flexShrink:0, width:12 }}>
                          To
                        </span>
                        <input type="time" value={d.close}
                          onChange={e => updateDay(day, "close", e.target.value)}
                          style={{ flex:1, minWidth:0, padding:"8px 10px", borderRadius:10,
                            border:"1.5px solid var(--border)", fontSize:14, fontWeight:700,
                            outline:"none", fontFamily:"inherit", color:textPrimary,
                            background:inputBg, cursor:"pointer" }} />
                      </div>
                      {durLabel && (
                        <span style={{ fontSize:11, color:"var(--muted)", fontWeight:600,
                          flexShrink:0, background: dark ? "rgba(255,255,255,0.1)" : "#f3f4f6", borderRadius:7,
                          padding:"3px 9px", whiteSpace:"nowrap" }}>
                          {durLabel}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Actions col */}
                <div style={{ display:"flex", alignItems:"center", gap:8,
                  padding:"10px 18px 10px 8px", flexShrink:0 }}>
                  <button onClick={() => updateDay(day, "closed", !d.closed)} style={{
                    padding:"6px 16px", borderRadius:999, border:"none", cursor:"pointer",
                    fontWeight:800, fontSize:12, transition:"all 0.15s", minWidth:72,
                    background: d.closed ? "#fee2e2" : "#f0fdf4",
                    color:       d.closed ? "#dc2626" : "#16a34a",
                  }}>
                    {d.closed ? "Closed" : "Open"}
                  </button>
                  <button onClick={() => applyToAll(day)}
                    title={`Copy ${DAY_FULL[day]} to all days`}
                    style={{ width:32, height:32, borderRadius:9,
                      border:"1px solid var(--border)", background:inputBg,
                      color:"var(--muted)", cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      flexShrink:0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="9" y="9" width="13" height="13" rx="2"/>
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
          </div>

          {/* Week summary footer */}
          <div style={{ padding:"14px 20px", background:softBg,
            borderTop:"1px solid var(--border)", display:"flex", gap:6, flexWrap:"wrap" }}>
            {DAYS.map(day => {
              const d = hours[day] || {};
              const isToday = day === todayKey;
              return (
                <div key={day} style={{ flex:"1 0 70px", display:"flex", flexDirection:"column",
                  alignItems:"center", padding:"7px 6px", borderRadius:10,
                  background: isToday ? (dark ? "rgba(34,197,94,0.2)" : "#dcfce7") : d.closed ? (dark ? "#0b1324" : "#fafafa") : inputBg,
                  border:`1px solid ${isToday ? "#86efac" : "var(--border)"}` }}>
                  <span style={{ fontSize:10, fontWeight:800, color:"var(--muted)",
                    textTransform:"uppercase", letterSpacing:"0.4px" }}>
                    {DAY_SHORT[day]}
                  </span>
                  {d.closed ? (
                    <span style={{ fontSize:11, fontWeight:700, color:"#ef4444", marginTop:3 }}>—</span>
                  ) : (
                    <span style={{ fontSize:10, fontWeight:700, color: dark ? "rgba(249,250,251,0.78)" : "#374151", marginTop:3,
                      whiteSpace:"nowrap", textAlign:"center" }}>
                      {fmt12(d.open)}<br />{fmt12(d.close)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

            </>
          );
        })()}

      </div>
    </RestaurantLayout>
  );
}