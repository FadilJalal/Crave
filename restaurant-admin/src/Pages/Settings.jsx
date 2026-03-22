import { useEffect, useState, useRef } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { toast } from "react-toastify";

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const DAY_SHORT = { monday:"Mon", tuesday:"Tue", wednesday:"Wed", thursday:"Thu", friday:"Fri", saturday:"Sat", sunday:"Sun" };
const DAY_FULL  = { monday:"Monday", tuesday:"Tuesday", wednesday:"Wednesday", thursday:"Thursday", friday:"Friday", saturday:"Saturday", sunday:"Sunday" };

const DEFAULT_HOURS = Object.fromEntries(
  DAYS.map(d => [d, { open: "09:00", close: "22:00", closed: false }])
);

function computeIsOpenNow(openingHours, isActive) {
  if (!isActive) return false;
  if (!openingHours) return isActive;
  const now = new Date();
  const day = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];
  const h = openingHours[day];
  if (!h || h.closed) return false;
  if (h.open === "00:00" && h.close === "23:59") return true;
  const [oh, om] = h.open.split(":").map(Number);
  const [ch, cm] = h.close.split(":").map(Number);
  const mins     = now.getHours() * 60 + now.getMinutes();
  const openMins = oh * 60 + om;
  const closeMins = ch * 60 + cm;
  // Overnight span (e.g. 09:00 → 03:00 next day)
  if (closeMins <= openMins) return mins >= openMins || mins < closeMins;
  return mins >= openMins && mins < closeMins;
}

function fmt12(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
}

