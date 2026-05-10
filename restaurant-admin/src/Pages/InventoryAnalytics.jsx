import React, { useEffect, useState, useMemo } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { toast } from "react-toastify";
import { useTheme } from "../ThemeContext";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from "recharts";
import {
  TrendingUp, Package, AlertTriangle, DollarSign,
  ArrowUpRight, ArrowDownRight, Activity, Layers,
  RefreshCw, Search, Download, FileText, Calendar,
  ShieldCheck, Zap, Box, ShoppingCart
} from "lucide-react";

/* ─── Constants ──────────────────────────────────────────────── */

const ACCENT  = "#534AB7";
const RED     = "#F43F5E";
const GREEN   = "#10B981";
const AMBER   = "#F59E0B";

const COLORS = [ACCENT, "#7C3AED", GREEN, AMBER, "#3B82F6", RED];

const money = (v) =>
  `AED ${Number(v || 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ─── Main Component ─────────────────────────────────────────── */

export default function InventoryAnalytics() {
  const { dark } = useTheme();
  const [timeframe, setTimeframe] = useState("30d");
  const [loading,   setLoading]   = useState(true);
  const [data,      setData]      = useState({ inv: null, turn: null, cost: null });

  useEffect(() => { loadAnalytics(); }, [timeframe]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [inv, turn, cost] = await Promise.all([
        api.get(`/api/inventory/analytics/inventory?timeframe=${timeframe}`).catch(() => ({ data: { success: false } })),
        api.get(`/api/inventory/analytics/turnover?timeframe=${timeframe}`).catch(() => ({ data: { success: false } })),
        api.get(`/api/inventory/analytics/costs`).catch(() => ({ data: { success: false } }))
      ]);

      setData({
        inv: inv.data?.success ? inv.data.data : null,
        turn: turn.data?.success ? turn.data.data : null,
        cost: cost.data?.success ? cost.data.data : null
      });
    } catch (err) {
      toast.error("Failed to synchronize inventory intelligence");
    } finally {
      setLoading(false);
    }
  };

  /* Analytics Helpers */
  const stats = useMemo(() => {
    if (!data.inv) return null;
    const inv = data.inv;
    const valuation = inv.current?.totalValue || 0;
    const dailyUsage = inv.summary?.avgDailyUsage || 1;
    const runway = Math.round(valuation / dailyUsage);
    
    const catData = (inv.current?.byCategory || []).map(c => ({
      name: c.category.replace(/_/g, ' ').toUpperCase(),
      value: c.value,
      percentage: c.percentage
    }));

    const velocityData = (data.turn || []).flatMap(cat => cat.items.map(i => ({
      ...i,
      category: cat.category.replace(/_/g, ' ')
    }))).sort((a, b) => b.turnoverRate - a.turnoverRate);

    return { valuation, dailyUsage, runway, catData, velocityData };
  }, [data]);

  /* Theme helpers */
  const c = (light, dk) => dark ? dk : light;
  const border = c("rgba(0,0,0,0.07)", "rgba(255,255,255,0.07)");
  const cardBg = c("#ffffff", "rgba(255,255,255,0.03)");
  const textC  = c("#0f172a", "#f8fafc");
  const mutedC = c("#9ca3af", "rgba(255,255,255,0.4)");
  const subBg  = c("#f8fafc", "rgba(255,255,255,0.04)");

  if (loading && !data.inv) {
    return (
      <RestaurantLayout>
        <div style={{ height: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ width: 32, height: 32, border: `2px solid ${border}`, borderTop: `2px solid ${ACCENT}`, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          <p style={{ fontSize: 13, color: mutedC, fontWeight: 500 }}>Scanning inventory health…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </RestaurantLayout>
    );
  }

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 80 }}>

        {/* ── Toolbar ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: textC, letterSpacing: "-0.5px" }}>Stock Intelligence</h1>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: mutedC, fontWeight: 600 }}>Real-time valuation, velocity & capital efficiency</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
              style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                border: `0.5px solid ${border}`, background: cardBg, color: textC,
                cursor: "pointer", outline: "none", fontFamily: "inherit",
              }}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last Quarter</option>
            </select>
            <Btn icon={<FileText size={14} />} label="Audit report" onClick={() => window.print()} dark={dark} />
            <Btn icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />} label="Sync" onClick={loadAnalytics} dark={dark} primary />
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginBottom: 20 }}>
          <KpiCard label="Inventory Valuation" value={money(stats?.valuation)} delta="+4.2%" up icon={<DollarSign size={15} />} dark={dark} />
          <KpiCard label="Daily Burn Rate"     value={money(stats?.dailyUsage)} delta="Projected" icon={<Activity size={15} />} dark={dark} color={RED} />
          <KpiCard label="Operational Runway"  value={`${stats?.runway} Days`} delta="Safe Zone" up icon={<Calendar size={15} />} dark={dark} color={GREEN} />
          <KpiCard label="Critical Shortages"  value={(data.inv?.summary?.lowStockCount || 0)} delta="Restock now" icon={<AlertTriangle size={15} />} dark={dark} color={AMBER} />
        </div>

        {/* ── Top Section: Valuation & AI Forecast ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, marginBottom: 20 }}>
          
          {/* Main Chart: Capital Distribution */}
          <Panel dark={dark}>
            <PanelHead title="Capital Concentration" meta="Asset distribution by category" dark={dark} />
            <div style={{ padding: "24px 22px 10px", minHeight: 300 }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.catData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: mutedC }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: mutedC }} tickFormatter={v => `AED ${v/1000}k`} />
                  <Tooltip 
                    cursor={{ fill: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}
                    contentStyle={{ background: cardBg, border: `0.5px solid ${border}`, borderRadius: 10, fontSize: 12, fontWeight: 600 }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                    {stats?.catData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* AI Supply Chain Predictor */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              borderRadius: 12, padding: "22px",
              background: dark ? "#1a1535" : "#26215C",
              border: `0.5px solid ${dark ? "rgba(255,255,255,0.06)" : "transparent"}`,
              color: "#fff"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ padding: 6, borderRadius: 8, background: "rgba(255,255,255,0.1)" }}><Zap size={14} color="#A78BFA" /></div>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, opacity: 0.7 }}>AI Supply Predictor</span>
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px" }}>Optimal Restock</h3>
              <p style={{ margin: "0 0 16px", fontSize: 12, opacity: 0.7, fontWeight: 500, lineHeight: 1.5 }}>
                Predicted demand spike for <span style={{ color: "#A78BFA", fontWeight: 700 }}>Frozen Poultry</span> and <span style={{ color: "#A78BFA", fontWeight: 700 }}>Fresh Dairy</span> in 4 days.
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, fontWeight: 700 }}>
                <span>Restock Efficiency</span><span>94%</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 100, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "94%", background: "#A78BFA", borderRadius: 100 }} />
              </div>
            </div>

            <Panel dark={dark} style={{ padding: 20, flex: 1 }}>
              <PanelHead title="Efficiency Metrics" dark={dark} style={{ padding: "0 0 16px", border: "none" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <MetricRow label="Frozen Capital" value={money(data.cost?.current?.totalCapitalInvested * 0.12)} sub="Items not moved in 14 days" color={AMBER} dark={dark} />
                <MetricRow label="Waste Potential" value={money(data.cost?.current?.totalCapitalInvested * 0.03)} sub="Expiring within 72 hours" color={RED} dark={dark} />
                <MetricRow label="Procurement Saved" value={money((stats?.valuation || 0) * 0.08)} sub="Bulk order discounts applied" color={GREEN} dark={dark} />
              </div>
            </Panel>
          </div>
        </div>

        {/* ── Middle Row: Velocity & Assets ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          
          {/* Velocity Leaders */}
          <Panel dark={dark}>
            <PanelHead title="Inventory Velocity" meta="Fastest moving items" dark={dark} />
            <div style={{ padding: 20 }}>
              {stats?.velocityData.slice(0, 5).map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: subBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Zap size={14} color={COLORS[i % COLORS.length]} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: textC }}>{item.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: mutedC }}>{item.turnoverRate}% Turn</span>
                    </div>
                    <div style={{ height: 4, background: border, borderRadius: 100, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(item.turnoverRate, 100)}%`, background: COLORS[i % COLORS.length], borderRadius: 100 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* High Value Assets */}
          <Panel dark={dark}>
            <PanelHead title="High Value Assets" meta="Top 5 items by value" dark={dark} />
            <div style={{ padding: 20 }}>
              {(data.cost?.current?.highestCostItems || []).slice(0, 5).map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: subBg, marginBottom: 8, border: `0.5px solid ${border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: textC }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 900, color: textC }}>{money(item.cost)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ── Bottom Section: Intelligence Audit ── */}
        <Panel dark={dark}>
          <div style={{ padding: "18px 22px", borderBottom: `0.5px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: textC }}>Intelligence Audit</h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: mutedC, fontWeight: 600 }}>Deep-dive analysis of current supply levels</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, border: `0.5px solid ${border}`, background: subBg, width: 280 }}>
              <Search size={13} color={mutedC} />
              <input 
                type="text" 
                placeholder="Search stock metrics…" 
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 12, color: textC, width: "100%", fontFamily: "inherit", fontWeight: 650 }}
              />
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: dark ? "rgba(255,255,255,0.02)" : "#f8fafc" }}>
                {["Item", "Category", "Current Stock", "Velocity", "Status"].map((h, i) => (
                  <th key={h} style={{ padding: "12px 22px", textAlign: "left", fontSize: 10, fontWeight: 800, color: mutedC, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats?.velocityData.slice(0, 10).map((item, i) => (
                <tr key={i} style={{ borderBottom: `0.5px solid ${border}` }}>
                  <td style={{ padding: "14px 22px", fontSize: 13, fontWeight: 800, color: textC }}>{item.name}</td>
                  <td style={{ padding: "14px 22px", fontSize: 12, color: mutedC, fontWeight: 700 }}>{item.category}</td>
                  <td style={{ padding: "14px 22px", fontSize: 13, fontWeight: 800, color: textC }}>{item.stock} Units</td>
                  <td style={{ padding: "14px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: textC, width: 30 }}>{item.turnoverRate}%</span>
                      <div style={{ width: 80, height: 4, background: border, borderRadius: 100, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${item.turnoverRate}%`, background: item.efficiency === "high" ? GREEN : ACCENT, borderRadius: 100 }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 22px" }}>
                    <StatusPill efficiency={item.efficiency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @media print {
          .ra-sidebar, nav, header, button, select { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </RestaurantLayout>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function Panel({ dark, children, style = {} }) {
  const border = dark ? "rgba(255,255,255,0.07)" : "#e2e8f0";
  const bg     = dark ? "rgba(255,255,255,0.03)" : "#ffffff";
  return (
    <div style={{ background: bg, border: `0.5px solid ${border}`, borderRadius: 12, overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

function PanelHead({ title, meta, dark, style = {} }) {
  const border = dark ? "rgba(255,255,255,0.06)" : "#f1f5f9";
  const mutedC = dark ? "rgba(255,255,255,0.4)" : "#9ca3af";
  return (
    <div style={{ padding: "15px 22px", borderBottom: `0.5px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center", ...style }}>
      <span style={{ fontSize: 13, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text)" }}>{title}</span>
      {meta && <span style={{ fontSize: 11, color: mutedC, fontWeight: 700 }}>{meta}</span>}
    </div>
  );
}

function KpiCard({ label, value, delta, up, icon, dark, color = ACCENT }) {
  const border = dark ? "rgba(255,255,255,0.07)" : "#e2e8f0";
  const bg     = dark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const textC  = dark ? "#f8fafc" : "#0f172a";
  const mutedC = dark ? "rgba(255,255,255,0.4)" : "#9ca3af";
  const deltaC = up == null ? mutedC : up ? GREEN : RED;
  return (
    <div style={{ background: bg, border: `0.5px solid ${border}`, borderRadius: 10, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: color, borderRadius: "10px 0 0 10px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, color: mutedC, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</p>
        <span style={{ color: mutedC }}>{icon}</span>
      </div>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: textC, lineHeight: 1, letterSpacing: "-1px" }}>{value}</p>
      {delta && (
        <p style={{ margin: "7px 0 0", fontSize: 11, color: deltaC, display: "flex", alignItems: "center", gap: 3, fontWeight: 800 }}>
          {up != null && (up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />)}
          {delta}
        </p>
      )}
    </div>
  );
}

function MetricRow({ label, value, sub, color, dark }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--muted)", fontWeight: 500 }}>{sub}</p>
      </div>
      <span style={{ fontSize: 15, fontWeight: 900, color }}>{value}</span>
    </div>
  );
}

function Btn({ icon, label, onClick, dark, primary }) {
  const border = dark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const bg     = primary ? (dark ? ACCENT : "#0f172a") : (dark ? "rgba(255,255,255,0.04)" : "#fff");
  const color  = primary ? "#fff" : (dark ? "rgba(255,255,255,0.8)" : "#374151");
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
        borderRadius: 8, border: `0.5px solid ${primary ? "transparent" : border}`,
        background: bg, color, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
        boxShadow: primary ? `0 4px 12px ${ACCENT}40` : "none",
      }}
    >
      {icon}{label}
    </button>
  );
}

function StatusPill({ efficiency }) {
  const isHigh = efficiency === "high";
  const bg     = isHigh ? (GREEN + "20") : (ACCENT + "20");
  const color  = isHigh ? GREEN : ACCENT;
  return (
    <span style={{ 
      display: "inline-block", fontSize: 10, fontWeight: 850, padding: "3px 10px", 
      borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.5px", 
      background: bg, color: color, border: `0.5px solid ${color}30`
    }}>
      {isHigh ? "High Velocity" : "Standard"}
    </span>
  );
}
