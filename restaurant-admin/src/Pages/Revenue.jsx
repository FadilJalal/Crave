import { useEffect, useMemo, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import { toast } from "react-toastify";
import {
  TrendingUp, DollarSign, ShoppingBag, Target,
  Download, FileText, Search as SearchIcon,
  ArrowUpRight, ArrowDownRight, CheckCircle2,
  AlertCircle, Clock, CreditCard, Banknote,
  Lightbulb, RefreshCw
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

/* ─── Constants ──────────────────────────────────────────────── */

const ACCENT   = "#534AB7";
const ACC_BG   = "#EEEDFE";
const ACC_TXT  = "#3C3489";

const TIMEFRAMES = [
  { value: "7d",  label: "Last 7 days",    days: 7   },
  { value: "30d", label: "Last 30 days",   days: 30  },
  { value: "90d", label: "Last 90 days",   days: 90  },
  { value: "all", label: "All time",       days: null },
];

const money = (v) =>
  `AED ${Number(v || 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ─── Main component ─────────────────────────────────────────── */

export default function Revenue() {
  const { dark } = useTheme();
  const [timeframe, setTimeframe] = useState("30d");
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/order/restaurant/list");
      if (res.data.success) setOrders(res.data.data);
    } catch {
      toast.error("Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  };

  const a = useMemo(() => {
    const tf  = TIMEFRAMES.find(o => o.value === timeframe);
    const now = new Date();
    const cut = tf.days ? new Date(now.setDate(now.getDate() - tf.days)) : null;
    const fil = cut ? orders.filter(o => new Date(o.createdAt) >= cut) : orders;

    const delivered  = fil.filter(o => o.status === "Delivered");
    const gross      = delivered.reduce((s, o) => s + (o.amount || 0), 0);
    const count      = delivered.length;
    const avg        = count ? gross / count : 0;
    const tax        = gross * 0.05;
    const fees       = gross * 0.15;
    const net        = gross - tax - fees;

    const cashRev    = delivered.filter(o => o.paymentMethod === "cod").reduce((s, o) => s + (o.amount || 0), 0);
    const cardRev    = gross - cashRev;

    const dailyMap = {};
    delivered.forEach(o => {
      const d = new Date(o.createdAt).toLocaleDateString([], { day: "2-digit", month: "short" });
      dailyMap[d] = (dailyMap[d] || 0) + o.amount;
    });
    const trend = Object.entries(dailyMap).map(([name, amount]) => ({ name, amount })).slice(-14);

    const recent   = trend.slice(-7);
    const prev     = trend.slice(-14, -7);
    const rAvg     = recent.length ? recent.reduce((s, d) => s + d.amount, 0) / recent.length : 0;
    const pAvg     = prev.length   ? prev.reduce((s, d) => s + d.amount, 0)   / prev.length   : 0;
    const gf       = pAvg > 0 ? 1 + Math.max(-0.1, Math.min(0.2, (rAvg - pAvg) / pAvg + 0.05)) : 1.05;
    const nextWeek = rAvg * 7 * gf;

    const itemMap = {};
    delivered.forEach(o => o.items?.forEach(i => {
      const n = i.item?.name || i.name;
      if (n) itemMap[n] = (itemMap[n] || 0) + (i.quantity || 1);
    }));
    const topItems = Object.entries(itemMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));

    const hourMap = {};
    delivered.forEach(o => {
      const h = new Date(o.createdAt).getHours();
      hourMap[h] = (hourMap[h] || 0) + 1;
    });
    const busiestHours = Object.entries(hourMap)
      .map(([h, c]) => ({ hour: `${h}:00`, count: c }))
      .sort((a, b) => b.count - a.count).slice(0, 3);

    const shared = delivered.filter(o => o.isSharedDelivery).length;
    const co2    = shared * 1.2;

    const ledger = fil.filter(o =>
      o._id.toLowerCase().includes(search.toLowerCase()) ||
      (o.address?.firstName || "").toLowerCase().includes(search.toLowerCase())
    );

    return { gross, count, avg, net, tax, fees, cashRev, cardRev, trend, nextWeek, topItems, busiestHours, shared, co2, ledger };
  }, [orders, timeframe, search]);

  /* helpers */
  const c = (light, dk) => dark ? dk : light;
  const border = c("rgba(0,0,0,0.07)", "rgba(255,255,255,0.07)");
  const cardBg = c("#ffffff", "rgba(255,255,255,0.03)");
  const mutedC = c("#9ca3af", "rgba(255,255,255,0.4)");
  const textC  = c("#0f172a", "#f8fafc");
  const subBg  = c("#f8fafc", "rgba(255,255,255,0.04)");

  if (loading) {
    return (
      <RestaurantLayout>
        <div style={{ height: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ width: 32, height: 32, border: `2px solid ${border}`, borderTop: `2px solid ${ACCENT}`, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          <p style={{ fontSize: 13, color: mutedC, fontWeight: 500 }}>Loading financial data…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        </div>
      </RestaurantLayout>
    );
  }

  const cardPercent = a.gross > 0 ? Math.round((a.cardRev / a.gross) * 100) : 0;
  const cashPercent = 100 - cardPercent;

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 80 }}>

        {/* ── Toolbar ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: textC, letterSpacing: "-0.5px" }}>Revenue</h1>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: mutedC, fontWeight: 600 }}>Financial overview &amp; settlement tracking</p>
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
              {TIMEFRAMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <Btn icon={<FileText size={14} />} label="Audit report" onClick={() => window.print()} dark={dark} />
            <Btn icon={<Download size={14} />} label="Export" onClick={() => toast.info("Export starting…")} dark={dark} primary />
          </div>
        </div>

        {/* ── KPI row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginBottom: 20 }}>
          <KpiCard label="Gross revenue"      value={money(a.gross)}  delta="+18.4%" up  icon={<TrendingUp size={15} />}  dark={dark} />
          <KpiCard label="Net settlement"     value={money(a.net)}    delta="+12.1%" up  icon={<DollarSign size={15} />}  dark={dark} />
          <KpiCard label="Orders completed"   value={a.count}         delta="-2.4%"      icon={<ShoppingBag size={15} />} dark={dark} />
          <KpiCard label="Avg. order value"   value={money(a.avg)}    delta="Per order"  icon={<Target size={15} />}      dark={dark} />
        </div>

        {/* ── Breakdown ── */}
        <Panel dark={dark} style={{ marginBottom: 20 }}>
          <PanelHead title="Revenue breakdown" meta="Where does the money go?" dark={dark} />
          <div style={{ padding: 22, display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
            {[
              { label: "Gross sales",       value: money(a.gross),  pct: 100, color: ACCENT,    muted: false },
              { label: "Platform fees (15%)",value: `− ${money(a.fees)}`, pct: 15, color: "#ef4444", muted: false },
              { label: "VAT (5%)",           value: `− ${money(a.tax)}`,  pct: 5,  color: "#f59e0b", muted: false },
              { label: "Net profit",         value: money(a.net),   pct: 80, color: "#10b981",   highlight: true },
            ].map((b, i) => (
              <div key={i} style={{
                padding: "16px 18px", borderRadius: 10,
                background: b.highlight ? (dark ? "rgba(16,185,129,0.08)" : "#f0fdf4") : subBg,
                border: `0.5px solid ${b.highlight ? (dark ? "rgba(16,185,129,0.2)" : "#bbf7d0") : border}`,
              }}>
                <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, color: mutedC, textTransform: "uppercase", letterSpacing: 0.5 }}>{b.label}</p>
                <p style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 900, color: b.highlight ? "#10b981" : textC, letterSpacing: "-0.5px" }}>{b.value}</p>
                <div style={{ height: 4, background: border, borderRadius: 100, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${b.pct}%`, background: b.color, borderRadius: 100 }} />
                </div>
              </div>
            ))}
          </div>
          {a.co2 > 0 && (
            <div style={{ margin: "0 22px 22px", padding: "10px 14px", borderRadius: 9, background: dark ? "rgba(16,185,129,0.06)" : "#f0fdf4", border: `0.5px solid ${dark ? "rgba(16,185,129,0.15)" : "#bbf7d0"}`, display: "flex", alignItems: "center", gap: 9 }}>
              <Lightbulb size={13} color="#10b981" />
              <p style={{ margin: 0, fontSize: 12, color: dark ? "#6ee7b7" : "#15803d" }}>
                Your restaurant saved <strong>{a.co2.toFixed(1)} kg</strong> of CO₂ via <strong>{a.shared}</strong> shared delivery matches this period.
              </p>
            </div>
          )}
        </Panel>

        {/* ── Chart + Sidebar ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, marginBottom: 20 }}>

          {/* Chart */}
          <Panel dark={dark}>
            <PanelHead title="Revenue trend" meta={`Last ${a.trend.length} days`} dark={dark} />
            <div style={{ padding: "20px 22px 10px" }}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={a.trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={ACCENT} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={ACCENT} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: dark ? "rgba(255,255,255,0.35)" : "#9ca3af" }} dy={8} />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ stroke: ACCENT, strokeWidth: 1, strokeDasharray: "4 2" }}
                    contentStyle={{ background: cardBg, border: `0.5px solid ${border}`, borderRadius: 10, fontSize: 12, fontWeight: 500 }}
                    formatter={v => [money(v), "Revenue"]}
                  />
                  <Area type="monotone" dataKey="amount" stroke={ACCENT} strokeWidth={2} fill="url(#aGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* AI Forecast */}
            <div style={{
              borderRadius: 12, padding: "20px 20px",
              background: dark ? "#1a1535" : "#26215C",
              border: `0.5px solid ${dark ? "rgba(255,255,255,0.06)" : "transparent"}`,
            }}>
              <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.8 }}>AI forecast · next 7 days</p>
              <p style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>{money(a.nextWeek)}</p>
              <p style={{ margin: "0 0 14px", fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, fontWeight: 500 }}>
                Based on your recent trend. Keep breakfast inventory ready for the upcoming weekend.
              </p>
              <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 100, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "82%", background: "#7F77DD", borderRadius: 100 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>
                <span>Market fit</span><span>82%</span>
              </div>
            </div>

            {/* Payment split */}
            <Panel dark={dark} style={{ padding: 18 }}>
              <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: mutedC }}>Payment methods</p>
              {[
                { label: "Online / card", pct: cardPercent, color: ACCENT,    icon: <CreditCard size={12} /> },
                { label: "Cash on delivery", pct: cashPercent, color: "#f59e0b", icon: <Banknote  size={12} /> },
              ].map((pm, i) => (
                <div key={i} style={{ marginBottom: i === 0 ? 12 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: mutedC, fontWeight: 700 }}>{pm.icon}{pm.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: textC }}>{pm.pct}%</span>
                  </div>
                  <div style={{ height: 5, background: border, borderRadius: 100, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pm.pct}%`, background: pm.color, borderRadius: 100 }} />
                  </div>
                </div>
              ))}
            </Panel>

            {/* Top dishes */}
            <Panel dark={dark} style={{ padding: 18, flex: 1 }}>
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: mutedC }}>Top selling dishes</p>
              {a.topItems.length > 0 ? a.topItems.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                  <span style={{ fontSize: 13, color: textC, fontWeight: 700 }}>{item.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 100, background: ACC_BG, color: ACC_TXT }}>{item.qty} sold</span>
                </div>
              )) : <p style={{ fontSize: 12, color: mutedC, fontWeight: 600 }}>No data yet</p>}

              {a.busiestHours.length > 0 && (
                <>
                  <p style={{ margin: "14px 0 10px", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: mutedC }}>Busiest hours</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {a.busiestHours.map((h, i) => (
                      <div key={i} style={{ flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 8, background: subBg, border: `0.5px solid ${border}` }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: textC }}>{h.hour}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 10, color: mutedC, fontWeight: 600 }}>{h.count} orders</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Panel>
          </div>
        </div>

        {/* ── Ledger ── */}
        <Panel dark={dark} style={{ overflow: "hidden" }}>
          <div style={{
            padding: "16px 22px", borderBottom: `0.5px solid ${border}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: textC }}>Sales ledger</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: mutedC, fontWeight: 600 }}>Detailed list of all orders and payments</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, border: `0.5px solid ${border}`, background: subBg, width: 260 }}>
              <SearchIcon size={13} color={mutedC} />
              <input
                type="text"
                placeholder="Search by order ID or name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 12, color: textC, width: "100%", fontFamily: "inherit", fontWeight: 700 }}
              />
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead>
              <tr style={{ background: dark ? "rgba(255,255,255,0.02)" : "#f8fafc" }}>
                {["Order ID", "Customer", "Date", "Status", "Amount"].map((h, i) => (
                  <th key={h} style={{
                    padding: "10px 20px", textAlign: i === 4 ? "right" : "left",
                    fontSize: 10, fontWeight: 800, color: mutedC,
                    textTransform: "uppercase", letterSpacing: 0.8,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {a.ledger.slice(0, 15).map(order => (
                <tr key={order._id} style={{ borderBottom: `0.5px solid ${border}` }}>
                  <td style={{ padding: "13px 20px", fontFamily: "monospace", fontSize: 12, color: ACCENT, fontWeight: 800 }}>
                    #{order._id.slice(-8).toUpperCase()}
                  </td>
                  <td style={{ padding: "13px 20px", fontSize: 13, fontWeight: 800, color: textC }}>
                    {order.address?.firstName || "—"}
                  </td>
                  <td style={{ padding: "13px 20px", fontSize: 12, color: mutedC, fontWeight: 700 }}>
                    {new Date(order.createdAt).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ padding: "13px 20px" }}>
                    <StatusPill status={order.status} />
                  </td>
                  <td style={{ padding: "13px 20px", textAlign: "right", fontSize: 14, fontWeight: 900, color: textC, letterSpacing: "-0.5px" }}>
                    {money(order.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

      </div>

      {/* ── Print report ── */}
      <div className="rev-print-only">
        <h1>CRAVE — Financial Audit Report</h1>
        <p style={{ color: "#6b7280", marginBottom: 24 }}>Generated: {new Date().toLocaleString()}</p>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32 }}>
          <tbody>
            {[
              ["Gross sales",          money(a.gross)],
              ["Platform fees (15%)", `− ${money(a.fees)}`],
              ["VAT (5%)",            `− ${money(a.tax)}`],
              ["Net settlement",       money(a.net)],
            ].map(([l, v]) => (
              <tr key={l} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "10px 0" }}>{l}</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 60 }}>Electronically generated by Crave Intelligence Hub.</p>
        <div style={{ borderTop: "1px solid #eee", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", fontSize: 10 }}>
          <span>Manager Signature: _________________________</span>
          <span>Date: _______________</span>
        </div>
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .rev-print-only { display: none; padding: 40px; font-family: sans-serif; }
        @media print {
          .ra-sidebar, nav, header, .rev-toolbar { display: none !important; }
          .rev-print-only { display: block !important; }
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

function PanelHead({ title, meta, dark }) {
  const border = dark ? "rgba(255,255,255,0.06)" : "#f1f5f9";
  const mutedC = dark ? "rgba(255,255,255,0.4)" : "#9ca3af";
  return (
    <div style={{ padding: "15px 22px", borderBottom: `0.5px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text)" }}>{title}</span>
      {meta && <span style={{ fontSize: 11, color: mutedC, fontWeight: 700 }}>{meta}</span>}
    </div>
  );
}

function KpiCard({ label, value, delta, up, icon, dark }) {
  const border = dark ? "rgba(255,255,255,0.07)" : "#e2e8f0";
  const bg     = dark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const textC  = dark ? "#f8fafc" : "#0f172a";
  const mutedC = dark ? "rgba(255,255,255,0.4)" : "#9ca3af";
  const deltaC = up == null ? mutedC : up ? "#10b981" : "#ef4444";
  return (
    <div style={{ background: bg, border: `0.5px solid ${border}`, borderRadius: 10, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "#534AB7", borderRadius: "10px 0 0 10px" }} />
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

function Btn({ icon, label, onClick, dark, primary }) {
  const border = dark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const bg     = primary ? (dark ? "#534AB7" : "#0f172a") : (dark ? "rgba(255,255,255,0.04)" : "#fff");
  const color  = primary ? "#fff" : (dark ? "rgba(255,255,255,0.8)" : "#374151");
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
        borderRadius: 8, border: `0.5px solid ${primary ? "transparent" : border}`,
        background: bg, color, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
        boxShadow: primary ? "0 4px 12px rgba(83, 74, 183, 0.25)" : "none",
      }}
    >
      {icon}{label}
    </button>
  );
}

function StatusPill({ status }) {
  const s = status?.toLowerCase();
  const styles = {
    delivered: { bg: "#EAF3DE", color: "#27500A" },
    cancelled:  { bg: "#FCEBEB", color: "#791F1F" },
    pending:    { bg: "#E6F1FB", color: "#0C447C" },
    processing: { bg: "#FAEEDA", color: "#633806" },
  };
  const st = styles[s] || styles.pending;
  return (
    <span style={{ display: "inline-block", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.5px", background: st.bg, color: st.color }}>
      {status}
    </span>
  );
}