// ── Inline Leaflet map (uses window.L from CDN) ──────────────────────────────
function LocationMap({ location, onChange }) {
  const mapRef      = useRef(null);
  const leafletRef  = useRef(null);
  const markerRef   = useRef(null);
  const onChangeRef = useRef(onChange);   // always-fresh callback ref
  const [search,    setSearch]   = useState("");
  const [results,   setResults]  = useState([]);
  const [searching, setSearching] = useState(false);

  // Keep onChangeRef current on every render
  useEffect(() => { onChangeRef.current = onChange; });

  // Search via Nominatim
  const doSearch = async (q) => {
    if (!q || q.length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
        { headers: { "Accept-Language": "en" } }
      );
      setResults(await res.json());
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  const pickResult = (r) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
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
    L.tileLayer("https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png?language=en", {
      attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
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

  return (
    <div>
      {/* Search bar */}
      <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)", position:"relative" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10,
          border:"1.5px solid var(--border)", borderRadius:10,
          padding:"8px 14px", background:"#f9fafb" }}>
          <span style={{ fontSize:16 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search for a location, street or area..."
            style={{ flex:1, border:"none", background:"transparent",
              outline:"none", fontSize:14, fontFamily:"inherit", color:"#111827" }} />
          {searching && <span style={{ fontSize:12, color:"var(--muted)" }}>searching…</span>}
          {search && (
            <button onClick={() => { setSearch(""); setResults([]); }}
              style={{ background:"none", border:"none", cursor:"pointer",
                fontSize:18, color:"var(--muted)", lineHeight:1, padding:0 }}>×</button>
          )}
        </div>
        {results.length > 0 && (
          <div style={{ position:"absolute", top:"calc(100% - 8px)", left:16, right:16,
            background:"white", border:"1px solid var(--border)", borderRadius:10,
            boxShadow:"0 8px 24px rgba(0,0,0,0.1)", zIndex:9999, overflow:"hidden" }}>
            {results.map(r => (
              <div key={r.place_id} onClick={() => pickResult(r)}
                style={{ padding:"10px 14px", cursor:"pointer", fontSize:13,
                  borderBottom:"1px solid #f3f4f6" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                onMouseLeave={e => e.currentTarget.style.background = "white"}>
                <div style={{ fontWeight:700, color:"#111827" }}>{r.display_name.split(",")[0]}</div>
                <div style={{ color:"var(--muted)", fontSize:11, marginTop:2,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {r.display_name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div ref={mapRef} style={{ height:280, width:"100%", cursor:"crosshair" }} />
    </div>
  );
}

export default function Settings() {
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [savingLoc,  setSavingLoc]  = useState(false);
  const [isActive,   setIsActive]   = useState(true);
  const [prepTime,   setPrepTime]   = useState(15);
  const [deliveryRadius, setDeliveryRadius] = useState(10);
  const [minimumOrder,   setMinimumOrder]   = useState(0);
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
  const [mapKey,     setMapKey]     = useState(0);
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
        setIsActive(r.isActive ?? true);
        setPrepTime(r.avgPrepTime ?? 15);
        setDeliveryRadius(r.deliveryRadius ?? 10);
        setMinimumOrder(r.minimumOrder ?? 0);
        if (r.deliveryTiers?.length) setDeliveryTiers(r.deliveryTiers);
        setAddress(r.address || '');
        const h = { ...DEFAULT_HOURS, ...(r.openingHours || {}) };
        setHours(h);
        setOpenNow(computeIsOpenNow(h, r.isActive ?? true));
        if (r.location?.lat && r.location?.lng) {
          updateLocation({ lat: r.location.lat, lng: r.location.lng });
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
    setSaving(true);
    try {
      const payload = { isActive, avgPrepTime: prepTime, openingHours: hours, deliveryRadius, minimumOrder, deliveryTiers, address };
      console.log("[Settings] Saving payload:", payload);
      const res = await api.post("/api/restaurantadmin/settings", payload);
      console.log("[Settings] Server response:", res.data);
      if (res.data?.success) {
        toast.success(`Settings saved! Address → "${res.data.data?.address}"`);
        try {
          const info = JSON.parse(localStorage.getItem("restaurantInfo") || "{}");
          localStorage.setItem("restaurantInfo", JSON.stringify({ ...info, isActive, avgPrepTime: prepTime, openingHours: hours }));
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

  if (loading) return (
    <RestaurantLayout>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {[1,2,3].map(i => <div key={i} style={{ height:88, background:"white", borderRadius:16, border:"1px solid var(--border)" }} />)}
      </div>
    </RestaurantLayout>
  );

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 680 }}>

        {/* Page header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <h2 style={{ margin:0, fontSize:26, fontWeight:900, letterSpacing:"-0.5px" }}>Settings</h2>
            <p style={{ margin:"4px 0 0", fontSize:13, color:"var(--muted)" }}>Manage availability and opening hours</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
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

        {/* Display Address */}
        <div style={{ background:"white", borderRadius:16, border:"1px solid var(--border)",
          boxShadow:"0 2px 12px rgba(0,0,0,0.04)", padding:"18px 20px", marginBottom:14 }}>
          <div style={{ fontWeight:900, fontSize:14, color:"#111827", marginBottom:2 }}>📍 Display Address</div>
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
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>

          {/* Active toggle */}
          <div style={{ background:"white", borderRadius:16,
            border:`1.5px solid ${isActive ? "#86efac" : "#fecaca"}`,
            boxShadow:"0 2px 12px rgba(0,0,0,0.04)", padding:"18px 20px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: isActive ? 0 : 12 }}>
              <div>
                <div style={{ fontWeight:900, fontSize:14, color:"#111827" }}>Restaurant Active</div>
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
          <div style={{ background:"white", borderRadius:16, border:"1px solid var(--border)",
            boxShadow:"0 2px 12px rgba(0,0,0,0.04)", padding:"18px 20px" }}>
            <div style={{ fontWeight:900, fontSize:14, color:"#111827", marginBottom:2 }}>Prep Time</div>
            <div style={{ fontSize:12, color:"var(--muted)", marginBottom:12 }}>Shown to customers as wait time</div>
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
              {[15, 20, 30, 45, 60].map(t => (
                <button key={t} onClick={() => setPrepTime(t)} style={{
                  padding:"7px 13px", borderRadius:10,
                  border:`1.5px solid ${prepTime === t ? "#ff4e2a" : "var(--border)"}`,
                  background: prepTime === t ? "#fff1ee" : "#f9fafb",
                  color: prepTime === t ? "#ff4e2a" : "#6b7280",
                  fontWeight:800, fontSize:13, cursor:"pointer", transition:"all 0.15s",
                }}>{t}m</button>
              ))}
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <input type="number" min={5} max={120} value={prepTime}
                  onChange={e => setPrepTime(Number(e.target.value))}
                  style={{ width:54, padding:"7px 8px", borderRadius:10,
                    border:"1.5px solid var(--border)", fontSize:13, fontWeight:800,
                    textAlign:"center", outline:"none", fontFamily:"inherit" }} />
                <span style={{ fontSize:12, color:"var(--muted)" }}>min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Radius card */}
        <div style={{ background:"white", borderRadius:16, border:"1px solid var(--border)",
          boxShadow:"0 2px 12px rgba(0,0,0,0.04)", padding:"18px 20px", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontWeight:900, fontSize:14, color:"#111827", marginBottom:2 }}>🚴 Delivery Radius</div>
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
                background: deliveryRadius === r ? "#fff1ee" : "#f9fafb",
                color: deliveryRadius === r ? "#ff4e2a" : "#6b7280",
                fontWeight:800, fontSize:13, cursor:"pointer", transition:"all 0.15s",
              }}>{r} km</button>
            ))}
            <button onClick={() => setDeliveryRadius(0)} style={{
              padding:"7px 13px", borderRadius:10,
              border:`1.5px solid ${deliveryRadius === 0 ? "#16a34a" : "var(--border)"}`,
              background: deliveryRadius === 0 ? "#f0fdf4" : "#f9fafb",
              color: deliveryRadius === 0 ? "#16a34a" : "#6b7280",
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
              background:"#fff7ed", border:"1px solid #fed7aa", fontSize:12, color:"#92400e", fontWeight:600 }}>
              🗺️ Customers more than <strong>{deliveryRadius} km</strong> from your restaurant will not be able to place an order.
            </div>
          )}
        </div>

        {/* Minimum Order card */}
        <div style={{ background:"white", borderRadius:16, border:"1px solid var(--border)",
          boxShadow:"0 2px 12px rgba(0,0,0,0.04)", padding:"18px 20px", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontWeight:900, fontSize:14, color:"#111827", marginBottom:2 }}>🛒 Minimum Order Amount</div>
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
                background: minimumOrder === v ? "#fff1ee" : "#f9fafb",
                color: minimumOrder === v ? "#ff4e2a" : "#6b7280",
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
              background:"#fff7ed", border:"1px solid #fed7aa", fontSize:12, color:"#92400e", fontWeight:600 }}>
              🛒 Customers must order at least <strong>AED {minimumOrder}</strong> to place an order.
            </div>
          )}
        </div>

        {/* Delivery Tiers card */}
        <div style={{ background:"white", borderRadius:16, border:"1px solid var(--border)",
          boxShadow:"0 2px 12px rgba(0,0,0,0.04)", padding:"18px 20px", marginBottom:14 }}>
          <div style={{ fontWeight:900, fontSize:14, color:"#111827", marginBottom:2 }}>🚚 Delivery Fee Tiers</div>
          <div style={{ fontSize:12, color:"var(--muted)", marginBottom:14 }}>
            Set fee per distance bracket. Use AED 0 for free delivery on any tier.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {deliveryTiers.map((tier, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#f9fafb", borderRadius:12, border:"1px solid var(--border)" }}>
                <div style={{ fontSize:13, color:"var(--muted)", fontWeight:700, minWidth:20 }}>#{i+1}</div>
                <div style={{ display:"flex", alignItems:"center", gap:6, flex:1 }}>
                  <span style={{ fontSize:12, color:"var(--muted)" }}>Up to</span>
                  {tier.upToKm === null ? (
                    <span style={{ fontSize:13, fontWeight:800, color:"#111827", padding:"5px 10px", background:"white", borderRadius:8, border:"1px solid var(--border)" }}>Beyond</span>
                  ) : (
                    <input type="number" min={1} max={100} value={tier.upToKm}
                      onChange={e => {
                        const next = [...deliveryTiers];
                        next[i] = { ...next[i], upToKm: Number(e.target.value) };
                        setDeliveryTiers(next);
                      }}
                      style={{ width:60, padding:"5px 8px", borderRadius:8, border:"1px solid var(--border)", fontSize:13, fontWeight:800, textAlign:"center", outline:"none", fontFamily:"inherit" }} />
                  )}
                  <span style={{ fontSize:12, color:"var(--muted)" }}>km</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:12, color:"var(--muted)" }}>Fee</span>
                  <span style={{ fontSize:12, color:"var(--muted)" }}>AED</span>
                  <input type="number" min={0} max={200} value={tier.fee}
                    onChange={e => {
                      const next = [...deliveryTiers];
                      next[i] = { ...next[i], fee: Number(e.target.value) };
                      setDeliveryTiers(next);
                    }}
                    style={{ width:60, padding:"5px 8px", borderRadius:8, border:"1px solid var(--border)", fontSize:13, fontWeight:800, textAlign:"center", outline:"none", fontFamily:"inherit" }} />
                  {tier.fee === 0 && <span style={{ fontSize:11, fontWeight:800, color:"#16a34a", background:"#f0fdf4", padding:"2px 8px", borderRadius:999 }}>FREE</span>}
                </div>
                {deliveryTiers.length > 1 && tier.upToKm !== null && (
                  <button onClick={() => setDeliveryTiers(prev => prev.filter((_, j) => j !== i))}
                    style={{ background:"#fef2f2", border:"none", borderRadius:8, padding:"5px 8px", cursor:"pointer", fontSize:13, color:"#dc2626", fontWeight:700 }}>✕</button>
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
              style={{ padding:"8px 14px", borderRadius:10, border:"1.5px dashed var(--border)", background:"white", cursor:"pointer", fontSize:13, fontWeight:700, color:"var(--muted)", fontFamily:"inherit", textAlign:"left" }}>
              + Add tier
            </button>
          </div>
          <div style={{ marginTop:12, padding:"10px 14px", borderRadius:10, background:"#eff6ff", border:"1px solid #bfdbfe", fontSize:12, color:"#1d4ed8", fontWeight:600 }}>
            💡 The last tier (Beyond) catches all distances beyond the previous bracket.
          </div>
        </div>

        {/* Location card */}
        <div style={{ background:"white", borderRadius:16, border:"1px solid var(--border)",
          boxShadow:"0 2px 12px rgba(0,0,0,0.04)", overflow:"hidden", marginBottom:14 }}>
          <div style={{ padding:"18px 22px 16px", borderBottom:"1px solid var(--border)",
            display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontWeight:900, fontSize:15, color:"#111827" }}>📍 Restaurant Location</div>
              <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>
                Click the map or drag the pin to set your exact location. This powers the live delivery map.
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
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
            <LocationMap location={location} onChange={updateLocation} />
          </div>
          <div style={{ padding:"10px 20px", background:"#f9fafb", borderTop:"1px solid var(--border)",
            fontSize:12, color:"var(--muted)", display:"flex", gap:16 }}>
            <span>📌 Lat: <b style={{ color:"#111827" }}>{location.lat.toFixed(5)}</b></span>
            <span>📌 Lng: <b style={{ color:"#111827" }}>{location.lng.toFixed(5)}</b></span>
          </div>
        </div>

        {/* Opening Hours card */}
        <div style={{ background:"white", borderRadius:16, border:"1px solid var(--border)",
          boxShadow:"0 2px 12px rgba(0,0,0,0.04)", overflow:"hidden" }}>

          {/* Card header */}
          <div style={{ padding:"18px 22px 16px", borderBottom: is24_7 ? "none" : "1px solid var(--border)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
              <div>
                <div style={{ fontWeight:900, fontSize:15, color:"#111827" }}>Opening Hours</div>
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
                  background:  is24_7 ? "#fff5f3" : "#f9fafb",
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
                  background:"#f9fafb", color: is24_7 ? "#d1d5db" : "#374151",
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
                  background:"#fef2f2", color: is24_7 ? "#fca5a5" : "#dc2626",
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
                background:"linear-gradient(135deg, #fff5f3, #fff1ee)",
                border:"1.5px solid #fca89a",
                display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ fontSize:22 }}>🕐</div>
                  <div>
                    <div style={{ fontWeight:900, fontSize:13, color:"#ff4e2a" }}>
                      Open 24 hours, 7 days a week
                    </div>
                    <div style={{ fontSize:12, color:"#9ca3af", marginTop:2 }}>
                      All days set to 12:00 AM – 11:59 PM. Click "24/7 ON" to restore previous hours.
                    </div>
                  </div>
                </div>
                <button onClick={toggle24_7} style={{
                  padding:"7px 14px", borderRadius:9, border:"1.5px solid #fca89a",
                  background:"white", color:"#ff4e2a", fontWeight:800,
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
                background: isToday ? "#f0fdf4" : "white",
              }}>

                {/* Day name col */}
                <div style={{ width:130, padding:"13px 12px 13px 20px", flexShrink:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    {isToday && (
                      <div style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e",
                        flexShrink:0, boxShadow:"0 0 0 2px #bbf7d0" }} />
                    )}
                    <span style={{ fontWeight:800, fontSize:14,
                      color: d.closed ? "#9ca3af" : "#111827" }}>
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
                            outline:"none", fontFamily:"inherit", color:"#111827",
                            background:"white", cursor:"pointer" }} />
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
                            outline:"none", fontFamily:"inherit", color:"#111827",
                            background:"white", cursor:"pointer" }} />
                      </div>
                      {durLabel && (
                        <span style={{ fontSize:11, color:"var(--muted)", fontWeight:600,
                          flexShrink:0, background:"#f3f4f6", borderRadius:7,
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
                      border:"1px solid var(--border)", background:"white",
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
          <div style={{ padding:"14px 20px", background:"#f9fafb",
            borderTop:"1px solid var(--border)", display:"flex", gap:6, flexWrap:"wrap" }}>
            {DAYS.map(day => {
              const d = hours[day] || {};
              const isToday = day === todayKey;
              return (
                <div key={day} style={{ flex:"1 0 70px", display:"flex", flexDirection:"column",
                  alignItems:"center", padding:"7px 6px", borderRadius:10,
                  background: isToday ? "#dcfce7" : d.closed ? "#fafafa" : "white",
                  border:`1px solid ${isToday ? "#86efac" : "var(--border)"}` }}>
                  <span style={{ fontSize:10, fontWeight:800, color:"var(--muted)",
                    textTransform:"uppercase", letterSpacing:"0.4px" }}>
                    {DAY_SHORT[day]}
                  </span>
                  {d.closed ? (
                    <span style={{ fontSize:11, fontWeight:700, color:"#ef4444", marginTop:3 }}>—</span>
                  ) : (
                    <span style={{ fontSize:10, fontWeight:700, color:"#374151", marginTop:3,
                      whiteSpace:"nowrap", textAlign:"center" }}>
                      {fmt12(d.open)}<br />{fmt12(d.close)}
                    </span>
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