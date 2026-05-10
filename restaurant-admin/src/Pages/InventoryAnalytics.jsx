import React, { useEffect, useState, useMemo } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { toast } from "react-toastify";
import { useTheme } from "../ThemeContext";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ComposedChart
} from "recharts";
import { 
  TrendingUp, Package, AlertTriangle, DollarSign, 
  ArrowUpRight, ArrowDownRight, Activity, Layers,
  Calendar, RefreshCw, Filter
} from "lucide-react";

/* ─── Constants ──────────────────────────────────────────────── */

const TABS = [
  { id: "overview", label: "Financial Health", icon: <DollarSign size={16} /> },
  { id: "velocity", label: "Inventory Velocity", icon: <Activity size={16} /> },
  { id: "concentration", label: "Asset Mix", icon: <Layers size={16} /> }
];

const COLORS = ["#534AB7", "#F43F5E", "#10B981", "#F59E0B", "#3B82F6", "#8B5CF6"];

/* ─── Main Component ─────────────────────────────────────────── */

export default function InventoryAnalytics() {
  const { dark } = useTheme();
  const [timeframe, setTimeframe] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState({ inv: null, turn: null, cost: null });

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
      toast.error("Failed to synchronize intelligence data");
    } finally {
      setLoading(false);
    }
  };

  /* Theme helpers */
  const c = (light, dk) => dark ? dk : light;
  const border = c("rgba(0,0,0,0.07)", "rgba(255,255,255,0.07)");
  const cardBg = c("#ffffff", "rgba(255,255,255,0.03)");
  const textC  = c("#0f172a", "#f8fafc");
  const mutedC = c("#9ca3af", "rgba(255,255,255,0.4)");
  const accent = "#534AB7";

  if (loading && !data.inv) {
    return (
      <RestaurantLayout>
        <div style={{ height: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <div style={{ width: 48, height: 48, border: `4px solid ${border}`, borderTopColor: accent, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <p style={{ fontWeight: 900, fontSize: 16, color: mutedC, letterSpacing: "1px", textTransform: "uppercase" }}>Analyzing Stock Velocity...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </RestaurantLayout>
    );
  }

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px 100px" }}>
        
        {/* ── Header Section ── */}
        <div style={{ padding: "60px 0 40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ padding: "8px 12px", background: `${accent}15`, color: accent, borderRadius: 8, fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: "1.5px" }}>
                Intelligence Hub
              </div>
              <div style={{ height: 1, width: 40, background: border }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: mutedC }}>Real-time Supply Chain Audit</span>
            </div>
            <h1 style={{ fontSize: 48, fontWeight: 950, margin: 0, letterSpacing: "-2px", color: textC }}>Stock Analytics</h1>
          </div>
          
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", background: cardBg, padding: 6, borderRadius: 16, border: `1px solid ${border}` }}>
              {["7d", "30d", "90d"].map(t => (
                <button 
                  key={t}
                  onClick={() => setTimeframe(t)}
                  style={{
                    padding: "10px 20px", borderRadius: 12, border: "none",
                    background: timeframe === t ? accent : "transparent",
                    color: timeframe === t ? "white" : mutedC,
                    fontWeight: 900, fontSize: 12, cursor: "pointer", transition: "all 0.2s"
                  }}
                >
                  {t === "7d" ? "7 Days" : t === "30d" ? "30 Days" : "Quarterly"}
                </button>
              ))}
            </div>
            <button 
              onClick={loadAnalytics}
              style={{ padding: 14, borderRadius: 16, background: cardBg, border: `1px solid ${border}`, color: textC, cursor: "pointer" }}
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── KPI Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 40 }}>
           <KPICard 
             title="Inventory Valuation" 
             value={`AED ${(data.inv?.current?.totalValue || 0).toLocaleString()}`} 
             trend="+12.4%" 
             positive={false}
             icon={<DollarSign size={20} />} 
             dark={dark} 
             accent={accent}
           />
           <KPICard 
             title="Daily Burn Rate" 
             value={`AED ${(data.inv?.summary?.avgDailyUsage || 0).toLocaleString()}`} 
             trend="-2.1%" 
             positive={true}
             icon={<Activity size={20} />} 
             dark={dark} 
             accent="#F43F5E"
           />
           <KPICard 
             title="Tracked Units" 
             value={data.inv?.current?.totalItems || 0} 
             trend="Live" 
             icon={<Package size={20} />} 
             dark={dark} 
             accent="#10B981"
           />
           <KPICard 
             title="Monthly Capital" 
             value={`AED ${(data.inv?.summary?.projectedMonthlyUsage || 0).toLocaleString()}`} 
             trend="Projected" 
             icon={<TrendingUp size={20} />} 
             dark={dark} 
             accent="#F59E0B"
           />
        </div>

        {/* ── Tactical Tab Bar ── */}
        <div style={{ 
          display: "flex", gap: 12, marginBottom: 40, padding: 8, 
          background: cardBg, borderRadius: 24, border: `1px solid ${border}`, width: "fit-content" 
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "16px 32px", borderRadius: 18, border: "none",
                background: tab === t.id ? accent : "transparent",
                color: tab === t.id ? "white" : mutedC,
                fontWeight: 900, fontSize: 14, cursor: "pointer", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                display: "flex", alignItems: "center", gap: 10
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Main Dashboard Content ── */}
        <div style={{ minHeight: 600 }}>
          {tab === "overview" && <OverviewTab data={data} dark={dark} accent={accent} border={border} cardBg={cardBg} textC={textC} mutedC={mutedC} />}
          {tab === "velocity" && <VelocityTab data={data} dark={dark} accent={accent} border={border} cardBg={cardBg} textC={textC} mutedC={mutedC} />}
          {tab === "concentration" && <ConcentrationTab data={data} dark={dark} accent={accent} border={border} cardBg={cardBg} textC={textC} mutedC={mutedC} />}
        </div>

      </div>
    </RestaurantLayout>
  );
}

/* ─── Tab Components ─────────────────────────────────────────── */

function OverviewTab({ data, dark, accent, border, cardBg, textC, mutedC }) {
  const chartData = useMemo(() => {
    // Aggregating category data for visualization
    return (data.inv?.current?.byCategory || []).map(c => ({
      name: c.category.replace(/_/g, ' ').toUpperCase(),
      value: c.value,
      percentage: c.percentage
    }));
  }, [data]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 32 }}>
       <div style={{ background: cardBg, borderRadius: 32, border: `1px solid ${border}`, padding: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
             <div>
                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 950, color: textC }}>Capital Concentration</h3>
                <p style={{ margin: "4px 0 0", color: mutedC, fontWeight: 600 }}>Asset distribution by category</p>
             </div>
             <div style={{ display: "flex", gap: 8 }}>
                <div style={{ padding: "8px 16px", borderRadius: 10, background: `${accent}10`, color: accent, fontSize: 12, fontWeight: 900 }}>Financial Chart</div>
             </div>
          </div>
          <div style={{ height: 400, width: "100%" }}>
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke={border} vertical={false} />
                   <XAxis dataKey="name" stroke={mutedC} fontSize={10} fontWeight={800} axisLine={false} tickLine={false} />
                   <YAxis stroke={mutedC} fontSize={10} fontWeight={800} axisLine={false} tickLine={false} tickFormatter={v => `AED ${v}`} />
                   <Tooltip 
                     contentStyle={{ background: dark ? "#1e293b" : "#fff", border: `1px solid ${border}`, borderRadius: 16, padding: 12 }}
                     itemStyle={{ fontWeight: 900 }}
                     cursor={{ fill: `${accent}05` }}
                   />
                   <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
       </div>

       <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <SectionBox title="High Value Assets" dark={dark} border={border}>
             <div style={{ display: "grid", gap: 16 }}>
                {(data.cost?.current?.highestCostItems || []).slice(0, 5).map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                       <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                       <span style={{ fontWeight: 800, color: textC, fontSize: 14 }}>{item.name}</span>
                    </div>
                    <span style={{ fontWeight: 950, color: accent }}>AED {item.cost.toFixed(2)}</span>
                  </div>
                ))}
             </div>
          </SectionBox>

          <SectionBox title="Intelligence Summary" dark={dark} border={border}>
             <p style={{ margin: 0, fontSize: 14, color: mutedC, fontWeight: 600, lineHeight: 1.6 }}>
                The inventory is currently valued at <b style={{color: textC}}>AED {(data.inv?.current?.totalValue || 0).toLocaleString()}</b>. 
                Based on the current daily burn rate of <b style={{color: textC}}>AED {data.inv?.summary?.avgDailyUsage?.toFixed(2)}</b>, 
                you have approximately <b style={{color: "#10B981"}}>{((data.inv?.current?.totalValue || 0) / (data.inv?.summary?.avgDailyUsage || 1)).toFixed(0)} days</b> of runway.
             </p>
             <div style={{ marginTop: 24, padding: "16px", borderRadius: 16, background: `${accent}08`, border: `1px dashed ${accent}30`, display: "flex", alignItems: "center", gap: 12 }}>
                <AlertTriangle size={20} color={accent} />
                <span style={{ fontSize: 12, fontWeight: 800, color: textC }}>Optimal restock window: Next 4 days</span>
             </div>
          </SectionBox>
       </div>
    </div>
  );
}

