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
  Edit2,
  Clock,
  Users,
  Tag,
  RefreshCw,
  Rocket
} from "lucide-react";
import { toast } from "react-toastify";

const QUICK_IDEAS = [
  "Night Cravings",
  "Weekend Rush",
  "Lunch Boost",
  "Clear Inventory",
  "High-Value Upsell"
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

  // Elite SaaS Theme
  const theme = {
    bg: dark ? "#020202" : "#f8fafc",
    surface: dark ? "#0a0a0c" : "#ffffff",
    cardGlass: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    accent: "#10b981", 
    accentGradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    border: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
    text: dark ? "#ffffff" : "#0f172a",
    textMuted: dark ? "rgba(255,255,255,0.6)" : "#64748b",
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
        // Map the strategies to include consistent tags and impact if missing
        const suggestions = (res.data.data?.suggestions || []).map(s => ({
            ...s,
            impact: s.estimatedImpact?.orders || "+24% Orders",
            audience: s.tags?.audience || "All Customers",
            timeText: s.tags?.time || "Limited Time"
        }));
        setAiIdeas(suggestions);
      }
    } catch (err) {
      toast.error("Neural uplink failed.");
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
        toast.success("Strategy Authenticated and Live!");
        setAiIdeas([]);
        setEditingData(null);
        fetchActivePromos();
      }
    } catch (err) {
      toast.error("Deployment failure.");
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/api/promo/${id}`);
      if (res.data?.success) {
        toast.success("Segment Purged.");
        fetchActivePromos();
      }
    } catch (err) {
      toast.error("Purge failure.");
    }
  };

  return (
    <RestaurantLayout>
      <div style={{ background: theme.bg, color: theme.text, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ padding: "40px" }}>
            
            {/* HERO DASHBOARD - THE PERFORMANCE RIBBON */}
            <div style={{ 
                background: "linear-gradient(135deg, #1e293b 0%, #334155 50%, #ea580c 100%)",
                borderRadius: "28px",
                padding: "36px 48px",
                marginBottom: "48px",
                boxShadow: "0 25px 70px rgba(0,0,0,0.2)",
                color: "white"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <div style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", padding: "8px 16px", borderRadius: "100px", display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 800 }}>
                        <Cpu size={12} color="#10b981" /> AI Promo Lab
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <IconButton icon={<Bell size={16} />} />
                        <IconButton icon={<TrendingUp size={16} />} label="Stats" />
                        <IconButton icon={<Plus size={16} />} label="Quick Setup" primary />
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "24px" }}>
                    <div style={{ flexShrink: 0 }}>
                        <h1 style={{ fontSize: "32px", fontWeight: 1000, margin: "0", letterSpacing: "-1.5px" }}>AI Promo Lab</h1>
                        <p style={{ fontSize: "13px", opacity: 0.7, fontWeight: 500, margin: "6px 0 0 0" }}>
                            {statAnalysis.active} Active Arrays • AED {statAnalysis.revenue} Yield Impact Today
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <DashboardCard label="ACTIVE" value={statAnalysis.active} icon={<Layers color="#10b981" size={12} />} />
                        <DashboardCard label="PENDING" value={aiIdeas.length} icon={<Orbit color="#3b82f6" size={12} />} />
                        <DashboardCard label="IMPACT" value={`+${statAnalysis.todayHits}%`} icon={<TrendingUp color="#f59e0b" size={12} />} />
                        <DashboardCard label="LOAD" value="98%" icon={<Zap color="#ef4444" size={12} />} />
                    </div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "40px", alignItems: "start" }}>
                
                {/* LEFT: CREATE PROMO IDEA */}
                <section style={{ 
                    background: theme.surface, 
                    borderRadius: "24px", 
                    padding: "36px", 
                    border: `1px solid ${theme.border}`,
                    position: "sticky",
                    top: "40px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.02)"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: theme.accentDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <BrainCircuit size={20} color={theme.accent} />
                        </div>
                        <h3 style={{ fontSize: "20px", fontWeight: 900, margin: 0 }}>Create Promo Idea</h3>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                        <div>
                            <textarea 
                                value={aiGoal}
                                onChange={(e) => setAiGoal(e.target.value)}
                                placeholder="Describe your promo idea... (e.g. Night cravings, late-night deals, weekend rush)"
                                style={{
                                    width: "100%",
                                    height: "140px",
                                    background: theme.bg,
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: "16px",
                                    padding: "20px",
                                    color: theme.text,
                                    fontSize: "15px",
                                    fontWeight: 500,
                                    outline: "none",
                                    resize: "none",
                                    lineHeight: 1.5,
                                    fontFamily: "inherit"
                                }}
                            />
                        </div>

                        <div>
                            <div style={{ fontSize: "11px", fontWeight: 800, color: theme.textMuted, marginBottom: "12px", letterSpacing: "1px", textTransform: "uppercase" }}>Quick Ideas</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {QUICK_IDEAS.map(node => (
                                    <button key={node} onClick={() => setAiGoal(node)} style={nodeStyle(theme, aiGoal === node)}>{node}</button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: "12px" }}>
                            <button 
                                disabled={aiLoading || !aiGoal}
                                onClick={handleGenerateAi}
                                style={{
                                    width: "100%",
                                    padding: "20px",
                                    borderRadius: "16px",
                                    background: theme.accentGradient,
                                    color: "#fff",
                                    fontWeight: 900,
                                    fontSize: "16px",
                                    border: "none",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "12px",
                                    boxShadow: `0 10px 30px ${theme.accent}44`,
                                    transition: "all 0.2s"
                                }}
                            >
                                {aiLoading ? <Loader2 size={20} className="animate-spin" /> : <Rocket size={20} />}
                                {aiLoading ? "Generating..." : "Generate Promo Ideas"}
                            </button>
                            <div style={{ fontSize: "11px", color: theme.textMuted, textAlign: "center", marginTop: "12px", fontWeight: 600 }}>
                                Powered by AI (Groq)
                            </div>
                        </div>
                    </div>
                </section>

                {/* RIGHT: AI GENERATED PROMO IDEAS */}
                <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
                    
                    <section>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                            <h2 style={{ fontSize: "22px", fontWeight: 900, display: "flex", alignItems: "center", gap: "12px" }}>
                                <Atom size={20} color={theme.accent} /> AI Generated Promo Ideas
                            </h2>
                            {aiIdeas.length > 0 && (
                                <button onClick={handleGenerateAi} style={{ background: "none", border: "none", color: theme.accent, display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
                                    <RefreshCw size={14} /> Regenerate Ideas
                                </button>
                            )}
                        </div>
                        
                        {aiLoading ? (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
                               <div style={{ padding: "40px", textAlign: "center", background: theme.surface, borderRadius: "24px", border: `2px dashed ${theme.border}` }}>
                                    <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 16px", color: theme.accent }} />
                                    <div style={{ fontWeight: 700, fontSize: "18px" }}>Generating promo strategies using AI...</div>
                               </div>
                               {[1, 2].map(i => <div key={i} style={{ height: "160px", background: theme.surface, borderRadius: "24px" }} className="ra-shimmer" />)}
                            </div>
                        ) : aiIdeas.length > 0 ? (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }} className="fade-in">
                                {aiIdeas.map((idea, i) => (
                                    <div key={i} onClick={() => setEditingData({...idea, code: `AI-${Math.random().toString(36).substring(2,7).toUpperCase()}`})} style={blueprintCardStyle(theme, i)} onMouseEnter={lift} onMouseLeave={drop}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                                            <div style={{ background: theme.accentDim, color: theme.accent, padding: "6px 14px", borderRadius: "100px", fontSize: "13px", fontWeight: 900 }}>
                                                {idea.type === 'percent' ? `${idea.value}%` : `AED ${idea.value}`} OFF
                                            </div>
                                            <div style={{ color: "#10b981", fontSize: "13px", fontWeight: 900, display: "flex", alignItems: "center", gap: "4px" }}>
                                                <TrendingUp size={14} /> {idea.impact}
                                            </div>
                                        </div>
                                        <h4 style={{ fontSize: "20px", fontWeight: 900, margin: "0 0 10px 0" }}>{idea.title}</h4>
                                        <p style={{ fontSize: "14px", color: theme.textMuted, lineHeight: 1.5, marginBottom: "24px", minHeight: "63px" }}>{idea.reason || idea.description}</p>
                                        
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", paddingTop: "20px", borderTop: `1px solid ${theme.border}` }}>
                                            <div style={tagStyle(theme)}><Users size={12} /> {idea.audience}</div>
                                            <div style={tagStyle(theme)}><Clock size={12} /> {idea.timeText}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={emptyStateStyle(theme)}>
                                <Orbit size={64} style={{ opacity: 0.1, marginBottom: "24px" }} />
                                <div style={{ fontWeight: 800, fontSize: "20px", opacity: 0.8, marginBottom: "8px" }}>Your smart AI marketing assistant is ready</div>
                                <div style={{ fontSize: "15px", opacity: 0.5, maxWidth: "400px", textAlign: "center" }}>Describe a campaign goal on the left to instantly build data-driven promotions.</div>
                            </div>
                        )}
                    </section>

                    {/* ACTIVE LIST SECTION */}
                    <section>
                        <h2 style={{ fontSize: "20px", fontWeight: 900, marginBottom: "32px", display: "flex", alignItems: "center", gap: "12px" }}>
                            <Activity size={20} color={theme.accent} /> Active Deployments
                        </h2>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "16px" }}>
                            {activePromos.map(p => (
                                <div key={p._id} style={activeRecordStyle(theme)}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                                        <div style={activeIconStyle(theme)}><Rocket size={20} color={theme.accent} /></div>
                                        <div>
                                            <div style={{ fontSize: "16px", fontWeight: 900 }}>{p.code}</div>
                                            <div style={{ fontSize: "13px", color: theme.textMuted, fontWeight: 500 }}>{p.name}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ fontSize: "15px", fontWeight: 900, color: theme.accent }}>{p.usedCount || 0} hits</div>
                                        </div>
                                        <button onClick={() => setDeleteConfirm({ isOpen: true, id: p._id })} style={deleteButtonStyle(theme)}><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>

        {/* EDIT MODE (REFINED COMPACT CARD MODAL) */}
        {editingData && (
          <div style={{...overlayStyle, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(20px)"}}>
            <div style={{...modalStyle(theme), padding: 0, width: "720px", overflow: "hidden", display: "grid", gridTemplateColumns: "260px 1fr"}} className="scale-in">
              
              {/* Left: Preview Card Section */}
              <div style={{ 
                background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)", 
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                borderRight: `1px solid ${theme.border}`
              }}>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 800, color: theme.accent, letterSpacing: "2px", marginBottom: "16px", opacity: 0.8 }}>PREVIEW</div>
                  <div style={{ 
                    background: "rgba(255,255,255,0.03)", 
                    borderRadius: "16px", 
                    padding: "20px", 
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 15px 30px rgba(0,0,0,0.3)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                       <div style={{ background: theme.accent, color: "#000", padding: "4px 8px", borderRadius: "4px", fontSize: "9px", fontWeight: 900 }}>
                         {editingData.type === 'percent' ? `${editingData.value}%` : `AED ${editingData.value}`} OFF
                       </div>
                       <Sparkles size={12} color={theme.accent} />
                    </div>
                    <h3 style={{ fontSize: "16px", fontWeight: 900, marginBottom: "6px", color: "#fff", lineHeight: 1.2 }}>{editingData.title}</h3>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: "16px" }}>{editingData.description?.slice(0, 60)}...</p>
                    
                    <div style={{ display: "flex", gap: "6px" }}>
                       <div style={{ background: "rgba(255,255,255,0.05)", padding: "3px 6px", borderRadius: "4px", fontSize: "8px", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: "4px" }}>
                         <Users size={8} /> {editingData.audience}
                       </div>
                    </div>
                  </div>
                </div>
                <div style={{ opacity: 0.3, fontSize: "9px", textAlign: "center", fontWeight: 700 }}>AI ARCHITECT</div>
              </div>

              {/* Right: Form Section */}
              <div style={{ padding: "32px 40px", background: theme.surface }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
                  <h2 style={{ fontSize: "18px", fontWeight: 900 }}>Refine Strategy</h2>
                  <X size={20} onClick={() => setEditingData(null)} style={{ cursor: "pointer", opacity: 0.5 }} />
                </div>

                <div style={{ display: "grid", gap: "16px", marginBottom: "32px" }}>
                    <div>
                        <label style={modalLabel}>STRATEGIC TITLE</label>
                        <input value={editingData.title} onChange={e => setEditingData({...editingData, title: e.target.value})} style={{...modalInputStyle(theme), padding: "12px"}} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                            <label style={modalLabel}>TYPE</label>
                            <select value={editingData.type} onChange={e => setEditingData({...editingData, type: e.target.value})} style={{...modalInputStyle(theme), padding: "12px"}}>
                                <option value="percent">Percentage (%)</option>
                                <option value="fixed">Flat (AED)</option>
                            </select>
                        </div>
                        <div>
                            <label style={modalLabel}>VALUE</label>
                            <input type="number" value={editingData.value} onChange={e => setEditingData({...editingData, value: e.target.value})} style={{...modalInputStyle(theme), padding: "12px"}} />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                            <label style={modalLabel}>WINDOW</label>
                            <input value={editingData.timeText} onChange={e => setEditingData({...editingData, timeText: e.target.value})} style={{...modalInputStyle(theme), padding: "12px"}} />
                        </div>
                        <div>
                            <label style={modalLabel}>TARGET</label>
                            <input value={editingData.audience} onChange={e => setEditingData({...editingData, audience: e.target.value})} style={{...modalInputStyle(theme), padding: "12px"}} />
                        </div>
                    </div>

                    <div>
                        <label style={modalLabel}>DESCRIPTION</label>
                        <textarea value={editingData.reason || editingData.description} onChange={e => setEditingData({...editingData, description: e.target.value})} style={{...modalInputStyle(theme), height: "60px", resize: "none", padding: "12px"}} />
                    </div>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                   <button onClick={() => setEditingData(null)} style={{ flex: 1, padding: "12px", borderRadius: "10px", background: "none", border: `1px solid ${theme.border}`, color: theme.text, fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>Cancel</button>
                   <button disabled={isDeploying} onClick={handleDeploy} style={{ flex: 2, padding: "12px", borderRadius: "10px", background: theme.accent, color: "#000", fontWeight: 900, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "14px" }}>
                     {isDeploying ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                     Deploy
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
          title="Purge Strategy?"
          message="This action will permanently remove this promotion from your active deployments."
          confirmText="Yes, Purge"
        />

      </div>

      <style>{`
        .fade-in { animation: fadeIn 0.5s ease-out; }
        .scale-in { animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ra-shimmer {
          background: linear-gradient(90deg, transparent 25%, ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)"} 50%, transparent 75%);
          background-size: 800px 100%;
          animation: shimmer 2s infinite linear;
        }
        @keyframes shimmer { 0% { background-position: -468px 0 } 100% { background-position: 468px 0 } }
      `}</style>
    </RestaurantLayout>
  );
}

/* SUBCOMPONENTS & STYLES */

function IconButton({ icon, label, primary }) {
    return (
        <button style={{
            background: primary ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.1)",
            color: primary ? "#000" : "#fff",
            border: "none",
            borderRadius: "100px",
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            backdropFilter: "blur(10px)"
        }}>
            {icon} {label}
        </button>
    );
}

function DashboardCard({ label, value, icon }) {
    return (
        <div style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            borderRadius: "16px",
            padding: "16px 22px",
            border: "1px solid rgba(255,255,255,0.1)",
            minWidth: "150px"
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", fontWeight: 900, opacity: 0.6, letterSpacing: "1px", marginBottom: "8px", textTransform: "uppercase" }}>
               {icon} {label}
            </div>
            <div style={{ fontSize: "22px", fontWeight: 1000 }}>{value}</div>
        </div>
    );
}

const nodeStyle = (theme, active) => ({
    background: active ? theme.accent : theme.accentDim,
    border: `1px solid ${active ? theme.accent : theme.border}`,
    color: active ? "#000" : theme.accent,
    padding: "8px 18px",
    borderRadius: "100px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s"
});

const blueprintCardStyle = (theme, i) => {
    const colors = [
        "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0) 100%)",
        "linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0) 100%)",
        "linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(245, 158, 11, 0) 100%)"
    ];
    return {
        background: theme.surface,
        backgroundImage: colors[i % 3],
        padding: "32px",
        borderRadius: "24px",
        border: `1.5px solid ${theme.border}`,
        cursor: "pointer",
        transition: "all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)",
        position: "relative",
        overflow: "hidden"
    };
};

const tagStyle = (theme) => ({
    background: theme.bg,
    border: `1px solid ${theme.border}`,
    color: theme.textMuted,
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "6px"
});

const activeRecordStyle = (theme) => ({
    background: theme.surface,
    borderRadius: "16px",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    border: `1px solid ${theme.border}`
});

const activeIconStyle = (theme) => ({
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: theme.accentDim,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
});

const deleteButtonStyle = (theme) => ({
    background: "rgba(244,63,94,0.1)",
    border: "none",
    color: "#f43f5e",
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
});

const overlayStyle = {
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
    zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"
};

const modalStyle = (theme) => ({
    background: theme.surface, borderRadius: "24px", 
    border: `1px solid ${theme.border}`, boxShadow: `0 30px 80px rgba(0,0,0,0.5)`
});

const modalLabel = { display: "block", fontSize: "11px", fontWeight: 900, opacity: 0.5, marginBottom: "10px", letterSpacing: "1px" };

const modalInputStyle = (theme) => ({
    width: "100%",
    padding: "16px",
    borderRadius: "14px",
    background: theme.bg,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    outline: "none",
    fontSize: "15px",
    fontWeight: 600,
    fontFamily: "inherit"
});

const lift = e => { e.currentTarget.style.transform = "translateY(-10px)"; e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.boxShadow = "0 30px 60px rgba(0,0,0,0.1)"; };
const drop = e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)"; e.currentTarget.style.boxShadow = "none"; };
const emptyStateStyle = (theme) => ({
    height: "400px", border: `2px dashed ${theme.border}`, borderRadius: "28px",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    color: theme.text, padding: "40px"
});