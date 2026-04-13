import { useEffect, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, BrainCircuit, Lightbulb, Zap, Loader2 } from "lucide-react";

const quickGoals = [
  "Weekend family bundle",
  "Lunch rush boost",
  "Win back inactive customers",
  "Increase average basket size",
];

export default function Promos() {
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [aiGoal, setAiGoal] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiIdeas, setAiIdeas] = useState([]);
  const [aiHeadline, setAiHeadline] = useState("AI promo suggestions");
  const [isPhone, setIsPhone] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const onChange = (event) => setIsPhone(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const textPrimary = dark ? "#f8fafc" : "#1e293b";
  const textSecondary = dark ? "rgba(248,250,252,0.6)" : "#64748b";
  const cardBg = dark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const borderColor = dark ? "rgba(255,255,255,0.08)" : "#e2e8f0";

  const handleGenerateAi = async () => {
    setAiLoading(true);
    try {
      const res = await api.post("/api/promo/ai-suggest", { goal: aiGoal });
      if (res.data.success) {
        setAiIdeas(res.data.data?.suggestions || []);
        setAiHeadline(res.data.data?.headline || "AI Campaign Suggestions");
      }
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApply = (idea) => {
    // Navigate to Coupons page with the AI data pre-filled
    // We'll pass it via state so Coupons.jsx can handle it
    navigate("/coupons", { state: { aiSuggestion: idea } });
  };

  return (
    <RestaurantLayout>
      <div style={{ padding: "40px 32px", maxWidth: "1200px", margin: "0 auto", minHeight: "100vh" }}>
        
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "8px", 
            padding: "8px 16px", 
            borderRadius: "999px", 
            background: "rgba(255,90,54,0.1)", 
            color: "var(--orange)", 
            fontSize: "13px", 
            fontWeight: 800,
            marginBottom: "16px"
          }}>
            <Sparkles size={16} /> AI Creative Lab
          </div>
          <h1 style={{ fontSize: "40px", fontWeight: 900, color: textPrimary, letterSpacing: "-1.5px", margin: 0 }}>Smart Promo Generator</h1>
          <p style={{ color: textSecondary, fontSize: "18px", marginTop: "12px", maxWidth: "600px", marginInline: "auto", lineHeight: 1.6 }}>
            Tell Crave AI your business goal, and it will analyze your menu and historical data to generate the perfect campaign.
          </p>
        </div>

        {/* Input Box */}
        <div style={{ 
          background: cardBg, 
          borderRadius: "32px", 
          border: `1px solid ${borderColor}`, 
          padding: "32px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.08)",
          marginBottom: "40px"
        }}>
          <div style={{ position: "relative" }}>
            <BrainCircuit size={24} style={{ position: "absolute", left: "20px", top: "24px", color: "var(--orange)" }} />
            <textarea
              value={aiGoal}
              onChange={(e) => setAiGoal(e.target.value)}
              placeholder="e.g. I want to increase my average order value during the weekend lunch rush..."
              style={{
                width: "100%",
                minHeight: "120px",
                padding: "24px 24px 24px 60px",
                borderRadius: "20px",
                border: `2px solid ${borderColor}`,
                background: dark ? "rgba(0,0,0,0.2)" : "#f8fafc",
                color: textPrimary,
                fontSize: "16px",
                fontWeight: 600,
                outline: "none",
                display: "block",
                boxSizing: "border-box",
                fontFamily: "inherit",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--orange)"}
              onBlur={(e) => e.target.style.borderColor = borderColor}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {quickGoals.map(goal => (
                <button 
                  key={goal}
                  onClick={() => setAiGoal(goal)}
                  style={{ padding: "8px 16px", borderRadius: "10px", border: `1px solid ${borderColor}`, background: "none", color: textSecondary, fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                >
                  {goal}
                </button>
              ))}
            </div>
            <button 
              disabled={aiLoading || !aiGoal}
              onClick={handleGenerateAi}
              style={{ 
                padding: "16px 32px", 
                borderRadius: "16px", 
                border: "none", 
                background: "var(--orange)", 
                color: "white", 
                fontWeight: 900, 
                fontSize: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                boxShadow: "0 10px 25px rgba(255,90,54,0.3)",
                opacity: aiLoading || !aiGoal ? 0.6 : 1
              }}
            >
              {aiLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
              {aiLoading ? "AI is thinking..." : "Generate Ideas"}
            </button>
          </div>
        </div>

        {/* Results */}
        {aiIdeas.length > 0 && (
          <div className="fade-in">
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
               <Lightbulb color="#f59e0b" fill="#f59e0b" size={24} />
               <h2 style={{ fontSize: "24px", fontWeight: 900, color: textPrimary, margin: 0 }}>{aiHeadline}</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }}>
               {aiIdeas.map((idea, idx) => (
                 <div key={idx} style={{ 
                   background: cardBg, 
                   borderRadius: "28px", 
                   border: `1px solid ${borderColor}`, 
                   padding: "24px",
                   transition: "transform 0.2s, box-shadow 0.2s",
                   cursor: "default"
                 }}
                 onMouseEnter={(e) => {
                   e.currentTarget.style.transform = "translateY(-4px)";
                   e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.06)";
                 }}
                 onMouseLeave={(e) => {
                   e.currentTarget.style.transform = "translateY(0)";
                   e.currentTarget.style.boxShadow = "none";
                 }}
                 >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                       <div style={{ padding: "6px 14px", borderRadius: "10px", background: "rgba(16,185,129,0.1)", color: "#10b981", fontSize: "14px", fontWeight: 800 }}>
                          {idea.type === "percent" ? `${idea.value}% Off` : `AED ${idea.value} Off`}
                       </div>
                       <Zap size={20} color="#f59e0b" />
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 950, color: textPrimary, marginBottom: "8px", fontFamily: "monospace" }}>{idea.code}</div>
                    <p style={{ color: textSecondary, fontSize: "14px", lineHeight: 1.5, minHeight: "42px", marginBottom: "20px" }}>{idea.reason}</p>
                    <div style={{ paddingTop: "20px", borderTop: `1px solid ${borderColor}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                       <div style={{ fontSize: "12px", color: textSecondary, fontWeight: 700 }}>
                          Min Order: <span style={{ color: textPrimary }}>AED {idea.minOrder}</span>
                       </div>
                       <button 
                        onClick={() => handleApply(idea)}
                        style={{ background: "none", border: "none", color: "var(--orange)", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                       >
                          Manage in Coupons <ArrowRight size={14} />
                       </button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}