function VelocityTab({ data, dark, accent, border, cardBg, textC, mutedC }) {
  const flatData = useMemo(() => {
    return (data.turn || []).flatMap(cat => cat.items.map(i => ({
      ...i,
      category: cat.category.replace(/_/g, ' ')
    }))).sort((a, b) => b.turnoverRate - a.turnoverRate);
  }, [data]);

  return (
    <div style={{ display: "grid", gap: 32 }}>
       <div style={{ background: cardBg, borderRadius: 32, border: `1px solid ${border}`, padding: 40 }}>
          <div style={{ marginBottom: 40 }}>
            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 950, color: textC }}>Inventory Turnover Analysis</h3>
            <p style={{ margin: "4px 0 0", color: mutedC, fontWeight: 600 }}>Tracking usage frequency vs. stock duration</p>
          </div>
          
          <div style={{ height: 400, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={flatData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke={border} vertical={false} />
                <XAxis dataKey="name" stroke={mutedC} fontSize={10} fontWeight={800} axisLine={false} tickLine={false} />
                <YAxis stroke={mutedC} fontSize={10} fontWeight={800} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: dark ? "#1e293b" : "#fff", border: `1px solid ${border}`, borderRadius: 16 }}
                />
                <Bar dataKey="turnoverRate" name="Turnover %" fill={accent} radius={[8, 8, 0, 0]} barSize={40} />
                <Line type="monotone" dataKey="usedValue" name="Value Consumed" stroke="#F43F5E" strokeWidth={3} dot={{ r: 4, fill: "#F43F5E" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
       </div>

       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
          {flatData.slice(0, 6).map((item, i) => (
            <div key={i} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 24, padding: 24 }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 950 }}>{item.name}</h4>
                    <span style={{ fontSize: 10, fontWeight: 900, color: mutedC, textTransform: "uppercase" }}>{item.category}</span>
                  </div>
                  <div style={{ padding: "6px 12px", borderRadius: 10, background: item.efficiency === "high" ? "#10B98115" : "#F43F5E15", color: item.efficiency === "high" ? "#10B981" : "#F43F5E", fontSize: 10, fontWeight: 950 }}>
                    {item.efficiency.toUpperCase()}
                  </div>
               </div>
               <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: border, borderRadius: 10 }}>
                     <div style={{ width: `${Math.min(item.turnoverRate, 100)}%`, height: "100%", background: accent, borderRadius: 10 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 950 }}>{item.turnoverRate}%</span>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
}

