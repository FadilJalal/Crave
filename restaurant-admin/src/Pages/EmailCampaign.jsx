import { useEffect, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";

const TYPES = [
  { key: "offer",   label: "Special Offer",  color: "#ff4e2a", desc: "Discount or limited-time deal" },
  { key: "menu",    label: "New Menu Item",   color: "#8b5cf6", desc: "Announce a new dish" },
  { key: "general", label: "General Update", color: "#111827", desc: "News, hours, announcement" },
];

const TEMPLATES = {
  offer:   { subject: "🔥 Exclusive offer just for you!", heading: "Special deal this week", body: "We're offering an exclusive discount for our loyal customers.\n\nUse code SAVE20 to get 20% off your next order. Valid this week only!", ctaText: "Order Now", ctaUrl: "" },
  menu:    { subject: "✨ New item on our menu!", heading: "Something delicious is here", body: "We're excited to announce a brand new addition to our menu!\n\nCome try it out and let us know what you think.", ctaText: "See Our Menu", ctaUrl: "" },
  general: { subject: "An update from us", heading: "Important update", body: "We wanted to share some news with our valued customers.\n\nThank you for your continued support!", ctaText: "", ctaUrl: "" },
};

const STATUS_BADGE = {
  sent:      { bg: "#f0fdf4", color: "#15803d", label: "Sent" },
  scheduled: { bg: "#eff6ff", color: "#1d4ed8", label: "Scheduled" },
  failed:    { bg: "#fef2f2", color: "#dc2626", label: "Failed" },
};

const TYPE_COLOR = { offer: "#ff4e2a", menu: "#8b5cf6", general: "#111827" };

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function EmailCampaign() {
  const [tab, setTab]               = useState("compose");
  const [customerCount, setCustomerCount] = useState(null);
  const [loadingCount, setLoadingCount]   = useState(true);
  const [isPro, setIsPro]           = useState(true);
  const [upgradeMsg, setUpgradeMsg] = useState("");

  const [type, setType]           = useState("offer");
  const [subject, setSubject]     = useState(TEMPLATES.offer.subject);
  const [heading, setHeading]     = useState(TEMPLATES.offer.heading);
  const [body, setBody]           = useState(TEMPLATES.offer.body);
  const [ctaText, setCtaText]     = useState(TEMPLATES.offer.ctaText);
  const [ctaUrl, setCtaUrl]       = useState(TEMPLATES.offer.ctaUrl);
  const [personalize, setPersonalize] = useState(true);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt]   = useState("");

  const [sending, setSending]     = useState(false);
  const [result, setResult]       = useState(null);

  const [history, setHistory]     = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    api.get("/api/email-campaign/customers")
      .then(res => {
        if (res.data.success) setCustomerCount(res.data.count);
        else { setIsPro(false); setUpgradeMsg(res.data.message); }
      })
      .catch(() => setIsPro(false))
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
    } catch {}
    finally { setLoadingHistory(false); }
  };

  const applyTemplate = (t) => {
    setType(t);
    const tmpl = TEMPLATES[t];
    setSubject(tmpl.subject); setHeading(tmpl.heading);
    setBody(tmpl.body); setCtaText(tmpl.ctaText); setCtaUrl(tmpl.ctaUrl);
  };

  const handleSend = async () => {
    if (!subject || !heading || !body) return;
    const label = scheduleMode ? `Schedule for ${new Date(scheduledAt).toLocaleString("en-AE")}` : `Send to ${customerCount} customer${customerCount !== 1 ? "s" : ""}`;
    if (!confirm(`${label}?`)) return;
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
    } finally { setSending(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this campaign record?")) return;
    await api.delete(`/api/email-campaign/history/${id}`);
    setHistory(h => h.filter(c => c._id !== id));
  };

  const accentColor = TYPES.find(t => t.key === type)?.color || "#111827";
  const inp = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "white" };
  const lbl = { fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 6 };

  if (!loadingCount && !isPro) {
    return (
      <RestaurantLayout>
        <div style={{ maxWidth: 560 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 900, color: "#111827" }}>Email Campaigns</h2>
          <p style={{ margin: "0 0 32px", fontSize: 14, color: "#9ca3af" }}>Send emails to your customers</p>
          <div style={{ background: "#f5f3ff", border: "1px solid #8b5cf633", borderRadius: 20, padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💜</div>
            <div style={{ fontWeight: 900, fontSize: 18, color: "#111827", marginBottom: 8 }}>Pro Feature</div>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
              {upgradeMsg || "Email campaigns are available on the Pro plan (AED 399/mo)."}<br />
              Reach all your customers with offers, new menu items, and announcements.
            </div>
            <a href="/subscription" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 12, background: "#8b5cf6", color: "white", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
              Upgrade to Pro →
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
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#111827", letterSpacing: "-0.6px" }}>Email Campaigns</h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#9ca3af" }}>
              {loadingCount ? "Loading..." : `${customerCount} customer${customerCount !== 1 ? "s" : ""} in your list`}
            </p>
          </div>
          <span style={{ background: "#f5f3ff", color: "#8b5cf6", fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 999 }}>PRO</span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#f3f4f6", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {[["compose", "✏️ Compose"], ["history", "📋 History"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: tab === key ? "white" : "transparent", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: tab === key ? "#111827" : "#6b7280", boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
              {label}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Type */}
              <div>
                <label style={lbl}>CAMPAIGN TYPE</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {TYPES.map(t => (
                    <div key={t.key} onClick={() => applyTemplate(t.key)} style={{ padding: "10px 14px", borderRadius: 12, cursor: "pointer", border: `2px solid ${type === t.key ? t.color : "#e5e7eb"}`, background: type === t.key ? t.color + "0f" : "white", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: "#111827" }}>{t.label}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fields */}
              <div><label style={lbl}>EMAIL SUBJECT</label><input style={inp} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject line..." /></div>
              <div><label style={lbl}>HEADING</label><input style={inp} value={heading} onChange={e => setHeading(e.target.value)} placeholder="Email heading..." /></div>
              <div><label style={lbl}>MESSAGE BODY</label><textarea style={{ ...inp, minHeight: 100, resize: "vertical" }} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..." /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={lbl}>BUTTON TEXT</label><input style={inp} value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="e.g. Order Now" /></div>
                <div><label style={lbl}>BUTTON LINK</label><input style={inp} value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://..." /></div>
              </div>

              {/* Options */}
              <div style={{ background: "#f9fafb", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 600 }}>
                  <input type="checkbox" checked={personalize} onChange={e => setPersonalize(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
                  Personalize with customer name (Hi John!)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 600 }}>
                  <input type="checkbox" checked={scheduleMode} onChange={e => setScheduleMode(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
                  Schedule for later
                </label>
                {scheduleMode && (
                  <input
                    type="datetime-local"
                    style={{ ...inp, marginTop: 4 }}
                    value={scheduledAt}
                    min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                    onChange={e => setScheduledAt(e.target.value)}
                  />
                )}
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={sending || !subject || !heading || !body || (scheduleMode && !scheduledAt)}
                style={{ padding: 13, borderRadius: 12, border: "none", background: (sending || !subject || !heading || !body || (scheduleMode && !scheduledAt)) ? "#e5e7eb" : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: (sending || !subject || !heading || !body) ? "#9ca3af" : "white", fontWeight: 900, fontSize: 15, cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit" }}
              >
                {sending ? "Processing…" : scheduleMode ? "Schedule Campaign" : `Send to ${customerCount ?? "…"} customer${customerCount !== 1 ? "s" : ""}`}
              </button>
            </div>

            {/* Live preview */}
            <div>
              <label style={lbl}>LIVE PREVIEW</label>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", background: "#f9fafb" }}>
                <div style={{ background: accentColor, padding: "20px 24px" }}>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginBottom: 4 }}>Your Restaurant</div>
                  <div style={{ color: "white", fontWeight: 900, fontSize: 18, lineHeight: 1.3 }}>{heading || "Your heading here"}</div>
                </div>
                <div style={{ padding: 24, background: "white" }}>
                  {personalize && <p style={{ fontSize: 13, color: "#374151", margin: "0 0 8px", fontWeight: 600 }}>Hi John,</p>}
                  <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: "0 0 20px", whiteSpace: "pre-line" }}>{body || "Your message will appear here..."}</p>
                  {ctaText && <div style={{ display: "inline-block", background: accentColor, color: "white", padding: "10px 22px", borderRadius: 8, fontWeight: 800, fontSize: 14 }}>{ctaText}</div>}
                </div>
                <div style={{ padding: "14px 24px", background: "#f9fafb", borderTop: "1px solid #f3f4f6" }}>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Sent via Crave. · Unsubscribe</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <div>
            {loadingHistory && <div style={{ color: "#9ca3af", fontSize: 14 }}>Loading...</div>}
            {!loadingHistory && history.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
                <div style={{ fontWeight: 700 }}>No campaigns yet</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Your sent and scheduled campaigns will appear here</div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {history.map(c => {
                const badge = STATUS_BADGE[c.status] || STATUS_BADGE.sent;
                const color = TYPE_COLOR[c.type] || "#111827";
                return (
                  <div key={c._id} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#111827", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>
                        {c.status === "scheduled" ? `Scheduled for ${formatDate(c.scheduledAt)}` : `${c.status === "sent" ? "Sent" : "Failed"} · ${formatDate(c.sentAt || c.createdAt)}`}
                        {c.status === "sent" && ` · ${c.sentCount} delivered`}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: badge.bg, color: badge.color, flexShrink: 0 }}>
                      {badge.label}
                    </span>
                    <button onClick={() => handleDelete(c._id)} style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", flexShrink: 0 }}>
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}