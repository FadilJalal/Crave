import { useEffect, useState, useMemo } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import ConfirmationModal from "../components/ConfirmationModal";
import { 
  Cpu, 
  Loader2, 
  Trash2, 
  TrendingUp,
  BrainCircuit,
  Zap,
  Activity,
  CheckCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
  Target,
  Database,
  Terminal,
  Radiation,
  Microscope,
  Atom,
  ChevronRight,
  Orbit,
  Dna,
  Layers,
  Bell,
  Plus,
  Clock,
  Users,
  Tag,
  RefreshCw,
  Rocket,
  Wand2,
  BarChart3,
  Flame,
  MousePointer2,
  Scan,
  Compass
} from "lucide-react";
import { toast } from "react-toastify";

const QUICK_IDEAS = [
  { label: "Night Cravings", icon: "🌙" },
  { label: "Weekend Rush", icon: "🔥" },
  { label: "Lunch Boost", icon: "🍱" },
  { label: "Clear Inventory", icon: "📦" },
  { label: "High-Value Upsell", icon: "💎" }
];

export default function Promos() {
  const { dark } = useTheme();
  const [aiGoal, setAiGoal] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiIdeas, setAiIdeas] = useState([]);
  const [activePromos, setActivePromos] = useState([]);
  const [promosLoading, setPromosLoading] = useState(true);
  const [editingData, setEditingData] = useState(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });
  const [currentStep, setCurrentStep] = useState(1); // 1: Ideation, 2: Review

  // Tactical Neon Theme
  const theme = {
    bg: dark ? "#05070a" : "#f8fafc",
    surface: dark ? "#0a0f18" : "#ffffff",
    card: dark ? "rgba(255,255,255,0.02)" : "#ffffff",
    accent: "#6366f1", // Indigo
    accentSecondary: "#10b981", // Emerald
    border: dark ? "rgba(255,255,255,0.06)" : "#e2e8f0",
    text: dark ? "#f1f5f9" : "#0f172a",
    textMuted: dark ? "#94a3b8" : "#64748b",
  };

  useEffect(() => { fetchActivePromos(); }, []);

  const fetchActivePromos = async () => {
    try {
      setPromosLoading(true);
      const res = await api.get("/api/promo/list");
      if (res.data?.success) setActivePromos(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setPromosLoading(false);
    }
  };

  const statAnalysis = useMemo(() => {
    const active = activePromos.filter(p => p.isActive).length;
    const todayHits = activePromos.reduce((sum, p) => sum + (p.usedCount || 0), 0);
    const revenue = todayHits * 45; 
    return { active, todayHits, revenue };
  }, [activePromos]);

  const handleGenerateAi = async () => {
    if (!aiGoal) return;
    setAiLoading(true);
    setAiIdeas([]);
    setEditingData(null);
    try {
      const res = await api.post("/api/promo/ai-suggest", { goal: aiGoal });
      if (res.data?.success) {
        const suggestions = (res.data.data?.suggestions || []).map(s => ({
            ...s,
            impact: s.estimatedImpact?.orders || "+24% Orders",
            audience: s.tags?.audience || "All Customers",
            timeText: s.tags?.time || "Limited Time"
        }));
        setAiIdeas(suggestions);
        setCurrentStep(2);
      }
    } catch (err) {
      toast.error("An error occurred during AI generation.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!editingData) return;
    setIsDeploying(true);
    try {
      const deployPayload = {
        name: editingData.title,
        code: editingData.code.toUpperCase(),
        type: editingData.type,
        value: editingData.value,
        minOrder: editingData.minOrder || 0,
        description: editingData.reason || editingData.description,
        isActive: true,
        promoType: "ai-generated"
      };
      const res = await api.post("/api/promo/create", deployPayload);
      if (res.data?.success) {
        toast.success("Deployment Success!");
        setAiIdeas([]);
        setEditingData(null);
        setCurrentStep(1);
        fetchActivePromos();
      } else {
        toast.error(res.data?.message || "Failed to deploy strategy.");
      }
    } catch (err) {
      toast.error("Network error during deployment.");
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/api/promo/${id}`);
      if (res.data?.success) {
        toast.success("Strategy purged.");
        fetchActivePromos();
      }
    } catch (err) {
      toast.error("Cleanup failed.");
    }
  };

  return (
    <RestaurantLayout>
      <div style={{ background: theme.bg, color: theme.text, minHeight: "100vh", fontFamily: "'Outfit', sans-serif" }}>
        
        <div style={{ padding: "40px" }}>
            
            {/* HERO INTERFACE */}
            <div style={{ 
                background: dark ? "rgba(99, 102, 241, 0.03)" : "#fff",
                border: `1px solid ${theme.border}`,
                borderRadius: "32px",
                padding: "60px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
                marginBottom: "40px",
                boxShadow: dark ? "0 40px 100px rgba(0,0,0,0.4)" : "0 20px 40px rgba(0,0,0,0.03)"
            }}>
                {/* Background Decor */}
                <div style={{ position: "absolute", top: "-50%", left: "-20%", width: "50%", height: "200%", background: `radial-gradient(circle, ${theme.accent}11 0%, transparent 70%)` }} />
                <div style={{ position: "absolute", bottom: "-50%", right: "-20%", width: "40%", height: "200%", background: `radial-gradient(circle, ${theme.accentSecondary}11 0%, transparent 70%)` }} />

                <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "32px" }}>
                        <div style={{ background: dark ? "rgba(255,255,255,0.05)" : "#f1f5f9", padding: "8px 16px", borderRadius: "100px", fontSize: "11px", fontWeight: 900, color: theme.accent, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", gap: "8px" }}>
                            <Sparkles size={12} /> NEURAL STRATEGY ENGINE
                        </div>
                        <div style={{ background: dark ? "rgba(16, 185, 129, 0.1)" : "#ecfdf5", padding: "8px 16px", borderRadius: "100px", fontSize: "11px", fontWeight: 900, color: "#10b981", border: `1px solid ${dark ? "#10b98133" : "#10b98133"}`, display: "flex", alignItems: "center", gap: "8px" }}>
                            <Activity size={12} /> {statAnalysis.active} ACTIVE NODES
                        </div>
                        <div style={{ background: dark ? "rgba(99, 102, 241, 0.1)" : "#eef2ff", padding: "8px 16px", borderRadius: "100px", fontSize: "11px", fontWeight: 900, color: theme.accent, border: `1px solid ${dark ? "#6366f133" : "#6366f133"}`, display: "flex", alignItems: "center", gap: "8px" }}>
                            <TrendingUp size={12} /> {statAnalysis.todayHits} LIVE HITS
                        </div>
                    </div>
                    <h1 style={{ fontSize: "48px", fontWeight: 1000, margin: "0 0 16px 0", letterSpacing: "-2px", lineHeight: 1 }}>Transform Your Vibe<br/>Into Revenue.</h1>
                    <p style={{ fontSize: "18px", color: theme.textMuted, maxWidth: "600px", margin: "0 auto 40px", fontWeight: 500 }}>Describe an emotion or goal, and our GPT-4o engine will architect a deployable promo strategy in seconds.</p>
                    
                    <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative" }}>
                        <textarea 
                            value={aiGoal}
                            onChange={(e) => setAiGoal(e.target.value)}
                            placeholder="e.g. 'I want to target students during late night hours with a 20% discount on wings'"
                            style={{
                                width: "100%",
                                height: "120px",
                                background: dark ? "#0a0a0c" : "#fff",
                                border: `2px solid ${aiGoal ? theme.accent : theme.border}`,
                                borderRadius: "24px",
                                padding: "24px 80px 24px 24px",
                                fontSize: "18px",
                                fontWeight: 600,
                                color: theme.text,
                                outline: "none",
                                resize: "none",
                                boxShadow: aiGoal ? `0 0 40px ${theme.accent}22` : "none",
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                fontFamily: "inherit"
                            }}
                        />
                        <button 
                            disabled={aiLoading || !aiGoal}
                            onClick={handleGenerateAi}
                            style={{
                                position: "absolute",
                                right: "16px",
                                bottom: "16px",
                                width: "54px",
                                height: "54px",
                                borderRadius: "18px",
                                background: theme.accent,
                                color: "#fff",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: `0 10px 20px ${theme.accent}44`,
                                transition: "all 0.2s"
                            }}
                        >
                            {aiLoading ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
                        </button>
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "10px", marginTop: "24px" }}>
                        {QUICK_IDEAS.map(idea => (
                            <button 
                                key={idea.label} 
                                onClick={() => setAiGoal(idea.label)} 
                                style={{ 
                                    background: aiGoal === idea.label ? theme.accent : "transparent",
                                    border: `1px solid ${aiGoal === idea.label ? theme.accent : theme.border}`,
                                    color: aiGoal === idea.label ? "#fff" : theme.text,
                                    padding: "10px 20px",
                                    borderRadius: "14px",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    transition: "all 0.2s"
                                }}
                            >
                                <span>{idea.icon}</span> {idea.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* RESULTS GRID (IF GENERATED) */}
            {(aiIdeas.length > 0 || aiLoading) && (
                <div style={{ marginBottom: "60px" }} id="results-view">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
                        <div>
                            <h2 style={{ fontSize: "28px", fontWeight: 950, margin: 0, letterSpacing: "-0.5px" }}>Generated Strategies</h2>
                            <p style={{ color: theme.textMuted, fontSize: "14px", marginTop: "4px" }}>Select the most efficient model for your current network load.</p>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, padding: "8px 16px", borderRadius: "12px", fontSize: "12px", fontWeight: 800 }}>
                                <Database size={12} style={{ marginRight: 8, color: theme.accentSecondary }} /> SYNCED
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
                        {aiLoading ? (
                             [1,2,3].map(i => (
                                <div key={i} style={{ height: "240px", background: theme.surface, borderRadius: "24px", border: `1px solid ${theme.border}` }} className="ra-shimmer" />
                             ))
                        ) : (
                            aiIdeas.map((idea, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => setEditingData({...idea, code: `STRAT-${Math.random().toString(36).substring(2,7).toUpperCase()}`})}
                                    className="strategy-card"
                                    style={{
                                        background: theme.surface,
                                        border: `1px solid ${theme.border}`,
                                        borderRadius: "24px",
                                        padding: "32px",
                                        cursor: "pointer",
                                        transition: "all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)",
                                        position: "relative",
                                        overflow: "hidden"
                                    }}
                                >
                                    <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: i % 2 === 0 ? theme.accent : theme.accentSecondary }} />
                                    
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                                        <div style={{ background: i % 2 === 0 ? "#6366f111" : "#10b98111", color: i % 2 === 0 ? theme.accent : theme.accentSecondary, padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 900 }}>
                                            {idea.type === 'free-delivery' ? 'FREE DELIVERY' : idea.type === 'percent' ? `${idea.value}% OFF` : `AED ${idea.value} OFF`}
                                        </div>
                                        <div style={{ fontSize: "12px", fontWeight: 900, color: "#10b981", display: "flex", alignItems: "center", gap: "4px" }}>
                                            <Activity size={12} /> {idea.impact}
                                        </div>
                                    </div>

                                    <h4 style={{ fontSize: "21px", fontWeight: 950, margin: "0 0 10px 0", letterSpacing: "-0.3px" }}>{idea.title}</h4>
                                    <p style={{ fontSize: "14px", color: theme.textMuted, lineHeight: 1.6, marginBottom: "24px", minHeight: "68px" }}>{idea.reason || idea.description}</p>
                                    
                                    <div style={{ display: "flex", gap: "8px", borderTop: `1px solid ${theme.border}`, paddingTop: "20px" }}>
                                        <div style={{ background: theme.bg, color: theme.textMuted, fontSize: "10px", fontWeight: 800, padding: "4px 10px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                                            <Target size={12} /> {idea.audience}
                                        </div>
                                        <div style={{ background: theme.bg, color: theme.textMuted, fontSize: "10px", fontWeight: 800, padding: "4px 10px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                                            <Clock size={12} /> {idea.timeText}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* LIVE DEPLOYMENTS */}
            <div style={{ marginTop: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
                    <div style={{ width: "40px", height: "1px", background: theme.border }} />
                    <h3 style={{ fontSize: "14px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "2px", opacity: 0.5 }}>Live Deployment Log</h3>
                    <div style={{ flex: 1, height: "1px", background: theme.border }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                    {promosLoading ? (
                        [1,2,3].map(i => <div key={i} style={{ height: "80px", borderRadius: "16px" }} className="ra-shimmer" />)
                    ) : activePromos.length === 0 ? (
                        <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px", border: `2px dashed ${theme.border}`, borderRadius: "24px" }}>
                            <Scan size={40} style={{ opacity: 0.1, marginBottom: "16px" }} />
                            <div style={{ fontWeight: 800, color: theme.textMuted }}>No active strategies detected</div>
                        </div>
                    ) : (
                        activePromos.map(p => (
                            <div key={p._id} style={{ background: theme.surface, border: `1px solid ${theme.border}`, padding: "16px 20px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                    <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: dark ? "rgba(255,255,255,0.03)" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Zap size={18} color={theme.accent} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "14px", fontWeight: 950 }}>{p.code}</div>
                                        {p.name && <div style={{ fontSize: "11px", color: theme.textMuted, fontWeight: 700 }}>{p.name.slice(0, 24)}{p.name.length > 24 ? "..." : ""}</div>}
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div style={{ textAlign: "right", marginRight: "12px" }}>
                                        <div style={{ fontSize: "13px", fontWeight: 1000, color: theme.accentSecondary }}>{p.usedCount || 0}</div>
                                        <div style={{ fontSize: "8px", fontWeight: 800, opacity: 0.5 }}>HITS</div>
                                    </div>
                                    <button 
                                        onClick={() => setDeleteConfirm({ isOpen: true, id: p._id })}
                                        style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", opacity: 0.6, padding: "8px", borderRadius: "8px", transition: "all 0.2s" }}
                                        onMouseOver={e => e.currentTarget.style.background = "#ef444411"}
                                        onMouseOut={e => e.currentTarget.style.background = "none"}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>

        {/* REFINEMENT MODAL */}
        {editingData && (
          <div style={overlayStyle}>
            <div style={{ 
                background: theme.surface, 
                width: "900px", 
                borderRadius: "32px", 
                overflow: "hidden", 
                display: "grid", 
                gridTemplateColumns: "1fr 400px",
                boxShadow: "0 50px 100px rgba(0,0,0,0.5)",
                animation: "modalIn 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)"
            }}>
                {/* Left: Configuration */}
                <div style={{ padding: "48px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
                        <h2 style={{ fontSize: "24px", fontWeight: 1000, margin: 0 }}>Strategy Refinement</h2>
                        <span style={{ fontSize: "11px", fontWeight: 900, background: theme.bg, padding: "4px 12px", borderRadius: "8px", border: `1px solid ${theme.border}` }}>UNIT: {editingData.code}</span>
                    </div>

                    <div style={{ display: "grid", gap: "24px" }}>
                        <div>
                            <label style={modalLabel}>CAMPAIGN IDENTITY</label>
                            <input value={editingData.title} onChange={e => setEditingData({...editingData, title: e.target.value})} style={modalInputStyle(theme, false)} />
                        </div>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                            <div>
                                <label style={modalLabel}>DISCOUNT ARCHITECTURE</label>
                                <select value={editingData.type} onChange={e => setEditingData({...editingData, type: e.target.value})} style={modalInputStyle(theme, true)}>
                                    <option value="percent">Percentage (%)</option>
                                    <option value="flat">Fixed (AED)</option>
                                    <option value="free-delivery">Free Delivery</option>
                                </select>
                            </div>
                             {editingData.type !== 'free-delivery' && (
                                <div>
                                    <label style={modalLabel}>INTENSITY VALUE</label>
                                    <input type="number" value={editingData.value} onChange={e => setEditingData({...editingData, value: e.target.value})} style={modalInputStyle(theme, false)} />
                                </div>
                             )}
                        </div>

                        <div>
                            <label style={modalLabel}>CAMPAIGN DESCRIPTION & LOGIC</label>
                            <textarea value={editingData.reason || editingData.description} onChange={e => setEditingData({...editingData, description: e.target.value})} style={{...modalInputStyle(theme, false), height: "100px", resize: "none"}} />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                            <div>
                                <label style={modalLabel}>TARGET AUDIENCE</label>
                                <div style={modalReadOnly(theme)}><Users size={14} style={{ opacity: 0.5 }} /> {editingData.audience}</div>
                            </div>
                            <div>
                                <label style={modalLabel}>DEPLOYMENT WINDOW</label>
                                <div style={modalReadOnly(theme)}><Clock size={14} style={{ opacity: 0.5 }} /> {editingData.timeText}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Visualization & Deploy */}
                <div style={{ background: dark ? "#0a0a0c" : "#f8fafc", padding: "48px", borderLeft: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ textAlign: "center", marginBottom: "32px" }}>
                            <div style={{ width: "64px", height: "64px", borderRadius: "20px", background: theme.accent, color: "white", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: `0 20px 40px ${theme.accent}33` }}>
                                <Zap size={32} />
                            </div>
                            <h3 style={{ fontSize: "18px", fontWeight: 1000, margin: 0 }}>Ready for Uplink</h3>
                            <p style={{ fontSize: "13px", color: theme.textMuted, marginTop: "6px" }}>The neural model is optimized for high conversion.</p>
                        </div>

                        <div style={{ background: theme.surface, borderRadius: "20px", padding: "20px", border: `1px solid ${theme.border}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "10px", fontWeight: 900, opacity: 0.5 }}>
                                <span>SIMULATED IMPACT</span>
                                <span>CONFIDENCE: 94%</span>
                            </div>
                            <div style={{ height: "4px", background: theme.bg, borderRadius: "2px", overflow: "hidden", marginBottom: "16px" }}>
                                <div style={{ height: "100%", background: theme.accentSecondary, width: "94%" }} />
                            </div>
                            <div style={{ fontSize: "12px", color: theme.accentSecondary, fontWeight: 800 }}>+ Strategy validated against historical data</div>
                            <div style={{ fontSize: "12px", color: theme.accentSecondary, fontWeight: 800, marginTop: "4px" }}>+ Optimal for {editingData.audience?.toLowerCase()}</div>
                        </div>
                    </div>

                    <div style={{ display: "grid", gap: "12px" }}>
                        <button 
                            disabled={isDeploying}
                            onClick={handleDeploy}
                            style={{ 
                                background: theme.accent, 
                                color: "#fff", 
                                border: "none", 
                                padding: "20px", 
                                borderRadius: "18px", 
                                fontWeight: 900, 
                                fontSize: "16px", 
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "12px",
                                boxShadow: `0 10px 30px ${theme.accent}44`
                            }}
                        >
                            {isDeploying ? <Loader2 size={20} className="animate-spin" /> : <Rocket size={20} />}
                            {isDeploying ? "DEPLOYING..." : "DEPLOY STRATEGY"}
                        </button>
                        <button 
                            onClick={() => setEditingData(null)}
                            style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.text, padding: "16px", borderRadius: "18px", fontWeight: 800, fontSize: "14px", cursor: "pointer" }}
                        >
                            Discard Model
                        </button>
                    </div>
                </div>
            </div>
          </div>
        )}

        <ConfirmationModal 
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          title="PURGE STRATEGY"
          message="Are you sure you want to terminate this active promotion? All linked customer nodes will lose access immediately."
          confirmText="TERMINATE"
        />

        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
            
            .strategy-card:hover {
                transform: translateY(-8px);
                border-color: #6366f1;
                box-shadow: 0 30px 60px rgba(0,0,0,0.1) !important;
            }
            [data-theme="dark"] .strategy-card:hover {
                box-shadow: 0 40px 80px rgba(0,0,0,0.4) !important;
            }

            .animate-spin { animation: spin 1s linear infinite; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

            @keyframes modalIn {
                from { opacity: 0; transform: scale(0.9) translateY(40px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }

            .status-pulse {
                animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
            }

            @keyframes pulse-ring {
                0% { transform: scale(0.33); }
                80%, 100% { opacity: 0; }
            }

            .ra-shimmer {
                background: linear-gradient(90deg, transparent 25%, ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)"} 50%, transparent 75%);
                background-size: 800px 100%;
                animation: shimmer 2s infinite linear;
            }
            @keyframes shimmer { 0% { background-position: -468px 0 } 100% { background-position: 468px 0 } }
        `}</style>
      </div>
    </RestaurantLayout>
  );
}

const modalLabel = {
    fontSize: "10px",
    fontWeight: 900,
    color: "#94a3b8",
    letterSpacing: "1.5px",
    marginBottom: "10px",
    display: "block",
    textTransform: "uppercase"
};

const modalInputStyle = (theme, isSelect) => ({
    width: "100%",
    background: theme.bg,
    border: `1px solid ${theme.border}`,
    borderRadius: "14px",
    padding: "16px",
    color: theme.text,
    fontSize: "15px",
    fontWeight: 600,
    outline: "none",
    fontFamily: "inherit",
    appearance: isSelect ? "none" : "auto",
});

const modalReadOnly = (theme) => ({
    width: "100%",
    background: theme.bg,
    border: `1px solid ${theme.border}`,
    borderRadius: "14px",
    padding: "16px",
    color: theme.textMuted,
    fontSize: "14px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    opacity: 0.8
});

const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.8)",
    backdropFilter: "blur(12px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "40px"
};