import { useEffect, useMemo, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import { toast } from "react-toastify";

const TIMEFRAME_OPTIONS = [
  { value: "7d", label: "Last 7 Days", days: 7 },
  { value: "30d", label: "Last 30 Days", days: 30 },
  { value: "90d", label: "Last 90 Days", days: 90 },
  { value: "all", label: "All Time", days: null },
];

const money = (value) => `AED ${Number(value || 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Revenue() {
  const { dark } = useTheme();
  const [timeframe, setTimeframe] = useState("30d");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/order/restaurant/list");
      if (res.data.success) setOrders(res.data.data);
    } catch (err) {
      toast.error("Failed to sync financial data");
    } finally {
      setLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const timeframeOption = TIMEFRAME_OPTIONS.find(o => o.value === timeframe);
    const now = new Date();
    const rangeLimit = timeframe === "all" ? null : new Date(now.setDate(now.getDate() - (timeframeOption?.days || 0)));
    
    const filtered = rangeLimit 
      ? orders.filter(o => new Date(o.createdAt) >= rangeLimit)
      : orders;

    const successful = filtered.filter(o => o.status === "Delivered");
    const gross = successful.reduce((s, o) => s + (o.amount || 0), 0);
    const pending = filtered.filter(o => ["Food Processing", "Out for delivery"].includes(o.status)).reduce((s, o) => s + (o.amount || 0), 0);
    const lost = filtered.filter(o => o.status === "Cancelled").reduce((s, o) => s + (o.amount || 0), 0);
    const avg = successful.length ? gross / successful.length : 0;
    
    // Payments
    const payments = { card: 0, cash: 0, split: 0 };
    successful.forEach(o => {
      const mode = (o.paymentMethod || (o.payment ? "stripe" : "cod")).toLowerCase();
      if (mode === "split") payments.split += o.amount || 0;
      else if (mode === "stripe") payments.card += o.amount || 0;
      else payments.cash += o.amount || 0;
    });

    const items = {};
    successful.forEach(o => {
      (o.items || []).forEach(i => {
        items[i.name] = (items[i.name] || 0) + (o.amount || 0); // using amount for simplification or calculate specifically
      });
    });

    const topItems = Object.entries(items)
      .map(([name, r]) => ({ name, r }))
      .sort((a,b) => b.r - a.r)
      .slice(0, 5);

    // Peak Hour
    const hourly = Array(24).fill(0);
    successful.forEach(o => {
      const h = new Date(o.createdAt).getHours();
      hourly[h] += o.amount || 0;
    });
    const peakHour = hourly.indexOf(Math.max(...hourly));

    return { gross, pending, lost, avg, count: successful.length, topItems, payments, filtered, peakHour };
  }, [orders, timeframe]);

  const surface = dark ? "#0f172a" : "#fff";
  const heroBg = dark ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)";
  const heroText = dark ? "#fff" : "#0f172a";

  if (loading) return <RestaurantLayout><div style={{ padding: 40, textAlign: 'center' }}>Syncing Wallet...</div></RestaurantLayout>;

  return (
    <RestaurantLayout>
      <div style={{ 
        fontFamily: "'Plus Jakarta Sans', sans-serif", maxWidth: 1100, margin: "0 auto", padding: "32px 0 60px",
        minHeight: "100vh"
      }}>
        
        {/* Modern Header Section */}
        <div style={{
          position: "relative", borderRadius: 32, padding: "44px 48px",
          background: dark 
            ? "radial-gradient(circle at top right, rgba(255, 78, 42, 0.15), transparent 70%), #111827" 
            : "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          marginBottom: 32,
          border: dark ? "1px solid rgba(255,255,255,0.05)" : "none",
          boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
          color: "white"
        }}>
          {dark && (
            <div style={{ 
              position: "absolute", top: -80, right: -80, width: 300, height: 300, 
              background: "rgba(255, 78, 42, 0.1)", filter: "blur(70px)", borderRadius: "50%", pointerEvents: "none" 
            }} />
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 42, fontWeight: 950, color: "white", letterSpacing: "-2px" }}>Financial Hub</h1>
              <p style={{ margin: "4px 0 0", fontSize: 16, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                Real-time transaction tracing and revenue flow analytics.
              </p>
            </div>
            <select 
              value={timeframe} 
              onChange={e => setTimeframe(e.target.value)}
              style={{
                padding: "12px 20px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)", color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer",
                backdropFilter: "blur(12px)"
              }}
            >
              {TIMEFRAME_OPTIONS.map(opt => <option key={opt.value} value={opt.value} style={{ background: "#111827" }}>{opt.label}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 40, marginTop: 44, position: "relative", zIndex: 1 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#ff4e2a", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8 }}>Net Earnings</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 64, fontWeight: 950, color: "white", letterSpacing: "-3px" }}>{money(metrics.gross)}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#10b981" }}>↗ Live</span>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", padding: "24px 32px", borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px" }}>Peak Performance Hour</div>
              <div style={{ fontSize: 32, fontWeight: 950, marginTop: 8, color: "white" }}>
                {metrics.peakHour}:00 <span style={{ fontSize: 16, color: "#a78bfa" }}>{metrics.peakHour >= 12 ? 'PM' : 'AM'}</span>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4, fontWeight: 500 }}>High-volume traffic window detected</div>
            </div>
          </div>
        </div>

        {/* 4-Grid Modern Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
           <MetricCard title="AOV" value={money(metrics.avg)} sub="Avg. Order Value" icon="🧾" color="#3b82f6" dark={dark} />
           <MetricCard title="Operational" value={money(metrics.pending)} sub="Active in queue" icon="⏳" color="#f59e0b" dark={dark} />
           <MetricCard title="Loss" value={money(metrics.lost)} sub="Cancelled orders" icon="🛑" color="#ef4444" dark={dark} />
           <MetricCard title="Volume" value={metrics.count} sub="Successful orders" icon="📈" color="#10b981" dark={dark} />
        </div>

        {/* Analytics Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
           
           {/* Payment Distribution */}
           <div style={{ padding: 32, background: surface, borderRadius: 28, border: "1px solid var(--border)" }}>
              <h3 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 900 }}>Payment Distribution</h3>
              <div style={{ display: "grid", gap: 24 }}>
                <ProgressBar label="Online (Stripe)" amount={metrics.payments.card} total={metrics.gross} color="#3b82f6" />
                <ProgressBar label="Cash on Delivery" amount={metrics.payments.cash} total={metrics.gross} color="#f59e0b" />
                <ProgressBar label="Split Payments" amount={metrics.payments.split} total={metrics.gross} color="#8b5cf6" />
              </div>
           </div>

           {/* Top Growth Items */}
           <div style={{ padding: 32, background: surface, borderRadius: 28, border: "1px solid var(--border)" }}>
              <h3 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 900 }}>Category Performance</h3>
              <div style={{ display: "grid", gap: 16 }}>
                {metrics.topItems.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: dark ? "rgba(255,255,255,0.05)" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#10b981", fontSize: 13 }}>
                      0{i+1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: 14 }}>{item.name}</span>
                        <span style={{ fontWeight: 950, fontSize: 14 }}>{money(item.r)}</span>
                      </div>
                      <div style={{ height: 8, background: dark ? "rgba(255,255,255,0.05)" : "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${(item.r / (metrics.gross || 1)) * 100}%`, height: "100%", background: "#10b981", borderRadius: 4 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>

        </div>

        {/* Transactions Table */}
        <div style={{ padding: 32, background: surface, borderRadius: 28, border: "1px solid var(--border)" }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Financial Ledger</h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>Transaction history for the selected period.</p>
              </div>
              <button style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid var(--border)", background: "none", color: "var(--text)", fontWeight: 800, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>
                📥 Export Report
              </button>
           </div>
           <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
             <thead>
               <tr style={{ textAlign: "left" }}>
                 <th style={{ padding: "0 16px 16px", fontSize: 11, fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Identifier</th>
                 <th style={{ padding: "0 16px 16px", fontSize: 11, fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Source</th>
                 <th style={{ padding: "0 16px 16px", fontSize: 11, fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Method</th>
                 <th style={{ padding: "0 16px 16px", fontSize: 11, fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Verification</th>
                 <th style={{ padding: "0 16px 16px", fontSize: 11, fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px", textAlign: "right" }}>Value</th>
               </tr>
             </thead>
             <tbody>
               {metrics.filtered.slice(0, 15).map(order => {
                const isSuccess = order.status === "Delivered";
                return (
                  <tr key={order._id} style={{ background: dark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)" }}>
                    <td style={{ padding: "16px", fontSize: 14, fontWeight: 800, fontFamily: "monospace", borderRadius: "12px 0 0 12px" }}>
                      #{order._id.slice(-6).toUpperCase()}
                    </td>
                    <td style={{ padding: "16px", fontSize: 14, fontWeight: 700 }}>
                      {order.address?.firstName || "Customer"}
                      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, marginTop: 2 }}>{new Date(order.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' })}</div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>{order.paymentMethod?.toUpperCase() || "COD"}</span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span style={{ 
                        fontSize: 10, fontWeight: 900, padding: "5px 10px", borderRadius: 8, 
                        background: isSuccess ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", 
                        color: isSuccess ? "#10b981" : "#f59e0b" 
                      }}>
                        {order.status?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "16px", fontSize: 15, fontWeight: 950, textAlign: "right", borderRadius: "0 12px 12px 0" }}>
                      {money(order.amount)}
                    </td>
                  </tr>
                );
               })}
             </tbody>
           </table>
        </div>

      </div>
    </RestaurantLayout>
  );
}

function MetricCard({ title, value, sub, icon, color, dark }) {
  return (
    <div style={{ padding: 28, background: dark ? "rgba(255,255,255,0.02)" : "#fff", borderRadius: 24, border: "1px solid var(--border)", display: "flex", gap: 20 }}>
       <div style={{ width: 56, height: 56, borderRadius: 16, background: `${color}15`, color: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{icon}</div>
       <div>
          <div style={{ fontSize: 11, fontWeight: 900, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>{title}</div>
          <div style={{ fontSize: 24, fontWeight: 950, marginTop: 4, color: "var(--text)" }}>{value}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, fontWeight: 500 }}>{sub}</div>
       </div>
    </div>
  );
}

function ProgressBar({ label, amount, total, color }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div>
       <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>{label}</span>
          <span style={{ fontSize: 15, fontWeight: 950 }}>{pct.toFixed(1)}%</span>
       </div>
       <div style={{ height: 10, background: "rgba(0,0,0,0.03)", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 5 }} />
       </div>
       <div style={{ marginTop: 6, textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>{money(amount)}</div>
    </div>
  );
}