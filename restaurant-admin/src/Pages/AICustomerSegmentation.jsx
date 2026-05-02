import { useEffect, useMemo, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import { toast } from "react-toastify";

const SEG = {
  VIP:       { color: "#f59e0b", icon: "👑" },
  Loyal:     { color: "#3b82f6", icon: "💎" },
  Regular:   { color: "#8b5cf6", icon: "🧑" },
  "At Risk": { color: "#f97316", icon: "⚠️" },
  Lost:      { color: "#ef4444", icon: "💔" },
  New:       { color: "#10b981", icon: "🌱" },
};

const toNum = (v, f = 0) => { const n = Number(v); return isFinite(n) ? n : f; };
const money = (v) => `AED ${toNum(v).toLocaleString("en-AE")}`;

export default function AICustomerSegmentation() {
  const { dark } = useTheme();
  const [segments, setSegments]     = useState([]);
  const [customers, setCustomers]   = useState([]);
  const [metrics, setMetrics]       = useState({});
  const [loading, setLoading]       = useState(false);
  const [activeSegment, setActive]  = useState(null);
  const [search, setSearch]         = useState("");
  const [campaignMsg, setCampaign]  = useState("");
  const [sendingKey, setSending]    = useState("");
  const [scriptKey, setScript]      = useState("");
  const [subscription, setSub]      = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, sub] = await Promise.all([
        api.get("/api/ai/restaurant/customer-segmentation"),
        api.get("/api/subscription/mine"),
      ]);
      if (s.data?.success) {
        setSegments(s.data.segments || []);
        setCustomers(s.data.customers || []);
        setMetrics(s.data.metrics || {});
      }
      if (sub.data?.success) setSub(sub.data.data || null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const isPro = String(subscription?.plan || "").toLowerCase() === "enterprise"
    && String(subscription?.status || "").toLowerCase() === "active";

  const enriched = useMemo(() =>
    segments.map(seg => {
      const t = seg.type || "Regular";
      const m = SEG[t] || { color: "#6b7280", icon: "🧑" };
      const list = customers.filter(c => c.segment === t).sort((a, b) => toNum(b.totalSpent) - toNum(a.totalSpent));
      return { ...seg, ...m, type: t, count: toNum(seg.customers), pct: Math.min(100, toNum(seg.percentage)), avgSpent: toNum(seg.avgSpent), avgOrders: toNum(seg.avgOrders), customers: list };
    }), [segments, customers]);

  const filtered = useMemo(() => {
    const base = activeSegment ? customers.filter(c => c.segment === activeSegment) : customers;
    const q = search.toLowerCase();
    return base.filter(c => !q || (c.name||"").toLowerCase().includes(q) || (c.email||"").toLowerCase().includes(q))
      .sort((a, b) => toNum(b.totalSpent) - toNum(a.totalSpent)).slice(0, 50);
  }, [customers, activeSegment, search]);

  const exportCsv = () => {
    const rows = [["Name","Email","Segment","Orders","Spent","Avg Order"],
      ...filtered.map(c => [c.name||"", c.email||"", c.segment||"", toNum(c.totalOrders), toNum(c.totalSpent), toNum(c.avgOrder)])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"}));
    a.download = `segments_${activeSegment||"all"}.csv`; a.click();
  };

  const genScript = async (type) => {
    setScript(type);
    try {
      const res = await api.post("/api/ai/restaurant/generate-campaign-script", { segmentType: type, supportersOnly: false });
      if (res.data?.success) setCampaign(res.data.script);
      else toast.error("AI script failed.");
    } catch { toast.error("Error."); } finally { setScript(""); }
  };

  const sendCampaign = async (type) => {
    if (!isPro) { toast.error("Enterprise plan required."); return; }
    setSending(type);
    try {
      let msg = campaignMsg.trim();
      if (!msg) { const r = await api.post("/api/ai/restaurant/generate-campaign-script", { segmentType: type, supportersOnly: false }); msg = r.data?.script || ""; if (msg) setCampaign(msg); }
      const res = await api.post("/api/ai/restaurant/create-campaign", { segmentType: type, supportersOnly: false, supporterLimit: 20, message: msg || undefined });
      if (res.data?.success) toast.success(res.data?.message || "Campaign sent!"); else toast.error(res.data?.message || "Failed.");
    } catch { toast.error("Failed."); } finally { setSending(""); }
  };

  // tokens
  const bg   = dark ? "#060810" : "#f8fafc";
  const card = dark ? "rgba(255,255,255,0.03)" : "#fff";
  const bd   = dark ? "rgba(255,255,255,0.08)" : "#e8edf3";
  const txt  = dark ? "#f1f5f9" : "#0f172a";
  const mut  = dark ? "#94a3b8" : "#64748b";
  const sf   = dark ? "rgba(255,255,255,0.05)" : "#f8fafc";
  const acc  = "#6366f1";

  return (
    <RestaurantLayout>
      <div style={{ background: bg, minHeight: "100vh", color: txt, fontFamily: "'Outfit',sans-serif" }}>

        {/* Hero Banner */}
        <div style={{ background: dark ? "linear-gradient(135deg,#0f1729 0%,#0a0f1e 100%)" : "linear-gradient(135deg,#eef2ff 0%,#f8faff 100%)", borderBottom: `1px solid ${bd}`, padding: "40px 40px 32px" }}>
          <div>
            <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:20 }}>
              <div>
                <span style={{ fontSize:11, fontWeight:900, color:acc, textTransform:"uppercase", letterSpacing:2, background:`${acc}15`, padding:"4px 12px", borderRadius:99, border:`1px solid ${acc}30` }}>AI Segment Studio</span>
                <h1 style={{ margin:"14px 0 6px", fontSize:36, fontWeight:950, letterSpacing:"-1.5px" }}>Customer <span style={{color:acc}}>Intelligence</span></h1>
                <p style={{ margin:0, fontSize:15, color:mut, fontWeight:500 }}>Behavioral clusters · Campaign dispatch · Real-time export</p>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={exportCsv} disabled={loading || !customers.length} style={{ padding:"11px 20px", borderRadius:12, border:`1px solid ${bd}`, background:card, color:txt, fontWeight:800, fontSize:13, cursor:"pointer" }}>📊 Export</button>
                <button onClick={loadAll} disabled={loading} style={{ padding:"11px 20px", borderRadius:12, border:"none", background:acc, color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer", boxShadow:`0 8px 20px ${acc}40` }}>
                  {loading ? "Analyzing..." : "🔄 Refresh"}
                </button>
              </div>
            </div>

            {/* KPI Strip */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginTop:28 }}>
              {[
                { label:"Total Customers",  value: toNum(metrics.totalCustomers),          color:"#3b82f6", icon:"👥" },
                { label:"Avg Order Value",   value: money(metrics.avgOrderValue),           color:"#f59e0b", icon:"💰" },
                { label:"Active Segments",   value: enriched.length,                        color:acc,       icon:"🎯" },
                { label:"Retention Rate",    value: `${toNum(metrics.retentionRate)}%`,     color:"#10b981", icon:"🔁" },
              ].map((k,i) => (
                <div key={i} style={{ background:card, borderRadius:18, padding:"18px 20px", border:`1px solid ${bd}`, display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ fontSize:28 }}>{k.icon}</div>
                  <div>
                    {loading ? <div style={{ height:24, width:80, borderRadius:6, background:sf, marginBottom:6 }} /> : <div style={{ fontSize:22, fontWeight:950, color:k.color }}>{k.value}</div>}
                    <div style={{ fontSize:11, fontWeight:800, color:mut, textTransform:"uppercase", letterSpacing:1 }}>{k.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding:"32px 40px" }}>
          {loading ? (
            <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:20 }}>
              {[...Array(7)].map((_,i) => <div key={i} style={{ height:i===0?420:120, borderRadius:20, background:card, border:`1px solid ${bd}`, animation:"acs-pulse 1.4s ease-in-out infinite", animationDelay:`${i*0.08}s` }} />)}
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:20, alignItems:"start" }}>

              {/* Sidebar: Segment List */}
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ background:card, border:`1px solid ${bd}`, borderRadius:20, overflow:"hidden" }}>
                  <div style={{ padding:"18px 20px", borderBottom:`1px solid ${bd}` }}>
                    <div style={{ fontSize:11, fontWeight:900, color:mut, textTransform:"uppercase", letterSpacing:2 }}>Segments</div>
                  </div>
                  {enriched.map((s,i) => (
                    <div key={i} onClick={() => setActive(activeSegment===s.type ? null : s.type)}
                      style={{ padding:"14px 20px", cursor:"pointer", background:activeSegment===s.type?`${s.color}10`:"transparent", borderLeft:activeSegment===s.type?`3px solid ${s.color}`:"3px solid transparent", transition:"all 0.18s", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${bd}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:s.color, boxShadow:activeSegment===s.type?`0 0 8px ${s.color}`:"none" }} />
                        <span style={{ fontSize:14, fontWeight:800 }}>{s.icon} {s.type}</span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:12, color:mut, fontWeight:700 }}>{s.count}</span>
                        <span style={{ fontSize:10, fontWeight:900, color:s.color, background:`${s.color}18`, padding:"2px 8px", borderRadius:99 }}>{s.pct}%</span>
                      </div>
                    </div>
                  ))}
                  {activeSegment && (
                    <div style={{ padding:"12px 20px" }}>
                      <button onClick={() => setActive(null)} style={{ background:"none", border:"none", color:mut, fontSize:12, fontWeight:700, cursor:"pointer" }}>✕ Show all</button>
                    </div>
                  )}
                </div>

                {/* Segment detail */}
                {activeSegment && (() => {
                  const s = enriched.find(x => x.type===activeSegment);
                  return s ? (
                    <div style={{ background:card, border:`1.5px solid ${s.color}40`, borderRadius:20, padding:20 }}>
                      <div style={{ fontSize:28, marginBottom:8 }}>{s.icon}</div>
                      <div style={{ fontSize:17, fontWeight:900, color:s.color }}>{s.type}</div>
                      <div style={{ height:4, borderRadius:99, background:sf, margin:"12px 0", overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${s.pct}%`, background:`linear-gradient(90deg,${s.color},${s.color}99)` }} />
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:12 }}>
                        {[["Avg Spent", money(s.avgSpent)], ["Avg Orders", s.avgOrders]].map(([l,v]) => (
                          <div key={l} style={{ background:sf, borderRadius:12, padding:"10px 12px" }}>
                            <div style={{ fontSize:9, fontWeight:900, color:mut, textTransform:"uppercase", marginBottom:4 }}>{l}</div>
                            <div style={{ fontSize:16, fontWeight:950, color:s.color }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Right panel */}
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

                {/* Customer table */}
                <div style={{ background:card, border:`1px solid ${bd}`, borderRadius:20, overflow:"hidden" }}>
                  <div style={{ padding:"20px 24px", borderBottom:`1px solid ${bd}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                    <div>
                      <h3 style={{ margin:0, fontSize:18, fontWeight:900 }}>
                        {activeSegment ? `${SEG[activeSegment]?.icon||""} ${activeSegment}` : "All Customers"}
                      </h3>
                      <p style={{ margin:"2px 0 0", fontSize:12, color:mut }}>{filtered.length} records</p>
                    </div>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or email..." style={{ padding:"9px 16px", borderRadius:12, border:`1px solid ${bd}`, background:sf, color:txt, fontSize:13, fontWeight:600, outline:"none", width:220 }} />
                  </div>
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead>
                        <tr style={{ background:sf }}>
                          {["Customer","Segment","Orders","Total Spent","Avg Order"].map(h => (
                            <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:900, color:mut, textTransform:"uppercase", letterSpacing:1, borderBottom:`1px solid ${bd}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr><td colSpan={5} style={{ padding:40, textAlign:"center", color:mut, fontSize:14 }}>No customers found.</td></tr>
                        ) : filtered.map((c,i) => {
                          const m = SEG[c.segment] || { color:"#6b7280", icon:"🧑" };
                          return (
                            <tr key={i} style={{ borderBottom:`1px solid ${bd}`, transition:"background 0.15s" }}
                              onMouseEnter={e=>e.currentTarget.style.background=sf}
                              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                              <td style={{ padding:"12px 16px" }}>
                                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                  <div style={{ width:34, height:34, borderRadius:"50%", background:`${m.color}20`, color:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:13, flexShrink:0 }}>
                                    {(c.name||"?")[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight:800, fontSize:14 }}>{c.name||"Customer"}</div>
                                    <div style={{ fontSize:11, color:mut }}>{c.email||""}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding:"12px 16px" }}>
                                <span style={{ fontSize:11, fontWeight:900, padding:"4px 10px", borderRadius:99, color:m.color, background:`${m.color}15`, border:`1px solid ${m.color}30` }}>{m.icon} {c.segment||"Regular"}</span>
                              </td>
                              <td style={{ padding:"12px 16px", fontWeight:800 }}>{toNum(c.totalOrders)}</td>
                              <td style={{ padding:"12px 16px", fontWeight:900, color:m.color }}>{money(c.totalSpent)}</td>
                              <td style={{ padding:"12px 16px", fontWeight:700, color:mut }}>{money(c.avgOrder)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ── Campaign Launcher (Full Width) ── */}
          {!loading && (
            <div style={{ background:card, border:`1px solid ${bd}`, borderRadius:20, overflow:"hidden", marginTop:20 }}>
              <div style={{ padding:"20px 24px", borderBottom:`1px solid ${bd}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <h3 style={{ margin:0, fontSize:18, fontWeight:900 }}>🚀 Campaign Launcher</h3>
                  <p style={{ margin:"2px 0 0", fontSize:12, color:mut }}>AI-write and dispatch targeted campaigns per segment</p>
                </div>
                {!isPro && <span style={{ background:"#f59e0b", color:"#fff", padding:"5px 14px", borderRadius:10, fontSize:10, fontWeight:900, textTransform:"uppercase" }}>Enterprise</span>}
              </div>

              <div style={{ padding:"20px 24px" }}>
                <div style={{ marginBottom:16, background:sf, border:`1px solid ${bd}`, borderRadius:14, padding:"14px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <span style={{ fontSize:10, fontWeight:900, color:mut, textTransform:"uppercase", letterSpacing:1 }}>Campaign Message</span>
                    <span style={{ fontSize:10, fontWeight:900, color:"#10b981", background:"rgba(16,185,129,0.1)", padding:"2px 8px", borderRadius:99 }}>LIVE DRAFT</span>
                  </div>
                  <textarea value={campaignMsg} onChange={e=>setCampaign(e.target.value)} placeholder="Write your message or click '✨ AI Write' below to auto-generate..."
                    style={{ width:"100%", minHeight:80, background:"transparent", border:"none", outline:"none", resize:"none", color:txt, fontSize:14, fontWeight:600, fontFamily:"inherit", lineHeight:1.7, boxSizing:"border-box" }} />
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:14 }}>
                  {enriched.map((s,i) => (
                    <div key={i} style={{ padding:16, borderRadius:16, background:`${s.color}08`, border:`1px solid ${s.color}25` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                        <span style={{ fontSize:20 }}>{s.icon}</span>
                        <div>
                          <div style={{ fontSize:14, fontWeight:900 }}>{s.type}</div>
                          <div style={{ fontSize:11, color:s.color, fontWeight:700 }}>{s.count} customers · {money(s.avgSpent)} avg</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={() => genScript(s.type)} disabled={scriptKey !== ""}
                          style={{ flex:1, padding:"9px", borderRadius:10, border:`1px solid ${s.color}40`, background:"transparent", color:s.color, fontWeight:800, fontSize:12, cursor:"pointer" }}>
                          {scriptKey===s.type ? "Writing..." : "✨ AI Write"}
                        </button>
                        <button onClick={() => sendCampaign(s.type)} disabled={sendingKey !== "" || !isPro}
                          style={{ flex:2, padding:"9px", borderRadius:10, border:"none", background:s.color, color:"#fff", fontWeight:900, fontSize:12, cursor:isPro?"pointer":"not-allowed", opacity:isPro?1:0.5, boxShadow:`0 6px 16px ${s.color}30` }}>
                          {sendingKey===s.type ? "Sending..." : `Send to ${s.type}`}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900;950&display=swap');
          @keyframes acs-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        `}</style>
      </div>
    </RestaurantLayout>
  );
}
