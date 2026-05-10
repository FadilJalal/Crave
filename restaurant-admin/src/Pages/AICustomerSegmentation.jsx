import { useEffect, useMemo, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import { toast } from "react-toastify";

const SEG_META = {
  VIP:       { color: "#b45309", bg: "#fef3c7", border: "#fde68a", badge: "#92400e", icon: "👑" },
  Loyal:     { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", badge: "#1e3a8a", icon: "💎" },
  Regular:   { color: "#6d28d9", bg: "#f5f3ff", border: "#ddd6fe", badge: "#4c1d95", icon: "⭐" },
  "At Risk": { color: "#c2410c", bg: "#fff7ed", border: "#fed7aa", badge: "#9a3412", icon: "⚠️" },
  Lost:      { color: "#be123c", bg: "#fff1f2", border: "#fecdd3", badge: "#9f1239", icon: "💔" },
  New:       { color: "#065f46", bg: "#ecfdf5", border: "#a7f3d0", badge: "#064e3b", icon: "🌱" },
};

const toNum = (v, f = 0) => { const n = Number(v); return isFinite(n) ? n : f; };
const money = (v) => `AED ${toNum(v).toLocaleString("en-AE")}`;
const PREVIEW_ROWS = 3;

export default function AICustomerSegmentation() {
  const { dark } = useTheme();
  const [segments, setSegments]     = useState([]);
  const [customers, setCustomers]   = useState([]);
  const [metrics, setMetrics]       = useState({});
  const [loading, setLoading]       = useState(false);
  const [expanded, setExpanded]     = useState({});
  const [search, setSearch]         = useState("");
  const [campaignMsg, setCampaign]  = useState("");
  const [sendingKey, setSending]    = useState("");
  const [scriptKey, setScript]      = useState("");
  const [subscription, setSub]      = useState(null);
  const [campOpen, setCampOpen]     = useState(true);

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
      const m = SEG_META[t] || { color: "#374151", bg: "#f9fafb", border: "#e5e7eb", badge: "#1f2937", icon: "⭐" };
      const list = customers.filter(c => c.segment === t).sort((a, b) => toNum(b.totalSpent) - toNum(a.totalSpent));
      return { ...seg, ...m, type: t, count: toNum(seg.customers), pct: Math.min(100, toNum(seg.percentage)), avgSpent: toNum(seg.avgSpent), avgOrders: toNum(seg.avgOrders), customers: list };
    }), [segments, customers]);

  const genScript = async (type) => {
    setScript(type);
    try {
      const res = await api.post("/api/ai/restaurant/generate-campaign-script", { 
        segmentType: type, 
        supportersOnly: false,
        prompt: campaignMsg 
      });
      if (res.data?.success) setCampaign(res.data.script);
    } catch (err) { 
      console.error(err);
      toast.error("AI writing failed. Check connection or API key."); 
    } finally { setScript(""); }
  };

  const sendCampaign = async (type) => {
    if (!isPro) { toast.error("Enterprise plan required."); return; }
    setSending(type);
    try {
      let msg = campaignMsg.trim();
      if (!msg) { 
        const r = await api.post("/api/ai/restaurant/generate-campaign-script", { segmentType: type, supportersOnly: false, prompt: "" }); 
        msg = r.data?.script || ""; 
        if (msg) setCampaign(msg); 
      }
      const res = await api.post("/api/ai/restaurant/create-campaign", { segmentType: type, supportersOnly: false, supporterLimit: 20, message: msg || undefined });
      if (res.data?.success) toast.success(res.data?.message || "Campaign sent!"); 
      else toast.error(res.data?.message || "Failed to send.");
    } catch (err) { 
      console.error(err);
      toast.error("Campaign execution failed."); 
    } finally { setSending(""); }
  };

  const exportCsv = () => {
    const rows = [["Name","Email","Segment","Orders","Spent","Avg Order"],
      ...customers.map(c => [c.name||"", c.email||"", c.segment||"", toNum(c.totalOrders), toNum(c.totalSpent), toNum(c.avgOrder)])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"}));
    a.download = "customer_segments.csv"; a.click();
  };

  // ── Theme tokens ──────────────────────────────────────
  const T = dark ? {
    page:      "#0d1017",
    surface:   "#161920",
    surfaceAlt:"#1c1f28",
    border:    "#252830",
    borderMid: "#31343f",
    txt:       "#eef0f8",
    txtSub:    "#8186a0",
    txtFaint:  "#454860",
    rule:      "#1f2230",
    inputBg:   "#12141a",
    headerBg:  "#161920",
  } : {
    page:      "#f0f2f6",
    surface:   "#ffffff",
    surfaceAlt:"#f7f8fa",
    border:    "#e3e6ef",
    borderMid: "#ced2e0",
    txt:       "#111827",
    txtSub:    "#64748b",
    txtFaint:  "#9ca3af",
    rule:      "#eef0f6",
    inputBg:   "#f7f8fa",
    headerBg:  "#ffffff",
  };

  const kpis = [
    { label: "Total Customers",  value: toNum(metrics.totalCustomers).toLocaleString(), icon: "👥", accent: "#1d4ed8" },
    { label: "Avg Order Value",  value: money(metrics.avgOrderValue),                   icon: "💰", accent: "#b45309" },
    { label: "Active Segments",  value: enriched.length,                                icon: "🎯", accent: "#6d28d9" },
    { label: "Retention Rate",   value: `${toNum(metrics.retentionRate)}%`,             icon: "🔁", accent: "#065f46" },
  ];

  return (
    <RestaurantLayout>
      <div style={{ background: T.page, minHeight: "100vh", color: T.txt, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>

        {/* ── Page Header ─────────────────────────────── */}
        <div style={{ background: T.headerBg, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 32px" }}>

            {/* Title row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0 16px", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: T.txtSub, marginBottom: 3 }}>Growth &amp; AI</div>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px" }}>Customer Segmentation</h1>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={exportCsv} disabled={loading || !customers.length} style={{ padding: "8px 16px", borderRadius: 7, border: `1px solid ${T.borderMid}`, background: "none", color: T.txt, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, opacity: loading || !customers.length ? 0.4 : 1 }}>
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export
                </button>
                <button onClick={loadAll} disabled={loading} style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: "#1d4ed8", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Loading…" : "↻  Refresh"}
                </button>
              </div>
            </div>

            {/* KPI strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, paddingBottom: 20 }}>
              {kpis.map((k, i) => (
                <div key={i} style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 9, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{k.icon}</span>
                  <div>
                    {loading
                      ? <div style={{ height: 18, width: 64, borderRadius: 4, background: T.border, marginBottom: 4 }} />
                      : <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.4px", color: k.accent }}>{k.value}</div>}
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: T.txtSub }}>{k.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────── */}
        <div style={{ maxWidth: 1360, margin: "0 auto", padding: "24px 32px 40px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ══ CAMPAIGN LAUNCHER — hero section ══════════ */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>

            {/* Collapsible header */}
            <button
              onClick={() => setCampOpen(o => !o)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", background: "none", border: "none", borderBottom: campOpen ? `1px solid ${T.border}` : "none", cursor: "pointer", color: T.txt, fontFamily: "inherit", textAlign: "left" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>🚀</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Campaign Launcher</div>
                  <div style={{ fontSize: 11, color: T.txtSub, marginTop: 1 }}>AI-generate and send targeted messages to each customer segment</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {!isPro && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "3px 9px", borderRadius: 5 }}>Enterprise</span>}
                <svg width="14" height="14" fill="none" stroke={T.txtSub} strokeWidth="2" viewBox="0 0 24 24" style={{ transition: "transform 0.2s", transform: campOpen ? "rotate(180deg)" : "none" }}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </button>

            {campOpen && (
              <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Message textarea */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.11em", textTransform: "uppercase", color: T.txtSub }}>Campaign Message</label>
                    {campaignMsg && <button onClick={() => setCampaign("")} style={{ background: "none", border: "none", fontSize: 11, color: T.txtSub, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Clear ×</button>}
                  </div>
                  <textarea
                    value={campaignMsg}
                    onChange={e => setCampaign(e.target.value)}
                    placeholder="Write your message here — or click ✨ AI Write to auto-generate one…"
                    style={{ width: "100%", minHeight: 100, padding: "14px", borderRadius: 10, border: `1.5px solid ${T.borderMid}`, background: T.inputBg, color: T.txt, fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", lineHeight: 1.65, boxSizing: "border-box", transition: "border-color 0.2s" }}
                    onFocus={e => e.target.style.borderColor = "#1d4ed8"}
                    onBlur={e => e.target.style.borderColor = T.borderMid}
                  />
                </div>

                {/* Primary Action Buttons */}
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => genScript("General")}
                    disabled={scriptKey !== ""}
                    style={{ padding: "12px 24px", borderRadius: 8, border: `1px solid ${T.borderMid}`, background: T.surfaceAlt, color: T.txt, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", transition: "all 0.2s" }}
                  >
                    {scriptKey ? <Spinner /> : "✨"} AI Write
                  </button>
                  <button
                    onClick={() => sendCampaign("All")}
                    disabled={sendingKey !== "" || !isPro || !campaignMsg.trim()}
                    style={{ flex: 1, padding: "12px 24px", borderRadius: 8, border: "none", background: "#1d4ed8", color: "#fff", fontSize: 14, fontWeight: 800, cursor: (isPro && campaignMsg.trim()) ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "inherit", transition: "all 0.2s", opacity: (isPro && campaignMsg.trim()) ? 1 : 0.5, boxShadow: (isPro && campaignMsg.trim()) ? "0 4px 12px rgba(29,78,216,0.3)" : "none" }}
                  >
                    {sendingKey === "All" ? <Spinner white /> : "🚀"}
                    {sendingKey === "All" ? "Sending Campaign..." : "Send Campaign to All Customers"}
                  </button>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.11em", textTransform: "uppercase", color: T.txtSub, marginBottom: 10 }}>Targeted Segment Actions</div>
                  {/* Segment action table */}
                <div style={{ border: `1px solid ${T.border}`, borderRadius: 9, overflow: "hidden" }}>
                  {/* Table head */}
                  <div style={{ display: "grid", gridTemplateColumns: "2.5fr 100px 150px 120px 150px", gap: 10, padding: "10px 16px", background: T.surfaceAlt, borderBottom: `1px solid ${T.border}`, alignItems: "center" }}>
                    {["Segment", "Count", "Avg Spent", "", ""].map((h, i) => (
                      <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.txtSub, textAlign: i === 1 ? "center" : i === 2 ? "right" : "left" }}>{h}</div>
                    ))}
                  </div>

                  {loading
                    ? [...Array(4)].map((_, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "2.5fr 100px 150px 120px 150px", padding: "12px 16px", borderBottom: `1px solid ${T.rule}`, gap: 10 }}>
                        {[140, 40, 80, 100, 120].map((w, j) => (
                          <div key={j} style={{ height: 14, width: w, borderRadius: 4, background: T.border }} className="cs-skeleton" />
                        ))}
                      </div>
                    ))
                    : enriched.map((s, i) => (
                      <div key={i}
                        style={{ display: "grid", gridTemplateColumns: "2.5fr 100px 150px 120px 150px", padding: "12px 16px", borderBottom: i < enriched.length - 1 ? `1px solid ${T.rule}` : "none", alignItems: "center", gap: 10, transition: "background 0.13s" }}
                        onMouseEnter={e => e.currentTarget.style.background = T.surfaceAlt}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        {/* Name + badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 18 }}>{s.icon}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: T.txt }}>{s.type}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, background: dark ? "rgba(255,255,255,0.07)" : s.bg, color: dark ? s.color : s.badge, border: `1px solid ${dark ? T.border : s.border}`, padding: "2px 7px", borderRadius: 4, letterSpacing: "0.05em", marginLeft: "auto" }}>{s.pct}%</span>
                        </div>
                        {/* Count */}
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.txt, textAlign: "center" }}>{s.count}</span>
                        {/* Avg spent */}
                        <span style={{ fontSize: 13, fontWeight: 500, color: T.txt, textAlign: "right", fontFamily: "monospace" }}>{money(s.avgSpent)}</span>
                        {/* AI Write */}
                        <button
                          onClick={() => genScript(s.type)}
                          disabled={scriptKey !== ""}
                          style={{ padding: "8px 12px", borderRadius: 7, border: `1px solid ${T.borderMid}`, background: T.surface, color: T.txt, fontSize: 11, fontWeight: 600, cursor: scriptKey ? "default" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap", opacity: scriptKey && scriptKey !== s.type ? 0.45 : 1, transition: "all 0.2s" }}
                        >
                          {scriptKey === s.type ? <><Spinner />Writing…</> : <>✨ AI Write</>}
                        </button>
                        {/* Send */}
                        <button
                          onClick={() => sendCampaign(s.type)}
                          disabled={sendingKey !== "" || !isPro}
                          style={{ padding: "8px 12px", borderRadius: 7, border: "none", background: isPro ? s.color : T.borderMid, color: "#fff", fontSize: 11, fontWeight: 700, cursor: isPro && !sendingKey ? "pointer" : "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap", opacity: !isPro || (sendingKey && sendingKey !== s.type) ? 0.45 : 1, transition: "all 0.2s", boxShadow: isPro ? `0 4px 10px ${s.color}25` : "none" }}
                        >
                          {sendingKey === s.type ? <><Spinner white />Sending…</> : `🚀 Send to ${s.type}`}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ══ SEGMENT CARD GRID ══════════════════════════ */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
                Segments
                <span style={{ fontSize: 11, fontWeight: 600, color: T.txtSub, background: T.surface, border: `1px solid ${T.border}`, padding: "2px 9px", borderRadius: 20 }}>{enriched.length} groups</span>
              </h2>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: T.txtFaint }} width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers…"
                  style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7, borderRadius: 7, border: `1px solid ${T.borderMid}`, background: T.surface, color: T.txt, fontSize: 12, fontFamily: "inherit", outline: "none", width: 200 }} />
              </div>
            </div>

            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 14 }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{ height: 300, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12 }} className="cs-skeleton" />
                ))}
              </div>
            ) : enriched.length === 0 ? (
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 48, textAlign: "center", color: T.txtSub, fontSize: 13 }}>
                No segments found. Click Refresh to load data.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 14 }}>
                {enriched.map((seg, si) => {
                  const isExp = expanded[seg.type];
                  const segCusts = search
                    ? seg.customers.filter(c => (c.name||"").toLowerCase().includes(search.toLowerCase()) || (c.email||"").toLowerCase().includes(search.toLowerCase()))
                    : seg.customers;
                  const shown = isExp ? segCusts : segCusts.slice(0, PREVIEW_ROWS);
                  const hasMore = segCusts.length > PREVIEW_ROWS;

                  return (
                    <div key={si} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>

                      {/* Card header — tinted */}
                      <div style={{ padding: "15px 18px 13px", background: dark ? T.surfaceAlt : seg.bg, borderBottom: `1px solid ${dark ? T.border : seg.border}` }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 9, background: dark ? "rgba(255,255,255,0.06)" : "#fff", border: `1px solid ${dark ? T.border : seg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                              {seg.icon}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700 }}>{seg.type}</div>
                              <div style={{ fontSize: 11, color: T.txtSub, marginTop: 1 }}>{seg.count} customer{seg.count !== 1 ? "s" : ""}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: dark ? seg.color : seg.badge }}>{seg.pct}%</div>
                            <div style={{ fontSize: 10, color: T.txtFaint, marginTop: 1 }}>of total</div>
                          </div>
                        </div>

                        {/* Progress */}
                        <div style={{ height: 4, borderRadius: 99, background: dark ? "rgba(255,255,255,0.07)" : seg.border, overflow: "hidden", marginBottom: 11 }}>
                          <div style={{ height: "100%", width: `${seg.pct}%`, background: seg.color, borderRadius: 99 }} />
                        </div>

                        {/* Stats row */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {[["Avg Spent", money(seg.avgSpent)], ["Avg Orders", seg.avgOrders]].map(([l, v]) => (
                            <div key={l} style={{ background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.65)", border: `1px solid ${dark ? T.border : seg.border}`, borderRadius: 7, padding: "7px 10px" }}>
                              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: T.txtSub, marginBottom: 3 }}>{l}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: dark ? seg.color : seg.badge }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Customer list */}
                      <div style={{ flex: 1 }}>
                        {shown.length === 0 ? (
                          <div style={{ padding: "18px", textAlign: "center", color: T.txtFaint, fontSize: 12 }}>No customers match.</div>
                        ) : shown.map((c, ci) => {
                          const m = SEG_META[c.segment] || { color: "#374151", bg: "#f9fafb", border: "#e5e7eb", badge: "#1f2937" };
                          return (
                            <div key={ci}
                              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 18px", borderBottom: ci < shown.length - 1 ? `1px solid ${T.rule}` : "none", gap: 10, transition: "background 0.12s" }}
                              onMouseEnter={e => e.currentTarget.style.background = T.surfaceAlt}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                                <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: dark ? "rgba(255,255,255,0.06)" : m.bg, border: `1px solid ${dark ? T.border : m.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: m.color }}>
                                  {(c.name || "?")[0].toUpperCase()}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name || "Customer"}</div>
                                  <div style={{ fontSize: 11, color: T.txtSub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email || "—"}</div>
                                </div>
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: dark ? seg.color : seg.badge }}>{money(c.totalSpent)}</div>
                                <div style={{ fontSize: 10, color: T.txtFaint }}>{toNum(c.totalOrders)} orders</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Card footer */}
                      <div style={{ padding: "9px 18px", borderTop: `1px solid ${T.rule}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: T.surfaceAlt }}>
                        {hasMore ? (
                          <button onClick={() => setExpanded(e => ({ ...e, [seg.type]: !e[seg.type] }))}
                            style={{ background: "none", border: "none", fontSize: 11, fontWeight: 600, color: dark ? seg.color : seg.badge, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                            {isExp ? "▲ Show less" : `▼ +${segCusts.length - PREVIEW_ROWS} more`}
                          </button>
                        ) : <span />}
                        <button
                          onClick={() => sendCampaign(seg.type)}
                          disabled={sendingKey !== "" || !isPro}
                          style={{ padding: "5px 13px", borderRadius: 6, border: `1px solid ${dark ? T.borderMid : seg.border}`, background: "none", color: dark ? seg.color : seg.badge, fontSize: 11, fontWeight: 700, cursor: isPro && !sendingKey ? "pointer" : "not-allowed", fontFamily: "inherit", opacity: !isPro ? 0.4 : 1, transition: "background 0.14s", letterSpacing: "0.02em" }}
                          onMouseEnter={e => { if (isPro) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : seg.bg; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                        >
                          {sendingKey === seg.type ? "Sending…" : "↗ Campaign"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
          @keyframes cs-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
          .cs-skeleton { animation: cs-pulse 1.6s ease-in-out infinite; }
        `}</style>
      </div>
    </RestaurantLayout>
  );
}

// ── Tiny spinner component ──────────────────────────────
function Spinner({ white }) {
  return (
    <span style={{
      display: "inline-block", width: 10, height: 10, flexShrink: 0,
      border: `1.5px solid ${white ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.15)"}`,
      borderTopColor: white ? "#fff" : "currentColor",
      borderRadius: "50%",
      animation: "cs-pulse 0.65s linear infinite",
    }} />
  );
}
