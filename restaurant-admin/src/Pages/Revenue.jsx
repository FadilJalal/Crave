import { useEffect, useMemo, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";

const TIMEFRAME_OPTIONS = [
  { value: "7d", label: "Last 7 Days", days: 7 },
  { value: "30d", label: "Last 30 Days", days: 30 },
  { value: "90d", label: "Last 90 Days", days: 90 },
  { value: "365d", label: "Last 12 Months", days: 365 },
  { value: "all", label: "All Time", days: null },
];

const PAYMENT_STYLES = {
  stripe: { label: "Card", color: "#2563eb", bg: "#dbeafe" },
  cod: { label: "Cash", color: "#b45309", bg: "#fef3c7" },
  split: { label: "Split", color: "#7c3aed", bg: "#ede9fe" },
};

const money = (value) => `AED ${Number(value || 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortDate = (value) => new Date(value).toLocaleDateString("en-AE", { day: "numeric", month: "short" });

const monthLabel = (value) => new Date(value).toLocaleDateString("en-AE", { month: "short", year: "2-digit" });

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getRangeStart(timeframe) {
  const option = TIMEFRAME_OPTIONS.find((entry) => entry.value === timeframe);
  if (!option?.days) return null;
  const start = new Date();
  start.setDate(start.getDate() - (option.days - 1));
  return startOfDay(start);
}

function getGranularity(timeframe) {
  if (timeframe === "7d" || timeframe === "30d") return "day";
  if (timeframe === "90d") return "week";
  return "month";
}

function getWeekStart(date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function createBucketKey(date, granularity) {
  if (granularity === "day") return startOfDay(date).toISOString();
  if (granularity === "week") return getWeekStart(date).toISOString();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
}

function createBucketLabel(date, granularity) {
  if (granularity === "day") return shortDate(date);
  if (granularity === "week") {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return `${shortDate(weekStart)} - ${shortDate(weekEnd)}`;
  }
  return monthLabel(date);
}

function RevenueCard({ title, value, sub, accent, icon }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 18,
        border: "1px solid rgba(17,24,39,0.06)",
        boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
        padding: "22px 22px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: accent }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.7px", textTransform: "uppercase", color: "#9ca3af", marginBottom: 10 }}>{title}</div>
          <div style={{ fontSize: 31, fontWeight: 900, letterSpacing: "-1px", color: "#111827", lineHeight: 1 }}>{value}</div>
          {sub ? <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{sub}</div> : null}
        </div>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function InsightChip({ label, value, tone = "default" }) {
  const tones = {
    default: { bg: "rgba(255,255,255,0.14)", border: "rgba(255,255,255,0.22)", color: "#ffffff", label: "rgba(255,255,255,0.78)" },
    warm: { bg: "rgba(251,146,60,0.16)", border: "rgba(254,215,170,0.34)", color: "#fff7ed", label: "rgba(255,243,224,0.82)" },
    cool: { bg: "rgba(59,130,246,0.16)", border: "rgba(191,219,254,0.34)", color: "#eff6ff", label: "rgba(219,234,254,0.82)" },
    mint: { bg: "rgba(16,185,129,0.16)", border: "rgba(167,243,208,0.34)", color: "#ecfdf5", label: "rgba(209,250,229,0.84)" },
  };
  const active = tones[tone] || tones.default;

  return (
    <div style={{ padding: "14px 16px", borderRadius: 20, background: active.bg, border: `1px solid ${active.border}`, minWidth: 0, color: active.color, backdropFilter: "blur(14px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.8px", color: active.label, fontWeight: 900, marginBottom: 8, textShadow: "0 1px 10px rgba(0,0,0,0.22)" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: active.color, lineHeight: 1.35, textWrap: "balance", textShadow: "0 2px 16px rgba(0,0,0,0.24)" }}>{value}</div>
    </div>
  );
}

function MiniDonut({ value, total, color, label }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: `conic-gradient(${color} 0 ${percent}%, #eef2f7 ${percent}% 100%)`,
          display: "grid",
          placeItems: "center",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "white", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 900, color: "#111827" }}>
          {percent}%
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</div>
        <div style={{ fontSize: 17, fontWeight: 900, color: "#111827", marginTop: 3 }}>{money(value)}</div>
      </div>
    </div>
  );
}

