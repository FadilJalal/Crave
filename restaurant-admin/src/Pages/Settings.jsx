import { useEffect, useState } from "react";
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
  const hours = openingHours;
  if (!hours) return isActive;
  const now = new Date();
  const day = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];
  const h = hours[day];
  if (!h || h.closed) return false;
  const [oh, om] = h.open.split(":").map(Number);
  const [ch, cm] = h.close.split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= oh * 60 + om && mins < ch * 60 + cm;
}

function fmt12(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
}

export default function Settings() {
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [prepTime, setPrepTime] = useState(15);
  const [hours,    setHours]    = useState(DEFAULT_HOURS);
  const [openNow,  setOpenNow]  = useState(false);

  const todayKey = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/restaurantadmin/me");
      if (res.data?.success) {
        const r = res.data.data;
        setIsActive(r.isActive ?? true);
        setPrepTime(r.avgPrepTime ?? 15);
        const h = { ...DEFAULT_HOURS, ...(r.openingHours || {}) };
        setHours(h);
        setOpenNow(computeIsOpenNow(h, r.isActive ?? true));
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

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.post("/api/restaurantadmin/settings", {
        isActive, avgPrepTime: prepTime, openingHours: hours,
      });
      if (res.data?.success) {
        toast.success("Settings saved!");
        try {
          const info = JSON.parse(localStorage.getItem("restaurantInfo") || "{}");
          localStorage.setItem("restaurantInfo", JSON.stringify({ ...info, isActive, avgPrepTime: prepTime, openingHours: hours }));
        } catch {}
      } else {
        toast.error(res.data?.message || "Failed to save");
      }
    } catch { toast.error("Network error"); }
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

        {/* Opening Hours card */}
        <div style={{ background:"white", borderRadius:16, border:"1px solid var(--border)",
          boxShadow:"0 2px 12px rgba(0,0,0,0.04)", overflow:"hidden" }}>

          {/* Card header */}
          <div style={{ padding:"18px 22px 16px", borderBottom:"1px solid var(--border)",
            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontWeight:900, fontSize:15, color:"#111827" }}>Opening Hours</div>
              <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>
                Click Open/Closed to toggle a day · Copy icon applies that day's hours to all
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => applyToAll(todayKey)} style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"8px 14px", borderRadius:10, border:"1px solid var(--border)",
                background:"#f9fafb", color:"#374151", cursor:"pointer",
                fontSize:12, fontWeight:700,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                Copy today to all
              </button>
              <button onClick={() => {
                setHours(Object.fromEntries(DAYS.map(d => [d, { open:"09:00", close:"22:00", closed:false }])));
                toast.success("Hours reset to defaults");
              }} style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"8px 14px", borderRadius:10, border:"1px solid #fecaca",
                background:"#fef2f2", color:"#dc2626", cursor:"pointer",
                fontSize:12, fontWeight:700,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                </svg>
                Reset
              </button>
            </div>
          </div>

          {/* Day rows */}
          {DAYS.map((day, i) => {
            const d = hours[day] || { open:"09:00", close:"22:00", closed:false };
            const isToday = day === todayKey;
            const isLast  = i === DAYS.length - 1;

            // Compute duration label
            let durLabel = null;
            if (!d.closed) {
              const [oh,om] = d.open.split(":").map(Number);
              const [ch,cm] = d.close.split(":").map(Number);
              const dur = (ch*60+cm) - (oh*60+om);
              if (dur > 0) {
                const hrs = Math.floor(dur/60), mins = dur%60;
                durLabel = `${hrs > 0 ? hrs+"h" : ""}${mins > 0 ? " "+mins+"m" : ""}`.trim();
              }
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