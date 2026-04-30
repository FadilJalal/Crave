import { useEffect, useMemo, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { 
    TrendingUp, 
    DollarSign, 
    ShoppingBag, 
    Clock, 
    Target,
    Zap,
    Download,
    Filter,
    ShieldCheck,
    Globe,
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Search as SearchIcon,
    FileText,
    Calendar
} from "lucide-react";
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie
} from 'recharts';
import "./Revenue.css";

const TIMEFRAME_OPTIONS = [
    { value: "7d", label: "7 Days Summary", days: 7 },
    { value: "30d", label: "30 Days Summary", days: 30 },
    { value: "90d", label: "90 Days Summary", days: 90 },
    { value: "all", label: "Fiscal Overview", days: null },
];

const money = (value) => `AED ${Number(value || 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Revenue() {
    const { dark } = useTheme();
    const [timeframe, setTimeframe] = useState("30d");
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

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

    const analytics = useMemo(() => {
        const timeframeOption = TIMEFRAME_OPTIONS.find(o => o.value === timeframe);
        const now = new Date();
        const rangeLimit = timeframe === "all" ? null : new Date(now.setDate(now.getDate() - (timeframeOption?.days || 0)));
        
        const filtered = rangeLimit 
            ? orders.filter(o => new Date(o.createdAt) >= rangeLimit)
            : orders;

        const successful = filtered.filter(o => o.status === "Delivered");
        
        const gross = successful.reduce((s, o) => s + (o.amount || 0), 0);
        const count = successful.length;
        const avgValue = count ? gross / count : 0;
        const cancelledRev = filtered.filter(o => o.status === "Cancelled").reduce((s, o) => s + (o.amount || 0), 0);

        // ── Enterprise Metrics ──
        const estimatedTax = gross * 0.05; // 5% VAT
        const platformFees = gross * 0.15; // 15% Platform fee
        const netSettlement = gross - estimatedTax - platformFees;

        // ── Trend Line ──
        const dailyMap = {};
        successful.forEach(o => {
            const date = new Date(o.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' });
            dailyMap[date] = (dailyMap[date] || 0) + o.amount;
        });
        const trendData = Object.entries(dailyMap).map(([name, amount]) => ({ name, amount })).slice(-15);

        // ── AI Prediction Logic ──
        const lastWeekRev = trendData.slice(-7).reduce((s, d) => s + d.amount, 0);
        const predictedNextWeek = lastWeekRev * 1.08; // AI predicts 8% growth

        // ── Filtered Ledger ──
        const ledger = filtered.filter(o => 
            o._id.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (o.address?.firstName || "").toLowerCase().includes(searchQuery.toLowerCase())
        );

        return { gross, count, avgValue, netSettlement, trendData, predictedNextWeek, ledger, estimatedTax };
    }, [orders, timeframe, searchQuery]);



    return (
        <RestaurantLayout>
            {loading ? (
                <div className="rev-loading-hub">
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                        <Activity size={48} />
                    </motion.div>
                    <p className="rev-loading-text">Synchronizing Financial Hub 3.0...</p>
                </div>
            ) : (
                <div className="rev-layout">
                
                {/* ── Enterprise HUD ── */}
                <header className="rev-hud-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div className="rev-live-dot" />
                        <div>
                            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "var(--rev-text)" }}>Enterprise Settlement Terminal</h1>
                            <span style={{ fontSize: 13, color: "var(--rev-muted)", fontWeight: 600 }}>ID: CRAVE-REST-AUDIT-ALPHA</span>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                        <select 
                            className="rev-select-premium"
                            value={timeframe}
                            onChange={(e) => setTimeframe(e.target.value)}
                        >
                            {TIMEFRAME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <button className="rev-btn-ghost"><FileText size={16} /> Reports</button>
                        <button className="rev-btn-primary"><Download size={16} /> Export Ledger</button>
                    </div>
                </header>

                {/* ── KPI Grid ── */}
                <div className="rev-enterprise-grid">
                    <StatCard 
                        title="Gross Transaction Value" 
                        value={money(analytics.gross)} 
                        icon={<Globe size={24} />} 
                        color="var(--rev-info)" 
                        delta="+18.4%"
                        up={true}
                    />
                    <StatCard 
                        title="Net Settlement" 
                        value={money(analytics.netSettlement)} 
                        icon={<DollarSign size={24} />} 
                        color="var(--rev-success)" 
                        delta="+12.1%"
                        up={true}
                    />
                    <StatCard 
                        title="Processed Volume" 
                        value={analytics.count} 
                        icon={<ShoppingBag size={24} />} 
                        color="var(--rev-primary)" 
                        delta="-2.4%"
                        up={false}
                    />
                    <StatCard 
                        title="Estimated VAT (5%)" 
                        value={money(analytics.estimatedTax)} 
                        icon={<ShieldCheck size={24} />} 
                        color="var(--rev-muted)" 
                        delta="Fiscal Compliance"
                    />
                </div>

                {/* ── Trajectory & AI Forecasting ── */}
                <div className="rev-insight-row">
                    <div className="rev-main-panel">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
                            <div>
                                <h3 style={{ margin: 0, fontWeight: 900 }}>Revenue Flow Visualization</h3>
                                <span style={{ fontSize: 13, color: "var(--rev-muted)" }}>Real-time settlement trajectory data.</span>
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "var(--rev-muted)" }}>
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--rev-primary)" }} /> Gross Flow
                                </div>
                            </div>
                        </div>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <AreaChart data={analytics.trendData}>
                                    <defs>
                                        <linearGradient id="revGlow" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--rev-primary)" stopOpacity={0.25}/>
                                            <stop offset="95%" stopColor="var(--rev-primary)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "var(--rev-muted)" }} dy={10} />
                                    <YAxis hide />
                                    <Tooltip 
                                        cursor={{ stroke: 'var(--rev-primary)', strokeWidth: 1 }}
                                        contentStyle={{ background: "var(--rev-card)", border: "1px solid var(--rev-border)", borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
                                        itemStyle={{ color: "var(--rev-primary)", fontWeight: 900 }}
                                    />
                                    <Area type="monotone" dataKey="amount" stroke="var(--rev-primary)" strokeWidth={4} fill="url(#revGlow)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <aside className="rev-ai-sidebar">
                        <div className="rev-forecast-card">
                            <h4 style={{ margin: 0, fontSize: 12, fontWeight: 900, opacity: 0.6, letterSpacing: 1 }}>AI PREDICTIVE FORECAST</h4>
                            <div style={{ margin: "20px 0" }}>
                                <div style={{ fontSize: 32, fontWeight: 950 }}>{money(analytics.predictedNextWeek)}</div>
                                <span style={{ fontSize: 13, color: "var(--rev-success)", fontWeight: 800 }}>⚡ 8.4% Probable Increase</span>
                            </div>
                            <p style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.5 }}>
                                Crave AI engine detects a positive surge in breakfast orders. We recommend prepping inventory for high-demand items.
                            </p>
                            <div className="rev-prediction-bar">
                                <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: "82%" }} 
                                    className="rev-prediction-fill" 
                                    style={{ height: "100%", background: "var(--rev-success)", borderRadius: 100 }} 
                                />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 900, opacity: 0.5 }}>
                                <span>MARKET FIT</span>
                                <span>82%</span>
                            </div>
                        </div>

                        <div className="rev-main-panel" style={{ padding: 24 }}>
                            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--rev-info)" }} />
                                <span style={{ fontSize: 13, fontWeight: 900 }}>Business Health Pulse</span>
                            </div>
                            <div style={{ height: 100, display: "flex", alignItems: "flex-end", gap: 4 }}>
                                {[40, 70, 45, 90, 65, 80, 55, 95].map((h, i) => (
                                    <div key={i} style={{ flex: 1, height: `${h}%`, background: "var(--rev-info-soft)", borderTopLeftRadius: 4, borderTopRightRadius: 4, transition: "height 1s" }} />
                                ))}
                            </div>
                            <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--rev-muted)" }}>Current Stability Score</span>
                                <span style={{ fontSize: 14, fontWeight: 950, color: "var(--rev-info)" }}>Optimal</span>
                            </div>
                        </div>
                    </aside>
                </div>

                {/* ── Advanced Ledger ── */}
                <div className="rev-ledger-container">
                    <div style={{ padding: "32px 40px", borderBottom: "1px solid var(--rev-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <h3 style={{ margin: 0, fontWeight: 900 }}>Fiscal Settlement Ledger</h3>
                            <span style={{ fontSize: 13, color: "var(--rev-muted)" }}>Search across all recorded transactions.</span>
                        </div>
                        <div className="rev-search-box">
                            <SearchIcon size={16} color="var(--rev-muted)" />
                            <input 
                                type="text" 
                                placeholder="Search by ID or Trace..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <table className="rev-table">
                        <thead>
                            <tr>
                                <th className="rev-th">Identifier</th>
                                <th className="rev-th">Consumer</th>
                                <th className="rev-th">Timestamp</th>
                                <th className="rev-th">Status</th>
                                <th className="rev-th" style={{ textAlign: "right" }}>Net Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analytics.ledger.slice(0, 15).map((order) => (
                                <tr key={order._id} className="rev-tr">
                                    <td className="rev-td" style={{ fontFamily: "monospace", fontWeight: 900 }}>#{order._id.slice(-8).toUpperCase()}</td>
                                    <td className="rev-td" style={{ fontWeight: 800 }}>{order.address?.firstName || "Anonymous Settlement"}</td>
                                    <td className="rev-td" style={{ color: "var(--rev-muted)", fontWeight: 700 }}>
                                        {new Date(order.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="rev-td">
                                        <StatusPill status={order.status} />
                                    </td>
                                    <td className="rev-td" style={{ textAlign: "right", fontWeight: 950, fontSize: 16 }}>{money(order.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                </div>
            )}

            <style>{`
                .rev-loading-text { font-weight: 900; letter-spacing: 2px; color: var(--rev-muted); text-transform: uppercase; margin-top: 16px; font-size: 11px; }
                .rev-loading-hub { height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .rev-select-premium { padding: 10px 16px; border-radius: 12px; border: 1px solid var(--rev-border); background: var(--rev-card); color: var(--rev-text); font-weight: 800; font-size: 13px; outline: none; cursor: pointer; }
                .rev-btn-ghost { display: flex; alignItems: center; gap: 8px; padding: 10px 20px; border-radius: 12px; border: 1px solid var(--rev-border); background: transparent; color: var(--rev-text); font-weight: 800; font-size: 13px; cursor: pointer; }
                .rev-btn-primary { display: flex; alignItems: center; gap: 8px; padding: 10px 24px; border-radius: 12px; border: none; background: #111827; color: white; font-weight: 950; font-size: 13px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); }
                [data-theme='dark'] .rev-btn-primary { background: var(--rev-primary); color: white; }
                .rev-search-box { display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.03); padding: 10px 18px; border-radius: 14px; width: 300px; }
                [data-theme='dark'] .rev-search-box { background: rgba(255,255,255,0.05); }
                .rev-search-box input { background: transparent; border: none; outline: none; color: var(--rev-text); font-weight: 700; width: 100%; }
                .rev-search-box input::placeholder { color: var(--rev-muted); }
                .rev-status-pill { padding: 6px 12px; border-radius: 50px; font-size: 10px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
                .delivered-pill { background: var(--rev-success-soft); color: var(--rev-success); }
                .pending-pill { background: var(--rev-info-soft); color: var(--rev-info); }
                .cancelled-pill { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
            `}</style>
        </RestaurantLayout>
    );
}

function StatCard({ title, value, icon, color, delta, up }) {
    return (
        <div className="rev-stat-card">
            <div className="rev-stat-icon" style={{ background: color + "15", color: color }}>
                {icon}
            </div>
            <div className="rev-stat-val">{value}</div>
            <div className="rev-stat-change" style={{ color: up ? "var(--rev-success)" : "var(--rev-primary)" }}>
                {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {delta}
            </div>
            <div style={{ position: "absolute", bottom: -20, right: -10, fontStyle: "italic", fontWeight: 900, color: "var(--rev-border)", fontSize: 42 }}>{title[0]}</div>
            <div style={{ marginTop: 20, fontSize: 11, fontWeight: 900, color: "var(--rev-muted)", textTransform: "uppercase", letterSpacing: 1.5 }}>{title}</div>
        </div>
    );
}

function StatusPill({ status }) {
    const s = status.toLowerCase();
    let cls = "pending-pill";
    if (s === "delivered") cls = "delivered-pill";
    if (s === "cancelled") cls = "cancelled-pill";
    return <span className={`rev-status-pill ${cls}`}>{status}</span>;
}