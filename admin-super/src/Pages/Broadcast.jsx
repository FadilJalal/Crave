import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { toast } from "react-toastify";

const TYPES = [
  { key: "announcement", label: "Announcement",  color: "#111827", desc: "General news or updates" },
  { key: "maintenance",  label: "Maintenance",   color: "#f59e0b", desc: "Downtime or system updates" },
  { key: "billing",      label: "Billing",       color: "#3b82f6", desc: "Payment or subscription info" },
  { key: "feature",      label: "New Feature",   color: "#8b5cf6", desc: "Announce new platform features" },
];

const TEMPLATES = {
  announcement: { subject: "Important update from Crave", heading: "A message from Crave", body: "We wanted to share an important update with all our restaurant partners.\n\nThank you for being part of the Crave platform." },
  maintenance:  { subject: "⚠️ Scheduled maintenance notice", heading: "Scheduled maintenance", body: "We will be performing scheduled maintenance on the Crave platform.\n\n🕐 Date: [DATE]\n⏱ Duration: Approximately [X] hours\n\nDuring this time, the platform may be temporarily unavailable. We apologize for any inconvenience." },
  billing:      { subject: "Billing update — action required", heading: "Subscription billing update", body: "This is a reminder regarding your Crave subscription.\n\nPlease ensure your subscription is active to continue receiving orders on the platform." },
  feature:      { subject: "✨ New feature on Crave!", heading: "Exciting new feature", body: "We're excited to announce a new feature on the Crave platform!\n\n[DESCRIBE THE FEATURE]\n\nThis update is now live and available to all restaurant partners." },
};

export default function Broadcast() {
  const [restaurantCount, setRestaurantCount] = useState(null);
  const [type, setType]       = useState("announcement");
  const [subject, setSubject] = useState(TEMPLATES.announcement.subject);
  const [heading, setHeading] = useState(TEMPLATES.announcement.heading);
  const [body, setBody]       = useState(TEMPLATES.announcement.body);
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl]   = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState(null);

  useEffect(() => {
    api.get("/api/broadcast/restaurants-count")
      .then(res => { if (res.data.success) setRestaurantCount(res.data.count); })
      .catch(() => {});
  }, []);

  const applyTemplate = (t) => {
    setType(t);
    const tmpl = TEMPLATES[t];
    setSubject(tmpl.subject);
    setHeading(tmpl.heading);
    setBody(tmpl.body);
    setCtaText(""); setCtaUrl("");
  };

  const handleSend = async () => {
    if (!subject || !heading || !body) return;
    if (!confirm(`Send this broadcast to all ${restaurantCount} restaurant owners?`)) return;
    setSending(true); setResult(null);
    try {
      const res = await api.post("/api/broadcast/send", { subject, heading, body, ctaText, ctaUrl, type });
      setResult({ success: res.data.success, message: res.data.message });
      if (res.data.success) toast.success(res.data.message);
      else toast.error(res.data.message);
    } catch {
      toast.error("Failed to send broadcast.");
    } finally { setSending(false); }
  };

  const accentColor = TYPES.find(t => t.key === type)?.color || "#111827";
  const inp = { padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box", background: "white" };
  const lbl = { fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 6 };

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Broadcast Email</h1>
        <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>
          Send a message to all {restaurantCount !== null ? restaurantCount : "..."} restaurant owners on the platform
        </p>
      </div>

      {/* Result */}
      {result && (
        <div style={{ background: result.success ? "#f0fdf4" : "#fef2f2", border: `1px solid ${result.success ? "#bbf7d0" : "#fecaca"}`, color: result.success ? "#15803d" : "#dc2626", borderRadius: 12, padding: "12px 18px", marginBottom: 20, fontSize: 14, fontWeight: 700 }}>
          {result.success ? "✅" : "❌"} {result.message}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

        {/* Left: composer */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Type */}
          <div>
            <label style={lbl}>MESSAGE TYPE</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TYPES.map(t => (
                <div key={t.key} onClick={() => applyTemplate(t.key)} style={{ padding: "10px 14px", borderRadius: 12, cursor: "pointer", border: `2px solid ${type === t.key ? t.color : "var(--border)"}`, background: type === t.key ? t.color + "0f" : "white", display: "flex", alignItems: "center", gap: 12, transition: "all .15s" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#111827" }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div><label style={lbl}>SUBJECT LINE</label><input style={inp} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." /></div>
          <div><label style={lbl}>HEADING</label><input style={inp} value={heading} onChange={e => setHeading(e.target.value)} placeholder="Main heading..." /></div>
          <div><label style={lbl}>MESSAGE</label><textarea style={{ ...inp, minHeight: 120, resize: "vertical" }} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..." /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={lbl}>BUTTON TEXT</label><input style={inp} value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="e.g. Learn More" /></div>
            <div><label style={lbl}>BUTTON LINK</label><input style={inp} value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://..." /></div>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !subject || !heading || !body}
            style={{ padding: 13, borderRadius: 12, border: "none", background: (sending || !subject || !heading || !body) ? "#e5e7eb" : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: (sending || !subject || !heading || !body) ? "#9ca3af" : "white", fontWeight: 900, fontSize: 15, cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {sending ? "Sending…" : `📣 Send to ${restaurantCount ?? "..."} restaurants`}
          </button>
        </div>

        {/* Right: preview */}
        <div>
          <label style={lbl}>LIVE PREVIEW</label>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ background: accentColor, padding: "20px 24px" }}>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                {TYPES.find(t => t.key === type)?.label} · Crave Platform
              </div>
              <div style={{ color: "white", fontWeight: 900, fontSize: 18, lineHeight: 1.3 }}>{heading || "Your heading here"}</div>
            </div>
            <div style={{ padding: 24, background: "white" }}>
              <p style={{ fontSize: 13, color: "#374151", fontWeight: 700, margin: "0 0 10px" }}>Hi Restaurant Name,</p>
              <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: "0 0 20px", whiteSpace: "pre-line" }}>{body || "Your message..."}</p>
              {ctaText && <div style={{ display: "inline-block", background: accentColor, color: "white", padding: "10px 22px", borderRadius: 8, fontWeight: 800, fontSize: 14 }}>{ctaText}</div>}
            </div>
            <div style={{ padding: "14px 24px", background: "#f9fafb", borderTop: "1px solid #f3f4f6" }}>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Sent to all restaurant partners by Crave platform admin.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}