import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { toast } from "react-toastify";
import { useTheme } from "../ThemeContext";

const STATUS_OPTIONS = ["Order Placed", "Order Accepted", "Food Processing", "Out for delivery", "Delivered", "Cancelled"];

const STATUS_COLORS = {
  "Order Placed": { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  "Order Accepted": { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  "Food Processing": { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  "Out for Delivery": { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "Delivered": { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
  "Cancelled": { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" },
};

const DATE_PRESETS = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 days", value: "7days" },
  { label: "Last 30 days", value: "30days" },
];

function isInDateRange(dateStr, preset) {
  if (preset === "all") return true;
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === "today") return d >= today;
  if (preset === "yesterday") { const y = new Date(today); y.setDate(y.getDate() - 1); return d >= y && d < today; }
  if (preset === "7days") { const t = new Date(today); t.setDate(t.getDate() - 7); return d >= t; }
  if (preset === "30days") { const t = new Date(today); t.setDate(t.getDate() - 30); return d >= t; }
  return true;
}

export default function Orders() {
  const { dark } = useTheme();
  const [orders,    setOrders]    = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState({});

  // ── New: sound + auto-refresh state ──
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem("crave_sound") !== "off"; } catch { return true; }
  });
  const [lastRefresh, setLastRefresh] = useState(null);
  const knownIdsRef = useRef(null); // null = first load ever
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [payFilter, setPayFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(true);

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // Persist sound pref
  useEffect(() => {
    try { localStorage.setItem("crave_sound", soundEnabled ? "on" : "off"); } catch { }
  }, [soundEnabled]);

  // 3-tone ascending beep via Web Audio API — no file needed
  const playAlert = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current)
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const beep = (freq, start, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.02);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.05);
      };
      beep(880, 0, 0.12);
      beep(1100, 0.15, 0.12);
      beep(1320, 0.30, 0.18);
    } catch { }
  }, [soundEnabled]);

  const loadOrders = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const [orderRes, invRes] = await Promise.all([
        api.get("/api/order/restaurant/list"),
        api.get("/api/inventory")
      ]);
      
      if (orderRes.data?.success) {
        const incoming = orderRes.data.data || [];
        
        if (knownIdsRef.current === null) {
          knownIdsRef.current = new Set(incoming.map(o => o._id));
        } else {
          const brandNew = incoming.filter(o => !knownIdsRef.current.has(o._id));
          if (brandNew.length > 0) {
            knownIdsRef.current = new Set(incoming.map(o => o._id));
            playAlert();
            toast.success(
              brandNew.length === 1
                ? `🛎️ New order from ${brandNew[0].address?.firstName || "customer"}!`
                : `🛎️ ${brandNew.length} new orders arrived!`,
              { autoClose: 6000 }
            );
          } else {
            knownIdsRef.current = new Set(incoming.map(o => o._id));
          }
        }

        setOrders(incoming);
        setLastRefresh(new Date());
      }
      if (invRes.data?.success) {
        setInventory(invRes.data.data || []);
      }
    } catch (err) {
      if (!isBackground) toast.error("Failed to load orders");
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [playAlert]);

  const updateStatus = async (orderId, status) => {
    try {
      const res = await api.post("/api/order/restaurant/status", { orderId, status });
      if (res.data?.success) loadOrders();
      else alert(res.data?.message || "Failed to update status");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update status");
    }
  };

  // Initial load + auto-refresh every 8s
  useEffect(() => {
    loadOrders(false);
    intervalRef.current = setInterval(() => loadOrders(true), 8000);
    return () => clearInterval(intervalRef.current);
  }, [loadOrders]);

  // Derived filter options from real data
  const allCities = useMemo(() => {
    const cities = new Set();
    orders.forEach(o => { if (o.address?.city) cities.add(o.address.city); });
    return Array.from(cities).sort();
  }, [orders]);

  const [cityFilter, setCityFilter] = useState("all");

  // Apply filters
  const filtered = useMemo(() => {
    let result = [...orders];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        `${o.address?.firstName} ${o.address?.lastName}`.toLowerCase().includes(q) ||
        o._id.toLowerCase().includes(q) ||
        (o.address?.phone || "").includes(q) ||
        (o.address?.city || "").toLowerCase().includes(q) ||
        o.items?.some(it => it.name.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") result = result.filter(o => o.status === statusFilter);
    if (payFilter !== "all") result = result.filter(o => payFilter === "paid" ? o.payment : !o.payment);
    if (cityFilter !== "all") result = result.filter(o => o.address?.city === cityFilter);
    if (datePreset !== "all") result = result.filter(o => isInDateRange(o.createdAt, datePreset));

    result.sort((a, b) => {
      const aDelivered = a.status === "Delivered";
      const bDelivered = b.status === "Delivered";
      if (aDelivered !== bDelivered) return aDelivered ? 1 : -1;

      if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "highest") return (b.amount || 0) - (a.amount || 0);
      if (sortBy === "lowest") return (a.amount || 0) - (b.amount || 0);
      return 0;
    });

    return result;
  }, [orders, search, statusFilter, payFilter, cityFilter, datePreset, sortBy]);

  const activeFilterCount = [
    search.trim(), statusFilter !== "all", payFilter !== "all",
    cityFilter !== "all", datePreset !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch(""); setStatusFilter("all"); setPayFilter("all");
    setCityFilter("all"); setDatePreset("all"); setSortBy("newest");
  };

  // White in light mode, sidebar color in dark mode
  const surface = dark ? "var(--sidebar-bg)" : "#fff";
  const surfaceText = dark ? "var(--sidebar-text)" : "#1a1d23";
  const softSurface = dark ? "#111827" : "#fafafa";

  return (
    <RestaurantLayout>
      <style>{`
        @keyframes orderPulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .pulse-order {
          animation: orderPulse 2s infinite ease-in-out;
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: "-0.5px" }}>Orders</h2>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--muted)" }}>
            {filtered.length} of {orders.length} orders
            {lastRefresh && (
              <span style={{ marginLeft: 8, color: "#9ca3af" }}>
                · updated {lastRefresh.toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>

          {/* Sound toggle — only addition to the header UI */}
          <button
            onClick={() => setSoundEnabled(p => !p)}
            title={soundEnabled ? "Mute new order alerts" : "Unmute new order alerts"}
            style={{
              width: 38, height: 38, borderRadius: 10,
              border: "1px solid var(--border)",
              background: soundEnabled ? "#f0fdf4" : "white",
              color: soundEnabled ? "#16a34a" : "#9ca3af",
              cursor: "pointer", fontSize: 17,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {soundEnabled ? "🔔" : "🔕"}
          </button>

          <button
            onClick={() => setShowFilters(p => !p)}
            style={{
              padding: "9px 16px", borderRadius: 12, cursor: "pointer", fontWeight: 800, fontSize: 13,
              border: "1px solid var(--border)",
              background: showFilters ? (dark ? "#1f2937" : "#111827") : surface,
              color: showFilters ? "white" : "var(--text)",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span style={{ background: "#ff4e2a", color: "white", borderRadius: 999, padding: "1px 7px", fontSize: 11, fontWeight: 900 }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          <button onClick={() => loadOrders(false)} style={{ padding: "9px 16px", borderRadius: 12, border: "1px solid var(--border)", background: surface, color: "var(--text)", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ── Filter Panel ── */}
      {showFilters && (
        <div style={{
          background: surface, color: surfaceText, borderRadius: 16, border: "1px solid var(--border)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)", padding: "20px 22px", marginBottom: 20,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 14, alignItems: "end" }}>

            {/* Search */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Search</div>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Name, order ID, phone, item..."
                  style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Date Range</div>
              <select value={datePreset} onChange={e => setDatePreset(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13, outline: "none", fontFamily: "inherit", background: surface, color: "var(--text)", cursor: "pointer" }}>
                {DATE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {/* Status */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13, outline: "none", fontFamily: "inherit", background: surface, color: "var(--text)", cursor: "pointer" }}>
                <option value="all">All Statuses</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* City */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>City</div>
              <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13, outline: "none", fontFamily: "inherit", background: surface, color: "var(--text)", cursor: "pointer" }}>
                <option value="all">All Cities</option>
                {allCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Payment */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Payment</div>
              <select value={payFilter} onChange={e => setPayFilter(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13, outline: "none", fontFamily: "inherit", background: surface, color: "var(--text)", cursor: "pointer" }}>
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>

          {/* Sort + Clear row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Sort by:</span>
              {[
                { label: "Newest first", value: "newest" },
                { label: "Oldest first", value: "oldest" },
                { label: "Highest amount", value: "highest" },
                { label: "Lowest amount", value: "lowest" },
              ].map(opt => (
                <button key={opt.value} onClick={() => setSortBy(opt.value)} style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${sortBy === opt.value ? (dark ? "#334155" : "#111827") : "var(--border)"}`,
                  background: sortBy === opt.value ? (dark ? "#1f2937" : "#111827") : surface,
                  color: sortBy === opt.value ? "white" : "var(--muted)",
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
                ✕ Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Orders list ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 72, background: surface, borderRadius: 16, border: "1px solid var(--border)" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p style={{ fontWeight: 700, fontSize: 16 }}>{orders.length === 0 ? "No orders yet." : "No orders match your filters."}</p>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} style={{ marginTop: 12, padding: "8px 18px", borderRadius: 10, background: "#111827", color: "white", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="list">
          {filtered.map((order) => {
            const isOpen = expanded[order._id];
            const addr = order.address || {};
            const statusStyle = STATUS_COLORS[order.status] || STATUS_COLORS["Food Processing"];
            const subtotal = (order.amount || 0) - (order.deliveryFee || 0);
            const isShared = !!order.isSharedDelivery;
            // Removed purple border/glow for shared orders

            return (
              <div key={order._id} style={{
                background: dark ? surface : "#fff",
                color: dark ? surfaceText : "#1a1d23",
                border: `1px solid var(--border)`,
                borderRadius: 18,
                boxShadow: "0 8px 18px rgba(17,24,39,0.06)",
                overflow: "hidden",
                position: "relative"
              }}>

                {/* Header */}
                <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
                  onClick={() => toggleExpand(order._id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 900, fontSize: 15 }}>Order #{order._id.slice(-6).toUpperCase()}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}` }}>
                        {order.status}
                      </span>
                      {(() => {
                        const method = order.paymentMethod || (order.payment ? "stripe" : "cod");
                        const map = {
                          cod: { label: "💵 COD", bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
                          stripe: { label: "💳 Paid Online", bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
                          split: { label: "🧮 Split", bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" },
                        };
                        const m = map[method] || map.cod;
                        return (
                          <>
                            <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
                              {m.label}
                            </span>
                            {method === "split" && order.splitCashDue > 0 && (
                              <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
                                💵 Collect AED {order.splitCashDue.toFixed(2)}
                              </span>
                            )}
                          </>
                        );
                      })()}
                      {isShared && (
                        <>
                          <span style={{ fontSize: 11, fontWeight: 900, padding: "3px 9px", borderRadius: 999, background: dark ? "rgba(124,58,237,0.16)" : "#f5f3ff", color: dark ? "#a78bfa" : "#7c3aed", border: dark ? "1px solid rgba(139,92,246,0.45)" : "1px solid #ddd6fe" }}>
                            🤝 Shared Route
                          </span>
                          {Number(order.sharedSavings || 0) > 0 && (
                            <span style={{ fontSize: 11, fontWeight: 900, padding: "3px 9px", borderRadius: 999, background: dark ? "rgba(22,163,74,0.16)" : "#f0fdf4", color: "#16a34a", border: "1px solid rgba(34,197,94,0.35)" }}>
                              Saved AED {Number(order.sharedSavings).toFixed(2)}
                            </span>
                          )}
                        </>
                      )}
                      {!order.payment && order.paymentMethod !== "cod" && (
                        <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                          ❌ Unpaid
                        </span>
                      )}
                      {order.createdAt && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                            🕐 {new Date(order.createdAt).toLocaleString("en-AE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {new Date(order.createdAt) > new Date(Date.now() - 10 * 60 * 1000) && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff6b00", boxShadow: "0 0 10px #ff6b00" }} className="pulse-order" />
                              <span style={{ fontSize: 10, fontWeight: 900, color: "#ff6b00", textTransform: "uppercase" }}>New</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                      👤 {addr.firstName} {addr.lastName}{addr.area ? ` — ${addr.area}` : addr.city ? ` — ${addr.city}` : ""}
                      {addr.phone ? <span style={{ marginLeft: 10 }}>📞 {addr.phone}</span> : null}
                    </div>
                    {isShared && (
                      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: dark ? "#a78bfa" : "#7c3aed",
                          background: dark ? "rgba(124,58,237,0.16)" : "#f5f3ff",
                          border: dark ? "1px solid rgba(139,92,246,0.45)" : "1px solid #ddd6fe",
                          borderRadius: 999,
                          padding: "2px 9px"
                        }}>
                          2-stop shared route
                        </span>
                        {order.sharedMatchedOrderId && (
                          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
                            Matched #{String(order.sharedMatchedOrderId).slice(-6).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ marginTop: 5, fontSize: 13, color: "var(--text-secondary)" }}>
                      {order.items?.map((it) => {
                        const selEntries = it.selections
                          ? Object.entries(it.selections).filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : true))
                          : [];
                        const selText = selEntries.length > 0
                          ? " (" + selEntries.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(", ") + ")"
                          : "";
                        return `${it.name} x${it.quantity}${selText}`;
                      }).join("  ·  ")}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    <span style={{ fontWeight: 900, fontSize: 17 }}>AED {order.amount}</span>
                    <span style={{ fontSize: 18, color: "var(--muted)", display: "inline-block", transition: "transform .2s", transform: isOpen ? "rotate(180deg)" : "none" }}>▾</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "18px 18px 20px", background: softSurface }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.6px", color: "var(--muted)", marginBottom: 10, textTransform: "uppercase" }}>Items Ordered</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {order.items?.map((it, i) => (
                            <div key={i} style={{ padding: "12px 14px", background: surface, borderRadius: 12, border: "1px solid var(--border)" }}>
                              {/* Unified Operations: Stock Check */}
                              {(() => {
                                const linkedIngs = inventory.filter(ing => 
                                  ing.linkedMenuItems?.some(m => String(m.foodId) === String(it._id))
                                );
                                const isOut = linkedIngs.some(ing => ing.currentStock <= 0);
                                if (isOut && order.status !== "Delivered" && order.status !== "Cancelled") {
                                  return (
                                    <div style={{ marginBottom: 10, padding: "8px 12px", background: "#fef2f2", color: "#ef4444", borderRadius: 8, fontSize: 11, fontWeight: 800, border: "1px solid #fecaca", display: "flex", alignItems: "center", gap: 6 }}>
                                      <span>⚠️</span> STOCK ALERT: Linked ingredients for this item are out of stock!
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                  <div style={{ fontWeight: 900, fontSize: 14 }}>{it.name}</div>
                                  {it.category && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{it.category}</div>}
                                </div>
                                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                                  <div style={{ fontWeight: 900, fontSize: 13 }}>x{it.quantity}</div>
                                  {it.price != null && <div style={{ fontSize: 12, color: "var(--muted)" }}>AED {((it.price + (it.extraPrice || 0)) * it.quantity).toFixed(2)}</div>}
                                </div>
                              </div>
                              {it.selections && Object.entries(it.selections).filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : true)).length > 0 && (
                                <div style={{ marginTop: 10, padding: "12px 14px", background: "#fff7ed", borderRadius: 10, border: "1.5px dashed #fb923c" }}>
                                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.8px", color: "#c2410c", marginBottom: 8, textTransform: "uppercase" }}>🍳 Customizations</div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {Object.entries(it.selections).map(([k, v]) => {
                                      const val = Array.isArray(v) ? v.join(", ") : v;
                                      if (!val) return null;
                                      return (
                                        <div key={k} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                          <span style={{ fontSize: 12, fontWeight: 800, color: "#92400e", minWidth: 0, flexShrink: 0, background: "#fed7aa", padding: "2px 8px", borderRadius: 6 }}>{k}</span>
                                          <span style={{ fontSize: 13, fontWeight: 900, color: "#c2410c", padding: "2px 10px", borderRadius: 6, background: surface, border: "1px solid #fed7aa", flex: 1 }}>{val}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 12, padding: "10px 12px", background: surface, borderRadius: 12, border: "1px solid var(--border)" }}>
                          {order.deliveryFee > 0 && <>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}><span>Subtotal</span><span>AED {(subtotal + (order.discount || 0)).toFixed(2)}</span></div>
                            {order.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#16a34a", fontWeight: 700, marginBottom: 6 }}><span>Discount {order.promoCode ? `(${order.promoCode})` : ""}</span><span>- AED {order.discount.toFixed(2)}</span></div>}
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}><span>Delivery Fee</span><span>AED {order.deliveryFee.toFixed(2)}</span></div>
                          </>}
                          {isShared && (
                            <>
                              {Number(order.sharedSavings || 0) > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#16a34a", fontWeight: 800, marginBottom: 6 }}>
                                  <span>Shared savings</span><span>- AED {Number(order.sharedSavings).toFixed(2)}</span>
                                </div>
                              )}
                              {order.sharedMatchedOrderId && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                                  <span>Matched order</span><span style={{ fontFamily: "monospace", fontWeight: 700 }}>#{String(order.sharedMatchedOrderId).slice(-6).toUpperCase()}</span>
                                </div>
                              )}
                            </>
                          )}
                          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 15, borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}><span>Total</span><span>AED {order.amount}</span></div>
                          {order.paymentMethod === "split" && (
                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.5px", color: "#5b21b6", textTransform: "uppercase", marginBottom: 6 }}>🧮 Split Payment Breakdown</div>
                              {order.splitCardTotal > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#065f46", fontWeight: 700, marginBottom: 4 }}>
                                  <span>💳 Card{order.splitCardCount > 1 ? `s (×${order.splitCardCount})` : ""} pre-paid</span>
                                  <span>AED {order.splitCardTotal.toFixed(2)}</span>
                                </div>
                              )}
                              {order.splitCashDue > 0 ? (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#92400e", fontWeight: 800, marginBottom: 4 }}>
                                  <span>💵 Cash to collect</span>
                                  <span>AED {order.splitCashDue.toFixed(2)}</span>
                                </div>
                              ) : order.splitCardTotal > 0 && (
                                <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 700 }}>✓ Fully paid by card — no cash needed</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.6px", color: "var(--muted)", marginBottom: 10, textTransform: "uppercase" }}>Delivery Address</div>
                        <div style={{ padding: "14px 16px", background: surface, borderRadius: 12, border: "1px solid var(--border)", fontSize: 14, lineHeight: 1.9 }}>
                          <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 6 }}>{addr.firstName} {addr.lastName}</div>
                          {addr.building && <div style={{ color: "var(--text-secondary)" }}>🏢 {addr.building}</div>}
                          {addr.apartment && <div style={{ color: "var(--text-secondary)" }}>🚪 {addr.apartment}</div>}
                          {addr.street && <div style={{ color: "var(--text-secondary)" }}>📍 {addr.street}</div>}
                          {addr.area && <div style={{ color: "var(--text-secondary)" }}>🗺️ {addr.area}</div>}
                          {(addr.city || addr.state) && <div style={{ color: "var(--text-secondary)" }}>🏙️ {[addr.city, addr.state].filter(Boolean).join(", ")}</div>}
                          {(addr.zipcode || addr.country) && <div style={{ color: "var(--text-secondary)" }}>{[addr.zipcode, addr.country].filter(Boolean).join(", ")}</div>}
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 3 }}>
                            {addr.phone && <div style={{ color: "var(--muted)", fontSize: 13 }}>📞 {addr.phone}</div>}
                            {addr.email && <div style={{ color: "var(--muted)", fontSize: 13 }}>✉️ {addr.email}</div>}
                          </div>
                          {addr.deliveryNotes && (
                            <div style={{ marginTop: 10, padding: "8px 12px", background: dark ? "rgba(245,158,11,0.14)" : "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 13 }}>
                              <span style={{ fontWeight: 800, color: "#92400e" }}>📝 Note: </span>
                              <span style={{ color: "#78350f" }}>{addr.deliveryNotes}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ marginTop: 10, padding: "10px 12px", background: surface, borderRadius: 12, border: "1px solid var(--border)", fontSize: 13 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ color: "var(--muted)" }}>Order ID</span><span style={{ fontWeight: 800, fontFamily: "monospace" }}>#{order._id.slice(-6).toUpperCase()}</span></div>
                          {order.createdAt && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--muted)" }}>Placed</span>
                              <span style={{ fontWeight: 700 }}>{new Date(order.createdAt).toLocaleString("en-AE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.6px", color: "var(--muted)", marginBottom: 8, textTransform: "uppercase" }}>Update Status</div>
                          {order.status === "Cancelled" ? (
                            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, padding: "8px 0" }}>🚫 This order was cancelled by the customer.</div>
                          ) : (
                          <div style={{ display: "grid", gridTemplateColumns: order.status === "Order Placed" ? "1fr" : "repeat(2, 1fr)", gap: 10 }}>
                            {/* If order is brand new, only show the "Accept" action */}
                            {order.status === "Order Placed" ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); updateStatus(order._id, "Order Accepted"); }} 
                                style={{
                                  padding: "16px 20px", borderRadius: 12, fontSize: 14, fontWeight: 900, cursor: "pointer",
                                  border: "2.5px solid #059669",
                                  background: "#ecfdf5",
                                  color: "#059669",
                                  boxShadow: "0 4px 12px rgba(5,150,105,0.15)",
                                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                                }}
                              >
                                ✅ Accept Order
                              </button>
                            ) : (
                              /* Once accepted, show the full production/delivery workflow */
                              ["Order Accepted", "Food Processing", "Out for Delivery", "Delivered"].map((s) => {
                                const st = STATUS_COLORS[s];
                                const active = order.status === s;

                                return (
                                  <button key={s} onClick={(e) => { e.stopPropagation(); updateStatus(order._id, s); }} style={{
                                    padding: "14px 18px", borderRadius: 12, fontSize: 13, fontWeight: 900, cursor: "pointer",
                                    border: `2.5px solid ${active ? st.color : "var(--border)"}`,
                                    background: active ? st.bg : surface,
                                    color: active ? st.color : "var(--muted)",
                                    boxShadow: active ? `0 4px 12px ${st.color}22` : "none",
                                    transition: "all 0.2s"
                                  }}>
                                    {active ? "✓ " : ""}{s}
                                  </button>
                                );
                              })
                            )}
                          </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </RestaurantLayout>
  );
}