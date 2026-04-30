import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { toast } from "react-toastify";

const TYPES = [
  { key: "announcement", label: "Announcement",  color: "var(--text)", desc: "General news or updates" },
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

  const accentColor = TYPES.find(t => t.key === type)?.color || "var(--text)";

  return (
    <div className="dash animate-fade-in" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="dash-header">
        <div>
          <div className="dash-kicker">NETWORK COMMUNICATIONS</div>
          <h1 className="dash-title">Broadcast <span style={{ color: '#ff4e2a' }}>Engine</span></h1>
          <p className="dash-subtitle">
            Deploy platform-wide announcements to all {restaurantCount !== null ? restaurantCount : <span style={{ display: 'inline-block', width: 20, height: 12, background: 'var(--border)', borderRadius: 4 }} />} active restaurant entities.
          </p>
        </div>
        <div className="dash-actions">
           <div className="pill pill-ok">TRANSMISSION READY</div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`dash-panel ${result.success ? 'success-glow' : 'error-glow'}`} style={{ padding: '12px 20px', marginBottom: '24px', fontWeight: 800, fontSize: '13px' }}>
          {result.success ? "✅ BROADCAST DEPLOYED SUCCESSFULLY" : "❌ TRANSMISSION FAILURE: " + result.message}
        </div>
      )}

      <div className="dash-row" style={{ alignItems: 'flex-start', gap: '32px' }}>

        {/* Left: composer (STABLE WIDTH) */}
        <div style={{ flex: '0 0 520px', display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Type */}
          <div className="dash-panel" style={{ padding: '24px' }}>
            <div className="dash-panel-head" style={{ marginBottom: '16px' }}>
               <div>
                  <h3 className="dash-panel-title">📡 MESSAGE TYPE</h3>
               </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {TYPES.map(t => (
                <div 
                  key={t.key} 
                  onClick={() => applyTemplate(t.key)} 
                  className={`as-glass-card ${type === t.key ? 'active' : ''}`}
                  style={{ 
                    padding: "12px", 
                    cursor: "pointer", 
                    border: `1px solid ${type === t.key ? t.color : 'var(--border)'}`,
                    background: type === t.key ? `${t.color}15` : 'transparent',
                    display: "flex", 
                    alignItems: "center", 
                    gap: 10,
                    transition: "all .2s"
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, boxShadow: type === t.key ? `0 0 10px ${t.color}` : 'none' }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase' }}>{t.label}</div>
                    <div style={{ fontSize: '9px', color: "var(--muted)" }}>{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
             <div className="field">
                <label className="label">SUBJECT LINE</label>
                <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." />
             </div>
             <div className="field">
                <label className="label">HEADING</label>
                <input className="input" value={heading} onChange={e => setHeading(e.target.value)} placeholder="Main heading..." />
             </div>
             <div className="field">
                <label className="label">MESSAGE CONTENT</label>
                <textarea className="input" style={{ minHeight: 180, resize: "none" }} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..." />
             </div>
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label className="label">CTA LABEL</label>
                  <input className="input" value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="e.g. Learn More" />
                </div>
                <div className="field">
                  <label className="label">CTA DESTINATION</label>
                  <input className="input" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://..." />
                </div>
             </div>
          </div>

          <button
            className="as-logout-btn"
            onClick={handleSend}
            disabled={sending || !subject || !heading || !body}
            style={{ 
              height: '56px',
              background: (sending || !subject || !heading || !body) ? "var(--border)" : accentColor,
              color: "#fff",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: (sending || !subject || !heading || !body) ? 'none' : `0 10px 20px -5px ${accentColor}44`
            }}
          >
            {sending ? "TRANSMITTING..." : `📡 TRANSMIT TO ${restaurantCount ?? "..."} ENTITIES`}
          </button>
        </div>

        {/* Right: preview (STABLE STICKY) */}
        <div style={{ flex: 1, position: 'sticky', top: '24px' }}>
          <div className="dash-panel-head" style={{ marginBottom: '16px', paddingLeft: '5px' }}>
              <h3 className="dash-panel-title">👀 LIVE TRANSMISSION PREVIEW</h3>
          </div>
          
          <div className="as-glass-card shadow-lg" style={{ overflow: "hidden", border: '1px solid var(--border)', background: 'var(--card)' }}>
            <div style={{ background: accentColor, padding: "32px 24px", textAlign: 'center' }}>
               <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', display: 'inline-block', fontSize: '9px', fontWeight: 900, color: '#fff', letterSpacing: '1px', marginBottom: '16px' }}>
                  {TYPES.find(t => t.key === type)?.label} · OFFICIAL BROADCAST
               </div>
               <h2 style={{ color: "white", fontWeight: 900, fontSize: 24, lineHeight: 1.2, margin: 0 }}>{heading || "Your heading here"}</h2>
            </div>
            
            <div style={{ padding: 40, background: "var(--card)" }}>
              <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 800, margin: "0 0 12px" }}>Hi Restaurant Owner,</p>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.8, margin: "0 0 24px", whiteSpace: "pre-line" }}>{body || "Your message..."}</p>
              
              {ctaText && (
                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                  <div style={{ display: "inline-block", background: accentColor, color: "white", padding: "14px 32px", borderRadius: "14px", fontWeight: 900, fontSize: 13, boxShadow: `0 8px 25px -8px ${accentColor}` }}>{ctaText}</div>
                </div>
              )}
            </div>

            <div style={{ padding: "24px", background: "rgba(0,0,0,0.03)", borderTop: "1px solid var(--border)", textAlign: 'center' }}>
               <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', marginBottom: '4px' }}>Crave.</div>
               <p style={{ fontSize: 10, color: "var(--muted)", margin: 0 }}>You are receiving this as an active partner of the Crave ecosystem.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}