function ConcentrationTab({ data, dark, accent, border, cardBg, textC, mutedC }) {
  const pieData = useMemo(() => {
    return (data.inv?.current?.byCategory || []).map(c => ({
      name: c.category.replace(/_/g, ' ').toUpperCase(),
      value: c.value
    }));
  }, [data]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
       <div style={{ background: cardBg, borderRadius: 32, border: `1px solid ${border}`, padding: 40, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "100%", marginBottom: 40 }}>
            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 950, color: textC }}>Asset Concentration</h3>
            <p style={{ margin: "4px 0 0", color: mutedC, fontWeight: 600 }}>Portfolio weight by category</p>
          </div>
          <div style={{ height: 400, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieData} 
                  innerRadius={100} 
                  outerRadius={140} 
                  paddingAngle={5} 
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: dark ? "#1e293b" : "#fff", border: `1px solid ${border}`, borderRadius: 16 }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
       </div>

       <div style={{ background: cardBg, borderRadius: 32, border: `1px solid ${border}`, padding: 40 }}>
          <h3 style={{ margin: "0 0 32px", fontSize: 24, fontWeight: 950, color: textC }}>Cost Analysis</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
             <MetricRow label="Capital Invested" value={`AED ${data.cost?.current?.totalCapitalInvested?.toLocaleString()}`} color={textC} />
             <MetricRow label="Average Unit Cost" value={`AED ${data.cost?.current?.averageUnitCost?.toFixed(2)}`} color={accent} />
             <MetricRow label="Consumed Capital" value={`AED ${data.cost?.usage?.totalCostUsed?.toLocaleString()}`} color="#F43F5E" />
             <div style={{ height: 1, background: border, margin: "8px 0" }} />
             <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: mutedC, textTransform: "uppercase" }}>Critical Over-Stock Alert</p>
                {(data.cost?.current?.highestCostItems || []).slice(0, 3).map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>{item.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 900, color: "#F43F5E" }}>{((item.cost / data.cost.current.totalCapitalInvested) * 100).toFixed(1)}% of budget</span>
                  </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
}

