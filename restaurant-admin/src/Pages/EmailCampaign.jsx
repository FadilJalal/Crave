import { useEffect, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import ConfirmationModal from "../components/ConfirmationModal";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import { Sparkles, Loader2, Send, History, PenLine, Megaphone } from "lucide-react";

const TYPES = [
  { key: "offer", label: "Special Offer", color: "#ff4e2a", desc: "Discount or limited-time deal" },
  { key: "menu", label: "New Menu Item", color: "#8b5cf6", desc: "Announce a new dish" },
  { key: "general", label: "General Update", color: "#111827", desc: "News, hours, announcement" },
];

const TEMPLATES = {
  offer: { subject: "🔥 Exclusive offer just for you!", heading: "Special deal this week", body: "We're offering an exclusive discount for our loyal customers.\n\nUse code SAVE20 to get 20% off your next order. Valid this week only!", ctaText: "Order Now", ctaUrl: "" },
  menu: { subject: "✨ New item on our menu!", heading: "Something delicious is here", body: "We're excited to announce a brand new addition to our menu!\n\nCome try it out and let us know what you think.", ctaText: "See Our Menu", ctaUrl: "" },
  general: { subject: "An update from us", heading: "Important update", body: "We wanted to share some news with our valued customers.\n\nThank you for your continued support!", ctaText: "", ctaUrl: "" },
};

const STATUS_BADGE = {
  sent: { bg: "#f0fdf4", color: "#15803d", label: "Sent" },
  scheduled: { bg: "#eff6ff", color: "#1d4ed8", label: "Scheduled" },
  failed: { bg: "#fef2f2", color: "#dc2626", label: "Failed" },
};

const TYPE_COLOR = { offer: "#ff4e2a", menu: "#8b5cf6", general: "#111827" };

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function EmailCampaign() {
  const { dark } = useTheme();

  let restaurantInfo = null;
  try { restaurantInfo = JSON.parse(localStorage.getItem("restaurantInfo")); } catch { }
  const restaurantName = restaurantInfo?.name || "Your Restaurant";

  const [tab, setTab] = useState("compose");
  const [customerCount, setCustomerCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const [upgradeMsg, setUpgradeMsg] = useState("");

  const [type, setType] = useState("offer");
  const [subject, setSubject] = useState(TEMPLATES.offer.subject);
  const [heading, setHeading] = useState(TEMPLATES.offer.heading);
  const [body, setBody] = useState(TEMPLATES.offer.body);
  const [ctaText, setCtaText] = useState(TEMPLATES.offer.ctaText);
  const [ctaUrl, setCtaUrl] = useState(TEMPLATES.offer.ctaUrl);
  const [personalize, setPersonalize] = useState(true);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  // Custom Modal State
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", confirmText: "", onConfirm: () => { } });

  useEffect(() => {
    api.get("/api/email-campaign/customers")
      .then(res => {
        if (res.data.success) setCustomerCount(res.data.count);
        else { setHasAccess(false); setUpgradeMsg(res.data.message); }
      })
      .catch(() => setHasAccess(false))
      .finally(() => setLoadingCount(false));
  }, []);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get("/api/email-campaign/history");
      if (res.data.success) setHistory(res.data.campaigns);
    } catch { }
    finally { setLoadingHistory(false); }
  };

  const applyTemplate = (t) => {
    setType(t);
    const tmpl = TEMPLATES[t];
    setSubject(tmpl.subject); setHeading(tmpl.heading);
    setBody(tmpl.body); setCtaText(tmpl.ctaText); setCtaUrl(tmpl.ctaUrl);
  };

  const executeSend = async () => {
    setSending(true); setResult(null);
    try {
      const res = await api.post("/api/email-campaign/send", {
        subject, heading, body, ctaText, ctaUrl, type, personalize,
        scheduledAt: scheduleMode ? scheduledAt : null,
      });
      setResult({ success: res.data.success, message: res.data.message });
      if (res.data.success && scheduleMode) { setScheduleMode(false); setScheduledAt(""); }
    } catch {
      setResult({ success: false, message: "Failed to send campaign." });
    } finally { setSending(false); setModal({ ...modal, isOpen: false }); }
  };

  const handleSend = () => {
    if (!subject || !heading || !body) return;
    const label = scheduleMode ? `Schedule for ${new Date(scheduledAt).toLocaleString("en-AE")}` : `Send to ${customerCount} customer${customerCount !== 1 ? "s" : ""}`;
    setModal({
      isOpen: true,
      title: "Launch Campaign?",
      message: `${label}. Are you sure you want to broadcast this message?`,
      confirmText: scheduleMode ? "Schedule" : "Send Now",
      onConfirm: executeSend
    });
  };

  const executeDelete = async (id) => {
    await api.delete(`/api/email-campaign/history/${id}`);
    setHistory(h => h.filter(c => c._id !== id));
    setModal({ ...modal, isOpen: false });
  };

  const handleDelete = (id) => {
    setModal({
      isOpen: true,
      title: "Delete Campaign?",
      message: "This will permanently remove the record of this campaign from your history.",
      confirmText: "Delete",
      onConfirm: () => executeDelete(id)
    });
  };

  const generateWithAI = async () => {
    if (aiGenerating) return;
    setAiGenerating(true);
    try {
      const res = await api.post("/api/ai/restaurant/generate-campaign-ai", {
        type,
        description: aiPrompt,
        tone: "premium and inviting"
      });
      if (res.data.success) {
        setSubject(res.data.subject);
        setHeading(res.data.heading);
        setBody(res.data.body);
        setAiPrompt("");
      }
    } catch {
      alert("AI Generation failed.");
    } finally {
      setAiGenerating(false);
    }
  };


  const accentColor = TYPES.find(t => t.key === type)?.color || "#111827";
  const textPrimary = dark ? "#f8fafc" : "#111827";
  const textSecondary = dark ? "rgba(248,250,252,0.6)" : "#64748b";
  const cardBg = dark ? "rgba(15,23,42,0.6)" : "white";
  const cardBorder = dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0";
  const inp = { width: "100%", padding: "12px 14px", borderRadius: 12, border: dark ? "1px solid rgba(255,255,255,0.1)" : "1.5px solid #e5e7eb", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: dark ? "rgba(255,255,255,0.03)" : "white", color: textPrimary, transition: "border-color 0.2s" };
  const lbl = { fontSize: 11, fontWeight: 800, color: textSecondary, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };

  if (!loadingCount && !hasAccess) {
    return (
      <RestaurantLayout>
        <div style={{ maxWidth: 640, margin: "0 auto", background: "#ffffff", border: "1px solid #eceaf5", borderRadius: 26, padding: 26, boxShadow: "0 14px 36px rgba(17,24,39,0.08)" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 900, color: "#111827" }}>Email Campaigns</h2>
          <p style={{ margin: "0 0 22px", fontSize: 14, color: "#9ca3af" }}>Send emails to your customers</p>
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              background: "linear-gradient(135deg, #f5f3ff 0%, #efe7ff 45%, #ffe5f6 100%)",
              border: "1px solid #8b5cf633",
              borderRadius: 24,
              padding: 34,
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(139, 92, 246, 0.14)",
              backdropFilter: "blur(6px)",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: -36,
                right: -24,
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0) 70%)",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                bottom: -48,
                left: -28,
                width: 140,
                height: 140,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(236,72,153,0.28) 0%, rgba(236,72,153,0) 70%)",
              }}
            />

            <div style={{ fontSize: 42, marginBottom: 12, marginTop: 4, filter: "drop-shadow(0 6px 16px rgba(139,92,246,0.35))" }}>💜</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: "#111827", marginBottom: 10, letterSpacing: "-0.3px" }}>Enterprise Feature</div>
            <div style={{ fontSize: 15, color: "#4b5563", marginBottom: 26, lineHeight: 1.6, maxWidth: 430, marginInline: "auto" }}>
              {upgradeMsg || "Email campaigns are available only on the Enterprise plan."}<br />
              Reach all your customers with offers, new menu items, and announcements.
            </div>
            <a
              href="/subscription"
              style={{
                display: "inline-block",
                padding: "13px 30px",
                borderRadius: 14,
                background: "linear-gradient(90deg, #7c3aed 0%, #8b5cf6 55%, #ec4899 100%)",
                color: "white",
                fontWeight: 900,
                fontSize: 15,
                textDecoration: "none",
                boxShadow: "0 10px 24px rgba(139, 92, 246, 0.35)",
              }}
            >
              View Enterprise Plan &rarr;
            </a>
          </div>
        </div>
      </RestaurantLayout>
    );
  }

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 860 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: textPrimary, letterSpacing: "-0.6px" }}>Email Campaigns</h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: textSecondary }}>
              {loadingCount ? "Loading..." : `${customerCount} customer${customerCount !== 1 ? "s" : ""} in your list`}
            </p>
          </div>
          <span style={{ background: dark ? "rgba(139,92,246,0.16)" : "#f5f3ff", color: "#8b5cf6", fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 999, border: dark ? "1px solid rgba(139,92,246,0.3)" : "none" }}>EMAIL CAMPAIGNS</span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
          {[
            { id: "compose", label: "Marketing Composer", icon: <PenLine size={16} /> },
            { id: "history", label: "Campaign History", icon: <History size={16} /> }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 20px",
                borderRadius: 14,
                border: "none",
                background: tab === t.id ? (dark ? "rgba(139,92,246,0.15)" : "#f5f3ff") : "transparent",
                fontWeight: 900,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: tab === t.id ? "#8b5cf6" : textSecondary,
                transition: "all 0.2s"
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Result banner */}
        {result && (
          <div style={{ background: result.success ? "#f0fdf4" : "#fef2f2", border: `1px solid ${result.success ? "#bbf7d0" : "#fecaca"}`, color: result.success ? "#15803d" : "#dc2626", borderRadius: 12, padding: "12px 18px", marginBottom: 20, fontSize: 14, fontWeight: 700 }}>
            {result.success ? "✅" : "❌"} {result.message}
          </div>
        )}

        {/* ── COMPOSE TAB ── */}
        {tab === "compose" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Strategy Picker */}
              <div style={{ background: cardBg, border: cardBorder, borderRadius: 24, padding: "24px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
                <label style={{ ...lbl, marginBottom: 16 }}>Select Promotion Strategy</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {TYPES.map(t => (
                    <button
                      key={t.key}
                      onClick={() => applyTemplate(t.key)}
                      style={{
                        padding: "16px",
                        borderRadius: 18,
                        cursor: "pointer",
                        border: type === t.key ? (dark ? `1.5px solid ${t.color}` : `1.5px solid ${t.color}`) : "1.5px solid transparent",
                        background: type === t.key ? (dark ? `${t.color}20` : `${t.color}08`) : (dark ? "rgba(255,255,255,0.03)" : "#f8fafc"),
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                        textAlign: "center",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: t.color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", boxShadow: `0 8px 20px ${t.color}40` }}>
                        {t.key === "offer" ? "🎁" : t.key === "menu" ? "🍜" : "📢"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 13, color: textPrimary }}>{t.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Intelligence Lab */}
              <div style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.05))",
                borderRadius: 24,
                padding: "24px",
                border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #ddd6fe",
                boxShadow: "0 20px 40px rgba(139,92,246,0.1)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ padding: 8, borderRadius: 10, background: "#8b5cf6", color: "white", boxShadow: "0 6px 15px rgba(139,92,246,0.4)" }}>
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 1000, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: 1 }}>AI Content Command</span>
                      <p style={{ margin: 0, fontSize: 11, color: textSecondary, fontWeight: 700 }}>Describe your intent below</p>
                    </div>
                  </div>
                  {aiGenerating && <Loader2 size={16} className="animate-spin" color="#8b5cf6" />}
                </div>

                <div style={{ position: "relative" }}>
                  <textarea
                    placeholder="e.g. 'Invite people to try our new summer cocktail menu' or 'Weekend flash sale - 2-for-1 on all starters'..."
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    style={{
                      ...inp,
                      minHeight: 80,
                      background: dark ? "rgba(2,6,23,0.4)" : "white",
                      padding: "14px",
                      resize: "none",
                      paddingBottom: 50,
                      fontSize: 14,
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)"
                    }}
                  />
                  <div style={{ position: "absolute", bottom: 8, right: 8, left: 8, display: "flex", justifyContent: "flex-end", backdropFilter: "blur(4px)" }}>
                    <button
                      onClick={generateWithAI}
                      disabled={aiGenerating || !aiPrompt}
                      style={{
                        background: "linear-gradient(90deg, #7c3aed, #ec4899)",
                        color: "white",
                        border: "none",
                        borderRadius: 10,
                        padding: "8px 20px",
                        fontSize: 11,
                        fontWeight: 1000,
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(139,92,246,0.3)"
                      }}
                    >
                      RE-WRITE WITH AI
                    </button>
                  </div>
                </div>
              </div>

              {/* Creative Composer */}
              <div style={{ background: cardBg, border: cardBorder, borderRadius: 24, padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
                <div><label style={lbl}>Subject Engagement</label><input style={inp} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject line..." /></div>
                <div><label style={lbl}>Dynamic Heading</label><input style={inp} value={heading} onChange={e => setHeading(e.target.value)} placeholder="Email heading..." /></div>
                <div><label style={lbl}>Body Architecture</label><textarea style={{ ...inp, minHeight: 120, resize: "vertical" }} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..." /></div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div><label style={lbl}>CTA Trigger Text</label><input style={inp} value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="e.g. Order Now" /></div>
                  <div><label style={lbl}>CTA Destination (URL)</label><input style={inp} value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://..." /></div>
                </div>

                <div style={{ background: dark ? "rgba(255,255,255,0.02)" : "#f9fafb", borderRadius: 16, padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, border: dark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: textPrimary, fontWeight: 700 }}>
                    <input type="checkbox" checked={personalize} onChange={e => setPersonalize(e.target.checked)} style={{ width: 18, height: 18, borderRadius: 6, cursor: "pointer" }} />
                    Personalize Hi!
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: textPrimary, fontWeight: 700 }}>
                    <input type="checkbox" checked={scheduleMode} onChange={e => setScheduleMode(e.target.checked)} style={{ width: 18, height: 18, borderRadius: 6, cursor: "pointer" }} />
                    Schedule Post
                  </label>
                </div>

                {scheduleMode && (
                  <div style={{ marginTop: -8 }}>
                    <label style={lbl}>Pick Send Time</label>
                    <input
                      type="datetime-local"
                      style={inp}
                      value={scheduledAt}
                      min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                      onChange={e => setScheduledAt(e.target.value)}
                    />
                  </div>
                )}

                <button
                  onClick={handleSend}
                  disabled={sending || !subject || !heading || !body || (scheduleMode && !scheduledAt)}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    border: "none",
                    background: (sending || !subject || !heading || !body || (scheduleMode && !scheduledAt)) ? (dark ? "#1e293b" : "#f1f5f9") : accentColor,
                    color: (sending || !subject || !heading || !body) ? "var(--muted)" : "white",
                    fontWeight: 1000,
                    fontSize: 15,
                    cursor: sending ? "not-allowed" : "pointer",
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    boxShadow: (sending || !subject || !heading || !body) ? "none" : `0 10px 25px ${accentColor}40`
                  }}
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : scheduleMode ? <History size={18} /> : <Megaphone size={18} />}
                  {sending ? "TRANSMITTING..." : scheduleMode ? "SCHEDULE BROADCAST" : `LAUNCH CAMPAIGN (${customerCount ?? "..."})`}
                </button>
              </div>
            </div>

            {/* HIGH FIDELITY PREVIEW */}
            <div style={{ position: "sticky", top: 20 }}>
              <label style={lbl}>Real-Time Mobile Preview</label>
              <div style={{
                border: dark ? "10px solid #1e293b" : "10px solid #0f172a",
                borderRadius: 48,
                overflow: "hidden",
                background: "#f1f5f9",
                height: "650px",
                width: "320px",
                margin: "0 auto",
                boxShadow: "0 40px 100px -20px rgba(0,0,0,0.5)",
                display: "flex",
                flexDirection: "column"
              }}>
                {/* Status Bar */}
                <div style={{ background: dark ? "#334155" : "#0f172a", height: 26, width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <div style={{ width: 60, height: 4, borderRadius: 2, background: dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.15)" }} />
                </div>

                <div style={{ flex: 1, overflowY: "auto", background: dark ? "#0f172a" : "white" }}>
                  <div style={{ background: accentColor, padding: "32px 24px", textAlign: "center" }}>
                    <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{restaurantName}</div>
                    <div style={{ color: "white", fontWeight: 1000, fontSize: 24, lineHeight: 1.2 }}>{heading || "Headline Goes Here"}</div>
                  </div>

                  <div style={{ padding: "30px 24px" }}>
                    {personalize && <p style={{ fontSize: 13, color: dark ? "#f1f5f9" : "#1e293b", margin: "0 0 12px", fontWeight: 800 }}>Hi Fadil Jalal,</p>}
                    <p style={{ fontSize: 14, color: dark ? "#cbd5e1" : "#475569", lineHeight: 1.7, margin: "0 0 28px", whiteSpace: "pre-line" }}>{body || "Your creative copy will materialize here. Use AI to generate something that wows your customers."}</p>

                    {ctaText && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-block", background: accentColor, color: "white", padding: "14px 28px", borderRadius: 12, fontWeight: 1000, fontSize: 15, boxShadow: `0 8px 18px ${accentColor}40` }}>{ctaText.toUpperCase()}</div>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "30px 24px", textAlign: "center", borderTop: dark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>Crave Intelligence Outbound</div>
                    <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>No longer want to receive these? Unsubscribe here.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <div style={{ background: cardBg, border: cardBorder, borderRadius: 28, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
            <div style={{ padding: "24px", borderBottom: cardBorder, background: dark ? "rgba(255,255,255,0.03)" : "#f8fafc" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: textPrimary }}>Broadcast Archive</h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: textSecondary }}>Review your past marketing performance</p>
            </div>

            <div style={{ padding: "12px" }}>
              {loadingHistory && <div style={{ padding: 40, textAlign: "center", color: textSecondary }}><Loader2 className="animate-spin" /></div>}
              {!loadingHistory && history.length === 0 && (
                <div style={{ textAlign: "center", padding: "80px 0", color: textSecondary }}>
                  <div style={{ width: 80, height: 80, borderRadius: 30, background: dark ? "rgba(255,255,255,0.03)" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                    <History size={32} opacity={0.3} />
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 18, color: textPrimary }}>Strategic Silence</div>
                  <div style={{ fontSize: 13, marginTop: 6, opacity: 0.8 }}>You haven't launched any campaigns yet. Let's create one.</div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map(c => {
                  const badge = STATUS_BADGE[c.status] || STATUS_BADGE.sent;
                  const color = TYPE_COLOR[c.type] || "#111827";
                  return (
                    <div key={c._id} style={{
                      background: dark ? "rgba(255,255,255,0.02)" : "white",
                      border: dark ? "1px solid rgba(255,255,255,0.04)" : "1px solid #f1f5f9",
                      borderRadius: 18,
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: 20,
                      transition: "transform 0.2s, background 0.2s",
                      cursor: "default"
                    }}>
                      <div style={{ width: 12, height: 12, borderRadius: 4, background: color, flexShrink: 0, boxShadow: `0 0 10px ${color}40` }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 900, fontSize: 14, color: textPrimary, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject}</div>
                        <div style={{ fontSize: 11, color: textSecondary, display: "flex", gap: 10, fontWeight: 700 }}>
                          <span>{formatDate(c.scheduledAt || c.sentAt || c.createdAt)}</span>
                          {c.status === "sent" && <span>· {c.sentCount} recipients</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 950, padding: "4px 12px", borderRadius: 10, background: badge.bg, color: badge.color, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {badge.label}
                      </span>
                      <button
                        onClick={() => handleDelete(c._id)}
                        style={{ padding: "8px", borderRadius: 10, border: "none", background: dark ? "rgba(239,68,68,0.1)" : "#fef2f2", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                      >
                        <Megaphone size={14} style={{ transform: "rotate(180deg)" }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={modal.isOpen}
          onClose={() => setModal({ ...modal, isOpen: false })}
          onConfirm={modal.onConfirm}
          title={modal.title}
          message={modal.message}
          confirmText={modal.confirmText}
        />
      </div>
    </RestaurantLayout>
  );
}