import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { toast } from "react-toastify";
import { useTheme } from "../ThemeContext";
import "./Orders.css";

const STATUS_OPTIONS = ["Order Placed", "Order Accepted", "Food Processing", "Out for delivery", "Delivered", "Cancelled"];

const STATUS_BADGE_CLASS = {
  "Order Placed": "ao-badge ao-badge-placed",
  "Order Accepted": "ao-badge ao-badge-accepted",
  "Food Processing": "ao-badge ao-badge-processing",
  "Out for Delivery": "ao-badge ao-badge-delivery",
  "Out for delivery": "ao-badge ao-badge-delivery",
  "Delivered": "ao-badge ao-badge-delivered",
  "Cancelled": "ao-badge ao-badge-cancelled",
};

const STATUS_ACCENT_CLASS = {
  "Order Placed": "ao-card-accent accent-new",
  "Order Accepted": "ao-card-accent accent-processing",
  "Food Processing": "ao-card-accent accent-processing",
  "Out for Delivery": "ao-card-accent accent-processing",
  "Out for delivery": "ao-card-accent accent-processing",
  "Delivered": "ao-card-accent accent-delivered",
  "Cancelled": "ao-card-accent accent-cancelled",
};

const STATUS_COLORS = {
  "Order Placed": { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  "Order Accepted": { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  "Food Processing": { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "Out for Delivery": { bg: "#faf5ff", color: "#7c3aed", border: "#ddd6fe" },
  "Delivered": { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
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
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem("crave_sound") !== "off"; } catch { return true; }
  });
  const [lastRefresh, setLastRefresh] = useState(null);
  const knownIdsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [payFilter, setPayFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(true);
  const [cityFilter, setCityFilter] = useState("all");

  const orderRefs = useRef({});

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const isOpening = !prev[id];
      if (isOpening) {
        // Delay slightly for render then scroll
        setTimeout(() => {
          const el = orderRefs.current[id];
          if (el) {
            const topOffset = 100; // Account for sticky header
            const elementPosition = el.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - topOffset;
            window.scrollTo({
              top: offsetPosition,
              behavior: "smooth"
            });
          }
        }, 100);
      }
      return { ...prev, [id]: isOpening };
    });
  };

  useEffect(() => {
    try { localStorage.setItem("crave_sound", soundEnabled ? "on" : "off"); } catch { }
  }, [soundEnabled]);

  const playAlert = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current)
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const beep = (freq, start, dur) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.02);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.05);
      };
      beep(880, 0, 0.12); beep(1100, 0.15, 0.12); beep(1320, 0.30, 0.18);
    } catch { }
  }, [soundEnabled]);

  const loadOrders = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const [orderRes, invRes] = await Promise.all([
        api.get("/api/order/restaurant/list"),
        api.get("/api/inventory"),
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
      if (invRes.data?.success) setInventory(invRes.data.data || []);
    } catch {
      if (!isBackground) toast.error("Failed to load orders");
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [playAlert]);

  const updateStatus = async (orderId, status) => {
    try {
      const res = await api.post("/api/order/restaurant/status", { orderId, status });
      if (res.data?.success) loadOrders();
      else toast.error(res.data?.message || "Failed to update status");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    }
  };

  useEffect(() => {
    loadOrders(false);
    intervalRef.current = setInterval(() => loadOrders(true), 8000);
    return () => clearInterval(intervalRef.current);
  }, [loadOrders]);

  const allCities = useMemo(() => {
    const cities = new Set();
    orders.forEach(o => { if (o.address?.city) cities.add(o.address.city); });
    return Array.from(cities).sort();
  }, [orders]);

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
      const aD = a.status === "Delivered", bD = b.status === "Delivered";
      if (aD !== bD) return aD ? 1 : -1;
      if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "highest") return (b.amount || 0) - (a.amount || 0);
      if (sortBy === "lowest") return (a.amount || 0) - (b.amount || 0);
      return 0;
    });
    return result;
  }, [orders, search, statusFilter, payFilter, cityFilter, datePreset, sortBy]);

  const activeFilterCount = [search.trim(), statusFilter !== "all", payFilter !== "all", cityFilter !== "all", datePreset !== "all"].filter(Boolean).length;

  const clearFilters = () => {
    setSearch(""); setStatusFilter("all"); setPayFilter("all");
    setCityFilter("all"); setDatePreset("all"); setSortBy("newest");
  };

  // ── Helpers ──
  const getPayBadge = (order) => {
    const method = order.paymentMethod || (order.payment ? "stripe" : "cod");
    if (method === "split") return { cls: "ao-badge ao-badge-split", label: "Split" };
    if (method === "cod") return { cls: "ao-badge ao-badge-cod", label: "COD" };
    return { cls: "ao-badge ao-badge-paid", label: "Paid Online" };
  };

  return (
    <RestaurantLayout>
      {/* ── Page Header ── */}
      <div className="ao-header">
        <div className="ao-header-info">
          <p className="ao-header-meta">
            {filtered.length} of {orders.length} orders
            {lastRefresh && (
              <span className="ao-refresh-time">
                · updated {lastRefresh.toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div className="ao-header-actions">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(p => !p)}
            title={soundEnabled ? "Mute alerts" : "Unmute alerts"}
            className={`ao-btn ao-btn-icon ${soundEnabled ? "ao-sound-btn-on" : ""}`}
          >
            {soundEnabled
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" /></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
            }
          </button>

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(p => !p)}
            className={`ao-btn ${showFilters ? "ao-btn-active" : ""}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Filters
            {activeFilterCount > 0 && <span className="ao-filter-badge">{activeFilterCount}</span>}
          </button>

          {/* Refresh */}
          <button onClick={() => loadOrders(false)} className="ao-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      {showFilters && (
        <div className="ao-filters">
          <div className="ao-filters-grid">
            {/* Search */}
            <div>
              <div className="ao-field-label">Search</div>
              <div className="ao-search-wrap">
                <svg className="ao-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Name, order ID, phone, item…"
                  className="ao-filter-input"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <div className="ao-field-label">Date Range</div>
              <select value={datePreset} onChange={e => setDatePreset(e.target.value)} className="ao-filter-select">
                {DATE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {/* Status */}
            <div>
              <div className="ao-field-label">Status</div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="ao-filter-select">
                <option value="all">All Statuses</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* City */}
            <div>
              <div className="ao-field-label">City</div>
              <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="ao-filter-select">
                <option value="all">All Cities</option>
                {allCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Payment */}
            <div>
              <div className="ao-field-label">Payment</div>
              <select value={payFilter} onChange={e => setPayFilter(e.target.value)} className="ao-filter-select">
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>

          {/* Sort + Clear */}
          <div className="ao-filter-footer">
            <div className="ao-sort-row">
              <span className="ao-sort-label">Sort:</span>
              {[
                { label: "Newest", value: "newest" },
                { label: "Oldest", value: "oldest" },
                { label: "Highest", value: "highest" },
                { label: "Lowest", value: "lowest" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`ao-sort-pill ${sortBy === opt.value ? "ao-sort-pill-active" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="ao-clear-btn">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="ao-skeletons">
          {[1, 2, 3].map(i => <div key={i} className="ao-skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ao-empty">
          <div className="ao-empty-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <p className="ao-empty-title">{orders.length === 0 ? "No orders yet" : "No orders match your filters"}</p>
          <p className="ao-empty-sub">{orders.length === 0 ? "New orders will appear here automatically." : "Try adjusting your search or filters."}</p>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="ao-btn" style={{ marginTop: 16 }}>Clear filters</button>
          )}
        </div>
      ) : (
        <div className="list">
          {filtered.map((order) => {
            const isOpen = expanded[order._id];
            const addr = order.address || {};
            const isShared = !!order.isSharedDelivery;
            const isNew = new Date(order.createdAt) > new Date(Date.now() - 10 * 60 * 1000);
            const subtotal = (order.amount || 0) - (order.deliveryFee || 0);
            const payBadge = getPayBadge(order);
            const accentCls = STATUS_ACCENT_CLASS[order.status] || "ao-card-accent";
            const statusCls = STATUS_BADGE_CLASS[order.status] || "ao-badge ao-badge-processing";
            const statusStyle = STATUS_COLORS[order.status] || STATUS_COLORS["Food Processing"];

            return (
              <div
                key={order._id}
                ref={el => (orderRefs.current[order._id] = el)}
                className={`ao-card ${isNew ? "ao-card-new" : ""} ${expanded[order._id] ? "ao-card-expanded" : ""}`}
              >
                {/* Clickable header row */}
                <div className="ao-card-row" onClick={() => toggleExpand(order._id)}>
                  <div className="ao-order-info">
                    {/* Badges row */}
                    <div className="ao-order-badges">
                      <span className="ao-order-id">#{order._id.slice(-6).toUpperCase()}</span>
                      <span className={statusCls}>{order.status}</span>
                      <span className={payBadge.cls}>{payBadge.label}</span>
                      {order.paymentMethod === "split" && order.splitCashDue > 0 && (
                        <span className="ao-badge ao-badge-collect">Collect AED {order.splitCashDue.toFixed(2)}</span>
                      )}
                      {isShared && <span className="ao-badge ao-badge-shared">Shared Route</span>}
                      {isShared && Number(order.sharedSavings || 0) > 0 && (
                        <span className="ao-badge ao-badge-savings">Saved AED {Number(order.sharedSavings).toFixed(2)}</span>
                      )}
                      {!order.payment && order.paymentMethod !== "cod" && (
                        <span className="ao-badge ao-badge-unpaid">Unpaid</span>
                      )}
                      {order.createdAt && (
                        <span className="ao-badge" style={{ background: "transparent", color: "var(--text-secondary)", border: "none", padding: "0 4px", gap: 4 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                          {new Date(order.createdAt).toLocaleString("en-AE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      {isNew && (
                        <div className="ao-new-dot">
                          <span /><span style={{ fontSize: 10, fontWeight: 900 }}>NEW</span>
                        </div>
                      )}
                    </div>

                    {/* Customer */}
                    <div className="ao-customer-row">
                      <span className="ao-customer-name">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.5 }}>
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                        {addr.firstName} {addr.lastName}
                        {(addr.area || addr.city) && ` — ${addr.area || addr.city}`}
                      </span>
                      {addr.phone && (
                        <span className="ao-customer-phone">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.5 }}>
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                          </svg>
                          {addr.phone}
                        </span>
                      )}
                    </div>

                    {/* Shared route tag */}
                    {isShared && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <span className="ao-shared-tag">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                          </svg>
                          2-stop shared route
                        </span>
                        {order.sharedMatchedOrderId && (
                          <span className="ao-matched-id">Matched #{String(order.sharedMatchedOrderId).slice(-6).toUpperCase()}</span>
                        )}
                      </div>
                    )}

                    {/* Items preview */}
                    <p className="ao-items-line">
                      {order.items?.map((it) => {
                        const selEntries = it.selections
                          ? Object.entries(it.selections).filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : true))
                          : [];
                        const selText = selEntries.length > 0
                          ? " (" + selEntries.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(", ") + ")"
                          : "";
                        return `${it.name} x${it.quantity}${selText}`;
                      }).join("  ·  ")}
                    </p>
                  </div>

                  {/* Amount + chevron */}
                  <div className="ao-card-right">
                    <span className="ao-order-amount">AED {order.amount}</span>
                    <svg className={`ao-chevron ${isOpen ? "open" : ""}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {/* ── Expanded detail ── */}
                {isOpen && (
                  <div className="ao-expanded">
                    {/* Left: items + pricing */}
                    <div>
                      <div className="ao-section-label">Items Ordered</div>
                      {order.items?.map((it, i) => {
                        const linkedIngs = inventory.filter(ing =>
                          ing.linkedMenuItems?.some(m => String(m.foodId) === String(it._id))
                        );
                        const isOut = linkedIngs.some(ing => ing.currentStock <= 0);
                        return (
                          <div key={i} className="ao-item-card">
                            {isOut && order.status !== "Delivered" && order.status !== "Cancelled" && (
                              <div className="ao-stock-warn">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                STOCK ALERT: Linked ingredients out of stock!
                              </div>
                            )}
                            <div className="ao-item-row">
                              <div>
                                <div className="ao-item-name">{it.name}</div>
                                {it.category && <div className="ao-item-cat">{it.category}</div>}
                              </div>
                              <div className="ao-item-qty">
                                ×{it.quantity}
                                {it.price != null && <div className="ao-item-price">AED {((it.price + (it.extraPrice || 0)) * it.quantity).toFixed(2)}</div>}
                              </div>
                            </div>

                            {it.selections && Object.entries(it.selections).filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : true)).length > 0 && (
                              <div className="ao-customizations">
                                <div className="ao-custom-header">Customizations</div>
                                {Object.entries(it.selections).map(([k, v]) => {
                                  const val = Array.isArray(v) ? v.join(", ") : v;
                                  if (!val) return null;
                                  return (
                                    <div key={k} className="ao-custom-row">
                                      <span className="ao-custom-key">{k}</span>
                                      <span className="ao-custom-val">{val}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Pricing */}
                      <div className="ao-pricing">
                        {order.deliveryFee > 0 && (
                          <>
                            <div className="ao-pricing-row"><span>Subtotal</span><span>AED {(subtotal + (order.discount || 0)).toFixed(2)}</span></div>
                            {order.discount > 0 && (
                              <div className="ao-pricing-row ao-pricing-row-discount">
                                <span>Discount {order.promoCode ? `(${order.promoCode})` : ""}</span>
                                <span>- AED {order.discount.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="ao-pricing-row"><span>Delivery Fee</span><span>AED {order.deliveryFee.toFixed(2)}</span></div>
                          </>
                        )}
                        {isShared && Number(order.sharedSavings || 0) > 0 && (
                          <div className="ao-pricing-row ao-pricing-row-discount">
                            <span>Shared savings</span><span>- AED {Number(order.sharedSavings).toFixed(2)}</span>
                          </div>
                        )}
                        {isShared && order.sharedMatchedOrderId && (
                          <div className="ao-pricing-row">
                            <span>Matched order</span>
                            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>#{String(order.sharedMatchedOrderId).slice(-6).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="ao-pricing-total"><span>Total</span><span>AED {order.amount}</span></div>

                        {order.paymentMethod === "split" && (
                          <div className="ao-split-section">
                            <div className="ao-split-label">Split Payment Breakdown</div>
                            {order.splitCardTotal > 0 && (
                              <div className="ao-split-row ao-split-paid">
                                <span>Card{order.splitCardCount > 1 ? `s (×${order.splitCardCount})` : ""} pre-paid</span>
                                <span>AED {order.splitCardTotal.toFixed(2)}</span>
                              </div>
                            )}
                            {order.splitCashDue > 0
                              ? <div className="ao-split-row ao-split-cash"><span>Cash to collect</span><span>AED {order.splitCashDue.toFixed(2)}</span></div>
                              : order.splitCardTotal > 0 && <div className="ao-split-full">✓ Fully paid by card — no cash needed</div>
                            }
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: address + status */}
                    <div>
                      <div className="ao-section-label">Delivery Address</div>
                      <div className="ao-address-card">
                        <div className="ao-address-name">{addr.firstName} {addr.lastName}</div>
                        {addr.building && <div className="ao-address-line"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>{addr.building}</div>}
                        {addr.apartment && <div className="ao-address-line"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>{addr.apartment}</div>}
                        {addr.street && <div className="ao-address-line"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>{addr.street}</div>}
                        {addr.area && <div className="ao-address-line"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>{addr.area}</div>}
                        {(addr.city || addr.state) && <div className="ao-address-line"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3z" /></svg>{[addr.city, addr.state].filter(Boolean).join(", ")}</div>}
                        <div className="ao-address-contacts">
                          {addr.phone && <span className="ao-address-line" style={{ fontSize: 13 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>{addr.phone}</span>}
                          {addr.email && <span className="ao-address-line" style={{ fontSize: 13 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>{addr.email}</span>}
                        </div>
                        {addr.deliveryNotes && (
                          <div className="ao-delivery-note">
                            <span className="ao-note-label">📝 Note: </span>
                            <span className="ao-note-text">{addr.deliveryNotes}</span>
                          </div>
                        )}
                      </div>

                      <div className="ao-meta-card">
                        <div className="ao-meta-row"><span>Order ID</span><span className="ao-meta-val ao-meta-mono">#{order._id.slice(-6).toUpperCase()}</span></div>
                        {order.createdAt && <div className="ao-meta-row"><span>Placed</span><span className="ao-meta-val">{new Date(order.createdAt).toLocaleString("en-AE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>}
                      </div>

                      {/* Status update */}
                      <div className="ao-status-section">
                        <div className="ao-section-label">Update Status</div>
                        {order.status === "Cancelled" ? (
                          <p className="ao-cancelled-note">🚫 This order was cancelled by the customer.</p>
                        ) : order.status === "Order Placed" ? (
                          <button
                            className="ao-accept-btn"
                            onClick={(e) => { e.stopPropagation(); updateStatus(order._id, "Order Accepted"); }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Accept Order
                          </button>
                        ) : (
                          <div className="ao-status-grid">
                            {["Order Accepted", "Food Processing", "Out for delivery", "Delivered"].map((s) => {
                              const st = STATUS_COLORS[s] || STATUS_COLORS["Food Processing"];
                              const active = order.status === s;
                              return (
                                <button
                                  key={s}
                                  onClick={(e) => { e.stopPropagation(); updateStatus(order._id, s); }}
                                  className={`ao-status-btn ${active ? "ao-status-btn-active" : ""}`}
                                  style={active ? {
                                    borderColor: st.color,
                                    background: st.bg,
                                    color: st.color,
                                    boxShadow: `0 4px 12px ${st.color}22`,
                                  } : {}}
                                >
                                  {active && "✓ "}{s}
                                </button>
                              );
                            })}
                          </div>
                        )}
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