/* ─── UI Components ──────────────────────────────────────────── */

function KPICard({ title, value, trend, icon, dark, accent, positive }) {
  const border = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const bg = dark ? "rgba(255,255,255,0.03)" : "white";
  const muted = dark ? "rgba(255,255,255,0.4)" : "#64748b";

  return (
    <div style={{ 
      background: bg, border: `1px solid ${border}`, borderRadius: 28, padding: 32,
      display: "flex", flexDirection: "column", gap: 16, position: "relative", overflow: "hidden"
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: `${accent}15`, color: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 900, color: muted, textTransform: "uppercase", letterSpacing: "1px" }}>{title}</p>
        <h3 style={{ margin: "4px 0", fontSize: 32, fontWeight: 950, letterSpacing: "-1px" }}>{value}</h3>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {trend === "Live" || trend === "Projected" ? (
          <span style={{ fontSize: 11, fontWeight: 900, color: accent }}>{trend}</span>
        ) : (
          <>
            {positive ? <ArrowDownRight size={14} color="#10B981" /> : <ArrowUpRight size={14} color="#F43F5E" />}
            <span style={{ fontSize: 11, fontWeight: 900, color: positive ? "#10B981" : "#F43F5E" }}>{trend}</span>
          </>
        )}
      </div>
    </div>
  );
}

function SectionBox({ title, children, dark, border }) {
  return (
    <div style={{ background: dark ? "rgba(255,255,255,0.02)" : "#f9fafb", borderRadius: 24, padding: 24, border: `1px solid ${border}` }}>
      <h4 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</h4>
      {children}
    </div>
  );
}

function MetricRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.7 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 950, color }}>{value}</span>
    </div>
  );
}
