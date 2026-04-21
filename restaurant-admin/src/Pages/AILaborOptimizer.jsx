import { useState, useEffect } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import { 
  Clock, 
  Users, 
  TrendingUp, 
  BrainCircuit, 
  Calendar, 
  Info, 
  AlertTriangle,
  CheckCircle2,
  Zap,
  ArrowUpRight
} from "lucide-react";

export default function AILaborOptimizer() {
  const { dark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLaborData();
  }, []);

  const loadLaborData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/ai/restaurant/labor-optimization");
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load labor data", err);
    }
    setLoading(false);
  };

  const accentColor = "#6366f1"; // Professional Indigo

  const cardStyle = {
    background: dark ? "rgba(15, 23, 42, 0.4)" : "#ffffff",
    backdropFilter: "blur(20px)",
    border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0",
    boxShadow: dark ? "0 10px 30px rgba(0,0,0,0.3)" : "0 4px 12px rgba(0,0,0,0.03)",
    borderRadius: 24,
    padding: 32,
  };

  if (loading) {
    return (
      <RestaurantLayout>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
          <div style={{ 
            width: 48, height: 48, border: `3px solid ${dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, 
            borderTop: `3px solid ${accentColor}`, borderRadius: "50%", 
            animation: "spin 0.8s linear infinite" 
          }} />
          <p style={{ marginTop: 20, color: "var(--muted)", fontWeight: 600 }}>Analyzing operational velocity...</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </RestaurantLayout>
    );
  }

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 60 }}>
        
        {/* HEADER SECTION */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ 
              background: `${accentColor}15`, color: accentColor, 
              padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 800, 
              textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center", gap: 6 
            }}>
              <Zap size={14} />
              AI Labor Engine 2.1
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>Optimizing Shift Patterns</span>
            </div>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0, letterSpacing: "-1px", color: dark ? "#fff" : "#0f172a" }}>
            Labor & Shift <span style={{ color: "var(--muted)", fontWeight: 400 }}>Optimization</span>
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted)", marginTop: 8, maxWidth: 600, lineHeight: 1.6 }}>
            Predictive staffing patterns designed to minimize labor costs while maintaining elite service standards during peak surges.
          </p>
        </div>

        {data?.isSimulation && (
          <div style={{ 
            background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)",
            borderRadius: 16, padding: "12px 20px", marginBottom: 32, display: "flex", alignItems: "center", gap: 12,
            color: "#d97706", fontSize: 13, fontWeight: 600
          }}>
            <AlertTriangle size={18} />
            Insufficient historical data. Running in Simulation Mode based on industry benchmarks for your category.
          </div>
        )}

        {/* CORE METRICS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 32 }}>
          <MetricCard 
            title="Labor Efficiency" 
            value="92.4%" 
            sub="Optimum: 90-95%" 
            icon={<TrendingUp size={20} />} 
            dark={dark} 
          />
          <MetricCard 
            title="Max Staff Needed" 
            value={Math.max(...data.heatmap.map(h => h.recommendation))} 
            sub="Peak Friday 7PM" 
            icon={<Users size={20} />} 
            dark={dark} 
          />
          <MetricCard 
            title="Predicted Volume" 
            value={data.forecast.reduce((s,f) => s + f.predictedOrders, 0)} 
            sub="Next 7 Days Total" 
            icon={<Calendar size={20} />} 
            dark={dark} 
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            
            {/* WEEKLY FORECAST CHART AREA */}
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Weekly Labor Forecast</h3>
                  <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Staffing requirements vs. Predicted Order Load</p>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <LegendItem label="Orders" color={accentColor} />
                  <LegendItem label="Staff" color="#10b981" />
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 200, gap: 12, paddingBottom: 20, position: "relative" }}>
                {/* Horizontal grid lines */}
                <div style={{ position: "absolute", width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  {[1,2,3].map(i => <div key={i} style={{ width: "100%", height: 1, borderTop: `1px dashed ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }} />)}
                </div>

                {data.forecast.map((f, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, zIndex: 1 }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: "100%", width: "100%" }}>
                       <div style={{ 
                         flex: 1, 
                         height: `${(f.predictedOrders / 100) * 100}%`, 
                         background: accentColor, 
                         borderRadius: "4px 4px 0 0",
                         opacity: 0.8
                       }} />
                       <div style={{ 
                         flex: 1, 
                         height: `${(f.staffNeeded / 10) * 100}%`, 
                         background: "#10b981", 
                         borderRadius: "4px 4px 0 0",
                         opacity: 0.8
                       }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{f.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* HOURLY HEATMAP SECTION */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 24px" }}>Hourly Optimization Heatmap</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {data.heatmap.map((h, i) => (
                  <div key={i} style={{ 
                    display: "flex", alignItems: "center", gap: 20, padding: "12px 16px",
                    background: dark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                    borderRadius: 12, border: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#e2e8f0"}`
                  }}>
                    <div style={{ width: 60, fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>{h.hour}</div>
                    <div style={{ flex: 1, height: 8, background: dark ? "rgba(255,255,255,0.05)" : "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ 
                        height: "100%", width: `${h.load}%`, 
                        background: h.load > 80 ? "#ef4444" : h.load > 50 ? "#f59e0b" : accentColor,
                        borderRadius: 4
                      }} />
                    </div>
                    <div style={{ minWidth: 140, textAlign: "right" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", marginRight: 8 }}>RECOM:</span>
                      <span style={{ fontSize: 13, fontWeight: 800 }}>{h.recommendation} STAFF</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* AI INSIGHTS & PLAYBOOK */}
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            
            <div style={{ ...cardStyle, background: `${accentColor}10`, borderColor: `${accentColor}20`, padding: 24 }}>
               <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, color: accentColor }}>
                 <BrainCircuit size={20} />
                 <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>AI Strategic Insights</h4>
               </div>
               <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                 {data.insights.map((insight, i) => (
                   <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                     <div style={{ color: "#10b981", marginTop: 2 }}><CheckCircle2 size={16} /></div>
                     <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: dark ? "rgba(255,255,255,0.7)" : "#475569" }}>{insight}</p>
                   </div>
                 ))}
               </div>
            </div>

            <div style={cardStyle}>
               <h4 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 800 }}>Operational Guide</h4>
               <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                 <PlaybookItem title="Prep surge" time="10:30 AM" desc="Early prep for predicted lunch surge." dark={dark} />
                 <PlaybookItem title="Shift Overlap" time="5:30 PM" desc="Dinner rush transition window." dark={dark} />
                 <PlaybookItem title="Break Window" time="3:00 PM" desc="Optimal low-load break period." dark={dark} />
                 <PlaybookItem title="Cleaning Surge" time="10:00 PM" desc="Post-peak infrastructure reset." dark={dark} />
               </div>
            </div>

          </div>
        </div>
      </div>
    </RestaurantLayout>
  );
}

function MetricCard({ title, value, sub, icon, dark }) {
  return (
    <div style={{
      background: dark ? "rgba(255, 255, 255, 0.03)" : "#ffffff",
      border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#e2e8f0"}`,
      borderRadius: 20, padding: 24, boxShadow: !dark ? "0 2px 4px rgba(0,0,0,0.02)" : "none"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</p>
        <div style={{ color: "var(--muted)" }}>{icon}</div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <h4 style={{ margin: 0, fontSize: 32, fontWeight: 850, color: dark ? "#fff" : "#0f172a" }}>{value}</h4>
        {sub && <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: 2 }}>{sub} <ArrowUpRight size={12} /></span>}
      </div>
    </div>
  );
}

function LegendItem({ label, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>{label}</span>
    </div>
  );
}

function PlaybookItem({ title, time, desc, dark }) {
  return (
    <div style={{ 
      padding: 16, borderRadius: 12, background: dark ? "rgba(255,255,255,0.02)" : "#f8fafc",
      border: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#e2e8f0"}`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>{title}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", background: "rgba(99, 102, 241, 0.1)", padding: "2px 6px", borderRadius: 4 }}>{time}</span>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>{desc}</p>
    </div>
  );
}