function WeekdayHeat({ data }) {
  const max = Math.max(...data.map((entry) => entry.revenue), 1);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {data.map((entry) => {
        const intensity = entry.revenue / max;
        return (
          <div key={entry.day} style={{ display: "grid", gridTemplateColumns: "78px 1fr auto", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>{entry.day}</div>
            <div style={{ height: 12, borderRadius: 999, overflow: "hidden", background: "#eef2f7" }}>
              <div style={{ width: `${Math.max(Math.round(intensity * 100), entry.revenue > 0 ? 8 : 0)}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, #22c55e 0%, #14b8a6 45%, #2563eb 100%)` }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#111827" }}>{money(entry.revenue)}</div>
          </div>
        );
      })}
    </div>
  );
}

function SimpleBars({ data, formatValue }) {
  const max = Math.max(...data.map((entry) => entry.value), 1);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))`, gap: 8, alignItems: "end", minHeight: 250 }}>
      {data.map((entry) => {
        const height = Math.max(16, Math.round((entry.value / max) * 180));
        return (
          <div key={entry.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#111827", whiteSpace: "nowrap" }}>{formatValue(entry.value)}</div>
            <div
              title={`${entry.label}: ${formatValue(entry.value)}`}
              style={{
                width: "100%",
                maxWidth: 54,
                height,
                borderRadius: "14px 14px 6px 6px",
                background: "linear-gradient(180deg, #ff7b5f 0%, #ff4e2a 55%, #f97316 100%)",
                boxShadow: "0 12px 18px rgba(255,78,42,0.18)",
              }}
            />
            <div style={{ fontSize: 11, color: "#6b7280", textAlign: "center", lineHeight: 1.3 }}>{entry.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Revenue() {
  const [timeframe, setTimeframe] = useState("30d");
  const [orders, setOrders] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async (silent = false) => {
    try {
      setError("");
      if (silent) setRefreshing(true);
      else setLoading(true);

      const [orderRes, forecastRes] = await Promise.all([
        api.get("/api/order/restaurant/list"),
        api.get("/api/ai/restaurant/forecast").catch(() => ({ data: { success: false, data: { forecast: [] } } })),
      ]);

      if (!orderRes.data?.success) {
        throw new Error(orderRes.data?.message || "Failed to load revenue data");
      }

      setOrders(orderRes.data.data || []);
      setForecast(forecastRes.data?.success ? forecastRes.data.data?.forecast || [] : []);
    } catch (err) {
      setError(err?.message || "Failed to load revenue data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const metrics = useMemo(() => {
    const activeOrders = orders.filter((order) => (order.status || "").toLowerCase() !== "cancelled");
    const rangeStart = getRangeStart(timeframe);
    const inRangeOrders = rangeStart
      ? activeOrders.filter((order) => new Date(order.createdAt) >= rangeStart)
      : activeOrders;

    const previousOrders = rangeStart
      ? activeOrders.filter((order) => {
          const currentStart = rangeStart.getTime();
          const currentEnd = Date.now();
          const rangeMs = currentEnd - currentStart;
          const orderTime = new Date(order.createdAt).getTime();
          return orderTime >= currentStart - rangeMs && orderTime < currentStart;
        })
      : [];

    const deliveredOrders = inRangeOrders.filter((order) => order.status === "Delivered");
    const openOrders = inRangeOrders.filter((order) => order.status !== "Delivered");

    const totalRevenue = inRangeOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const deliveredRevenue = deliveredOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const pipelineRevenue = openOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const previousRevenue = previousOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const revenueChange = previousRevenue > 0 ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100) : null;
    const avgOrderValue = inRangeOrders.length ? totalRevenue / inRangeOrders.length : 0;
    const deliveredRate = inRangeOrders.length ? Math.round((deliveredOrders.length / inRangeOrders.length) * 100) : 0;

    const paymentTotals = inRangeOrders.reduce(
      (acc, order) => {
        const method = order.paymentMethod || (order.payment ? "stripe" : "cod");
        if (method === "stripe") {
          acc.card += order.amount || 0;
        } else if (method === "split") {
          const cardPart = Number(order.splitCardTotal || 0);
          const cashPart = Number(order.splitCashDue || 0);
          if (cardPart > 0 || cashPart > 0) {
            acc.card += cardPart;
            acc.cash += cashPart;
          } else {
            acc.cash += order.amount || 0;
          }
        } else {
          acc.cash += order.amount || 0;
        }
        acc.byMethod[method] = (acc.byMethod[method] || 0) + (order.amount || 0);
        return acc;
      },
      { card: 0, cash: 0, byMethod: { stripe: 0, cod: 0, split: 0 } }
    );

    const granularity = getGranularity(timeframe);
    const bucketMap = new Map();
    inRangeOrders.forEach((order) => {
      const date = new Date(order.createdAt);
      const key = createBucketKey(date, granularity);
      const existing = bucketMap.get(key) || { key, label: createBucketLabel(date, granularity), value: 0, orders: 0 };
      existing.value += order.amount || 0;
      existing.orders += 1;
      bucketMap.set(key, existing);
    });

    const trend = Array.from(bucketMap.values())
      .sort((a, b) => new Date(a.key) - new Date(b.key))
      .slice(-12);

    const topItems = Object.values(
      inRangeOrders.reduce((acc, order) => {
        (order.items || []).forEach((item) => {
          const itemKey = String(item._id || item.name);
          if (!acc[itemKey]) {
            acc[itemKey] = { name: item.name, quantity: 0, revenue: 0 };
          }
          acc[itemKey].quantity += item.quantity || 0;
          acc[itemKey].revenue += ((item.price || 0) + (item.extraPrice || 0)) * (item.quantity || 0);
        });
        return acc;
      }, {})
    )
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    const recentOrders = [...inRangeOrders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map((order) => ({
        id: order._id,
        customer: `${order.address?.firstName || "Customer"} ${order.address?.lastName || ""}`.trim(),
        amount: order.amount || 0,
        paymentMethod: order.paymentMethod || (order.payment ? "stripe" : "cod"),
        status: order.status || "Food Processing",
        createdAt: order.createdAt,
      }));

    const weekdaySeed = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({ day, revenue: 0, orders: 0 }));
    inRangeOrders.forEach((order) => {
      const rawDay = new Date(order.createdAt).getDay();
      const index = rawDay === 0 ? 6 : rawDay - 1;
      weekdaySeed[index].revenue += order.amount || 0;
      weekdaySeed[index].orders += 1;
    });

    const hourlySeed = Array.from({ length: 24 }, (_, hour) => ({ hour, revenue: 0, orders: 0 }));
    inRangeOrders.forEach((order) => {
      const hour = new Date(order.createdAt).getHours();
      hourlySeed[hour].revenue += order.amount || 0;
      hourlySeed[hour].orders += 1;
    });

    const bestHour = [...hourlySeed].sort((a, b) => b.revenue - a.revenue)[0] || { hour: 0, revenue: 0, orders: 0 };
    const bestBucket = [...trend].sort((a, b) => b.value - a.value)[0] || null;
    const splitOrders = inRangeOrders.filter((order) => order.paymentMethod === "split");
    const splitCashPending = splitOrders.reduce((sum, order) => sum + Number(order.splitCashDue || 0), 0);
    const splitCardCaptured = splitOrders.reduce((sum, order) => sum + Number(order.splitCardTotal || 0), 0);
    const activeDates = new Set(inRangeOrders.map((order) => startOfDay(new Date(order.createdAt)).toISOString())).size;

    let activeStreak = 0;
    let cursor = startOfDay(new Date());
    const activeDateSet = new Set(inRangeOrders.map((order) => startOfDay(new Date(order.createdAt)).toISOString()));
    while (activeDateSet.has(cursor.toISOString())) {
      activeStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const forecastAverage = forecast.length > 0 ? forecast.reduce((sum, day) => sum + (day.predictedRevenue || 0), 0) / forecast.length : 0;
    const targetRevenue = Math.max(totalRevenue * 1.12, previousRevenue * 1.08, forecastAverage * (timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 1), 1000);
    const targetProgress = targetRevenue > 0 ? Math.min(100, Math.round((totalRevenue / targetRevenue) * 100)) : 0;
    const vibeText =
      totalRevenue === 0
        ? "Quiet mode. You need more orders in this range before the page can flex."
        : revenueChange == null
          ? "Fresh data only. Keep stacking more orders so trends get sharper."
          : revenueChange >= 18
            ? "Main character numbers. Revenue is running hot right now."
            : revenueChange >= 0
              ? "Good momentum. You are ahead of the previous window."
              : "Revenue dipped. Push promos, re-engage regulars, and watch your peak hours.";

    return {
      totalRevenue,
      deliveredRevenue,
      pipelineRevenue,
      avgOrderValue,
      deliveredRate,
      totalOrders: inRangeOrders.length,
      previousRevenue,
      revenueChange,
      paymentTotals,
      trend,
      topItems,
      recentOrders,
      weekdayStats: weekdaySeed,
      bestHour,
      bestBucket,
      splitOrdersCount: splitOrders.length,
      splitCashPending,
      splitCardCaptured,
      activeDates,
      activeStreak,
      targetRevenue,
      targetProgress,
      vibeText,
    };
  }, [forecast, orders, timeframe]);

  const forecastTotal = useMemo(() => forecast.reduce((sum, day) => sum + (day.predictedRevenue || 0), 0), [forecast]);

  const pageWrap = { maxWidth: 1240, margin: "0 auto", paddingBottom: 32 };
  const panel = { background: "white", border: "1px solid rgba(17,24,39,0.06)", borderRadius: 20, boxShadow: "0 10px 28px rgba(15,23,42,0.05)", padding: 22 };

  if (loading) {
    return (
      <RestaurantLayout>
        <div style={pageWrap}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 16 }}>
            {[1, 2, 3, 4].map((key) => <div key={key} className="skeleton" style={{ height: 150, borderRadius: 20 }} />)}
          </div>
          <div className="skeleton" style={{ height: 420, borderRadius: 20 }} />
        </div>
      </RestaurantLayout>
    );
  }

  return (
    <RestaurantLayout>
      <div style={pageWrap}>
        <div style={{
          position: "relative",
          overflow: "hidden",
          marginBottom: 24,
          borderRadius: 28,
          padding: "28px 28px 24px",
          background: "radial-gradient(circle at top left, rgba(251,146,60,0.45), transparent 28%), radial-gradient(circle at top right, rgba(59,130,246,0.24), transparent 30%), linear-gradient(135deg, #111827 0%, #1f2937 45%, #312e81 100%)",
          boxShadow: "0 24px 60px rgba(15,23,42,0.18)",
        }}>
          <div style={{ position: "absolute", top: -24, right: -18, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.04)", filter: "blur(2px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -46, left: 40, width: 120, height: 120, borderRadius: "50%", background: "rgba(251,191,36,0.05)", pointerEvents: "none" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
            <div style={{ maxWidth: 760 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 999, background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.14)", fontSize: 12, fontWeight: 800, letterSpacing: "0.4px", marginBottom: 14 }}>
                <span>⚡</span>
                Revenue Control Center
              </div>
              <h1 style={{ margin: 0, fontSize: 38, fontWeight: 900, letterSpacing: "-1.4px", color: "white", lineHeight: 1.02 }}>Revenue that actually feels alive.</h1>
              <p style={{ margin: "12px 0 0", fontSize: 15, color: "rgba(255,255,255,0.76)", fontWeight: 500, maxWidth: 640, lineHeight: 1.6 }}>
                {metrics.vibeText}
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={timeframe}
                onChange={(event) => setTimeframe(event.target.value)}
                style={{ padding: "11px 14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", backdropFilter: "blur(10px)" }}
              >
                {TIMEFRAME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} style={{ color: "#111827" }}>{option.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => load(true)}
                style={{ padding: "11px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)", background: "white", color: "#111827", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 10px 24px rgba(0,0,0,0.12)" }}
              >
                {refreshing ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 22, position: "relative", zIndex: 1 }}>
            <InsightChip label="Gross" value={money(metrics.totalRevenue)} tone="warm" />
            <InsightChip label="Current streak" value={`${metrics.activeStreak} day${metrics.activeStreak === 1 ? "" : "s"}`} tone="cool" />
            <InsightChip label="Best window" value={metrics.bestBucket ? `${metrics.bestBucket.label} · ${money(metrics.bestBucket.value)}` : "No spike yet"} tone="mint" />
            <InsightChip label="Peak hour" value={`${metrics.bestHour.hour.toString().padStart(2, "0")}:00 · ${money(metrics.bestHour.revenue)}`} tone="default" />
          </div>
        </div>

        {error ? (
          <div style={{ ...panel, marginBottom: 20, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 6 }}>Failed to load revenue data</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{error}</div>
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 20 }}>
          <RevenueCard
            title="Gross Revenue"
            value={money(metrics.totalRevenue)}
            sub={metrics.revenueChange == null ? `${metrics.totalOrders} orders in range` : `${metrics.revenueChange >= 0 ? "+" : ""}${metrics.revenueChange}% vs previous period`}
            accent="#ff4e2a"
            icon="💰"
          />
          <RevenueCard
            title="Delivered Revenue"
            value={money(metrics.deliveredRevenue)}
            sub={`${metrics.deliveredRate}% of orders delivered`}
            accent="#16a34a"
            icon="✅"
          />
          <RevenueCard
            title="Average Order"
            value={money(metrics.avgOrderValue)}
            sub="Based on completed and active orders"
            accent="#2563eb"
            icon="🧾"
          />
          <RevenueCard
            title="Open Pipeline"
            value={money(metrics.pipelineRevenue)}
            sub="Revenue still moving through the kitchen or delivery"
            accent="#7c3aed"
            icon="🚚"
          />
        </div>

        <div style={{ ...panel, marginBottom: 20, padding: 0, overflow: "hidden", background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 48%, #eff6ff 100%)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 0.9fr)", gap: 0 }}>
            <div style={{ padding: "24px 24px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#111827" }}>Target Tracker</div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>A simple pace check so the page feels less dead and more directional.</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#9a3412", background: "#ffedd5", border: "1px solid #fdba74", borderRadius: 999, padding: "7px 10px" }}>
                  Goal {money(metrics.targetRevenue)}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8, fontSize: 13, fontWeight: 700, color: "#374151" }}>
                  <span>Progress</span>
                  <span>{metrics.targetProgress}%</span>
                </div>
                <div style={{ height: 16, borderRadius: 999, background: "rgba(255,255,255,0.7)", overflow: "hidden", border: "1px solid rgba(17,24,39,0.06)" }}>
                  <div style={{ width: `${metrics.targetProgress}%`, minWidth: metrics.totalRevenue > 0 ? 18 : 0, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #fb923c 0%, #ff4e2a 45%, #3b82f6 100%)", boxShadow: "0 8px 18px rgba(255,78,42,0.2)" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                <div style={{ padding: "14px 16px", borderRadius: 16, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(17,24,39,0.06)" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active days</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#111827", marginTop: 6 }}>{metrics.activeDates}</div>
                </div>
                <div style={{ padding: "14px 16px", borderRadius: 16, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(17,24,39,0.06)" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Split orders</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#111827", marginTop: 6 }}>{metrics.splitOrdersCount}</div>
                </div>
                <div style={{ padding: "14px 16px", borderRadius: 16, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(17,24,39,0.06)" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Cash pending</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#111827", marginTop: 8 }}>{money(metrics.splitCashPending)}</div>
                </div>
              </div>
            </div>

            <div style={{ padding: "24px 24px 22px", borderLeft: "1px solid rgba(17,24,39,0.06)", background: "rgba(255,255,255,0.58)" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#111827", marginBottom: 14 }}>Mix Breakdown</div>
              <div style={{ display: "grid", gap: 18 }}>
                <MiniDonut value={metrics.paymentTotals.card} total={metrics.totalRevenue} color="#2563eb" label="Card capture" />
                <MiniDonut value={metrics.paymentTotals.cash} total={metrics.totalRevenue} color="#f59e0b" label="Cash intake" />
                <MiniDonut value={metrics.splitCardCaptured} total={metrics.totalRevenue} color="#7c3aed" label="Split card share" />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 0.9fr)", gap: 18, marginBottom: 20 }}>
          <div style={panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 21, fontWeight: 900, color: "#111827" }}>Revenue Trend</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Latest {metrics.trend.length} {getGranularity(timeframe)} buckets</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", padding: "8px 10px", borderRadius: 999, background: "#f9fafb", border: "1px solid #eef2f7" }}>
                Total {money(metrics.totalRevenue)}
              </div>
            </div>
            {metrics.trend.length > 0 ? (
              <SimpleBars data={metrics.trend} formatValue={money} />
            ) : (
              <div style={{ textAlign: "center", padding: "70px 20px", color: "#9ca3af", fontWeight: 700 }}>No revenue data in this range yet.</div>
            )}
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <div style={panel}>
              <div style={{ fontSize: 21, fontWeight: 900, color: "#111827", marginBottom: 14 }}>Payment Mix</div>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ padding: "14px 16px", borderRadius: 16, background: "#eff6ff", border: "1px solid #dbeafe" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Card Revenue</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#111827" }}>{money(metrics.paymentTotals.card)}</div>
                </div>
                <div style={{ padding: "14px 16px", borderRadius: 16, background: "#fff7ed", border: "1px solid #fed7aa" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Cash Revenue</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#111827" }}>{money(metrics.paymentTotals.cash)}</div>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {Object.entries(metrics.paymentTotals.byMethod).map(([method, value]) => {
                    const style = PAYMENT_STYLES[method] || PAYMENT_STYLES.cod;
                    const percent = metrics.totalRevenue > 0 ? Math.round((value / metrics.totalRevenue) * 100) : 0;
                    return (
                      <div key={method} style={{ display: "grid", gridTemplateColumns: "110px 1fr auto", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: style.color, background: style.bg, borderRadius: 999, padding: "6px 10px", textAlign: "center" }}>{style.label}</span>
                        <div style={{ height: 10, borderRadius: 999, background: "#f3f4f6", overflow: "hidden" }}>
                          <div style={{ width: `${percent}%`, minWidth: value > 0 ? 10 : 0, height: "100%", borderRadius: 999, background: style.color }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={panel}>
              <div style={{ fontSize: 21, fontWeight: 900, color: "#111827", marginBottom: 6 }}>Forecast</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 14 }}>Next 7 days based on your existing order pattern</div>
              {forecast.length > 0 ? (
                <>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#111827", letterSpacing: "-1px", marginBottom: 14 }}>{money(forecastTotal)}</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {forecast.slice(0, 4).map((day) => (
                      <div key={day.date} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "10px 12px", borderRadius: 12, background: "#fafafa", border: "1px solid #f1f5f9" }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: "#111827" }}>{day.dayName}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>{shortDate(day.date)}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 900, fontSize: 13, color: "#111827" }}>{money(day.predictedRevenue)}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>{day.predictedOrders} predicted orders</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ padding: "28px 16px", borderRadius: 16, background: "#f9fafb", color: "#6b7280", fontWeight: 700, textAlign: "center" }}>
                  Need more delivered orders before forecast becomes useful.
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)", gap: 18 }}>
          <div style={panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 21, fontWeight: 900, color: "#111827" }}>Top Revenue Items</div>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Best earning foods in this range</div>
            </div>
            {metrics.topItems.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {metrics.topItems.map((item, index) => (
                  <div key={`${item.name}-${index}`} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 14, background: index === 0 ? "#fff7ed" : "#fafafa", border: `1px solid ${index === 0 ? "#fed7aa" : "#eef2f7"}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: index === 0 ? "#ffedd5" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: index === 0 ? "#c2410c" : "#6b7280" }}>
                      {index + 1}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{item.quantity} sold</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Qty {item.quantity}</div>
                    <div style={{ fontWeight: 900, color: "#111827" }}>{money(item.revenue)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "56px 20px", color: "#9ca3af", fontWeight: 700 }}>No item sales available in this range yet.</div>
            )}
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <div style={panel}>
              <div style={{ fontSize: 21, fontWeight: 900, color: "#111827", marginBottom: 16 }}>Weekday Heat</div>
              <WeekdayHeat data={metrics.weekdayStats} />
            </div>

            <div style={panel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 21, fontWeight: 900, color: "#111827" }}>Fresh Orders</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>Most recent revenue activity</div>
              </div>
              {metrics.recentOrders.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {metrics.recentOrders.map((order) => {
                    const paymentStyle = PAYMENT_STYLES[order.paymentMethod] || PAYMENT_STYLES.cod;
                    return (
                      <div key={order.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", padding: "12px 14px", borderRadius: 14, background: "#fafafa", border: "1px solid #eef2f7" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.customer}</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 5 }}>
                            <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 700 }}>{new Date(order.createdAt).toLocaleString("en-AE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: paymentStyle.color, background: paymentStyle.bg, borderRadius: 999, padding: "3px 8px" }}>{paymentStyle.label}</span>
                            <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 700 }}>{order.status}</span>
                          </div>
                        </div>
                        <div style={{ fontWeight: 900, color: "#111827" }}>{money(order.amount)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "48px 16px", color: "#9ca3af", fontWeight: 700 }}>No recent orders in this range yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RestaurantLayout>
  );
}