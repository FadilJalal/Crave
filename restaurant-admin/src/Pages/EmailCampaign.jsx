import { useEffect, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";

const TYPES = [
  { key: "offer",   label: "Special Offer",  color: "#ff4e2a", desc: "Discount or limited-time deal" },
  { key: "menu",    label: "New Menu Item",   color: "#8b5cf6", desc: "Announce a new dish" },
  { key: "general", label: "General Update", color: "#111827", desc: "News, hours, announcement" },
];

const TEMPLATES = {
  offer:   { subject: "🔥 Exclusive offer just for you!", heading: "Special deal this week", body: "Hi! We're offering an exclusive discount for our loyal customers.\n\nUse code SAVE20 to get 20% off your next order. Valid this week only!", ctaText: "Order Now", ctaUrl: "" },
  menu:    { subject: "✨ New item on our menu!", heading: "Something delicious is here", body: "We're excited to announce a brand new addition to our menu!\n\nCome try it out and let us know what you think.", ctaText: "See Our Menu", ctaUrl: "" },
  general: { subject: "An update from us", heading: "Important update", body: "We wanted to share some news with our valued customers.\n\nThank you for your continued support!", ctaText: "", ctaUrl: "" },
};

export default function EmailCampaign() {
  const [customerCount, setCustomerCount] = useState(null);
  const [loadingCount, setLoadingCount]   = useState(true);
  const [isPro, setIsPro]                 = useState(true);
  const [upgradeMsg, setUpgradeMsg]       = useState("");

  const [type, setType]       = useState("offer");
  const [subject, setSubject] = useState(TEMPLATES.offer.subject);
  const [heading, setHeading] = useState(TEMPLATES.offer.heading);
  const [body, setBody]       = useState(TEMPLATES.offer.body);
  const [ctaText, setCtaText] = useState(TEMPLATES.offer.ctaText);
  const [ctaUrl, setCtaUrl]   = useState(TEMPLATES.offer.ctaUrl);

  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState(null);

  useEffect(() => {
    api.get("/api/email-campaign/customers")
      .then(res => {
        if (res.data.success) setCustomerCount(res.data.count);
        else { setIsPro(false); setUpgradeMsg(res.data.message); }
      })
      .catch(() => setIsPro(false))
      .finally(() => setLoadingCount(false));
  }, []);

  const applyTemplate = (t) => {
    setType(t);
    const tmpl = TEMPLATES[t];
    setSubject(tmpl.subject); setHeading(tmpl.heading);
    setBody(tmpl.body); setCtaText(tmpl.ctaText); setCtaUrl(tmpl.ctaUrl);
  };

  const handleSend = async () => {
    if (!subject || !heading || !body) return;
    if (!confirm(`Send this campaign to ${customerCount} customer${customerCount !== 1 ? "s" : ""}?`)) return;
    setSending(true); setResult(null);
    try {
      const res = await api.post("/api/email-campaign/send", { subject, heading, body, ctaText, ctaUrl, type });
      setResult({ success: res.data.success, message: res.data.message });
    } catch {
      setResult({ success: false, message: "Failed to send campaign." });
    } finally { setSending(false); }
  };

  const accentColor = TYPES.find(t => t.key === type)?.color || "#111827";
  const inp = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "white" };

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
      <div style={{ maxWidth: 780 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#111827", letterSpacing: "-0.6px" }}>Email Campaigns</h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#9ca3af" }}>
              {loadingCount ? "Loading..." : `${customerCount} customer${customerCount !== 1 ? "s" : ""} will receive this email`}
            </p>
          </div>
          <span style={{ background: "#f5f3ff", color: "#8b5cf6", fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 999 }}>PRO</span>
        </div>

        {result && (
          <div style={{ background: result.success ? "#f0fdf4" : "#fef2f2", border: `1px solid ${result.success ? "#bbf7d0" : "#fecaca"}`, color: result.success ? "#15803d" : "#dc2626", borderRadius: 12, padding: "12px 18px", marginBottom: 20, fontSize: 14, fontWeight: 700 }}>
            {result.success ? "✅" : "❌"} {result.message}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>CAMPAIGN TYPE</div>
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
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 6 }}>EMAIL SUBJECT</label>
              <input style={inp} value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Exclusive deal just for you!" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 6 }}>HEADING</label>
              <input style={inp} value={heading} onChange={e => setHeading(e.target.value)} placeholder="e.g. 20% off this weekend" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 6 }}>MESSAGE BODY</label>
              <textarea style={{ ...inp, minHeight: 110, resize: "vertical" }} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..." />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 6 }}>BUTTON TEXT</label>
                <input style={inp} value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="e.g. Order Now" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 6 }}>BUTTON LINK</label>
                <input style={inp} value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <button onClick={handleSend} disabled={sending || !subject || !heading || !body || customerCount === 0}
              style={{ padding: 13, borderRadius: 12, border: "none", background: sending || !subject || !heading || !body ? "#e5e7eb" : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: sending || !subject || !heading || !body ? "#9ca3af" : "white", fontWeight: 900, fontSize: 15, cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: sending ? "none" : `0 4px 14px ${accentColor}33` }}>
              {sending ? "Sending…" : `Send to ${customerCount ?? "…"} customer${customerCount !== 1 ? "s" : ""}`}
            </button>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>LIVE PREVIEW</div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", background: "#f9fafb" }}>
              <div style={{ background: accentColor, padding: "20px 24px" }}>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginBottom: 4 }}>Your Restaurant</div>
                <div style={{ color: "white", fontWeight: 900, fontSize: 18, lineHeight: 1.3 }}>{heading || "Your heading here"}</div>
              </div>
              <div style={{ padding: 24, background: "white" }}>
                <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: "0 0 20px", whiteSpace: "pre-line" }}>{body || "Your message will appear here..."}</p>
                {ctaText && <div style={{ display: "inline-block", background: accentColor, color: "white", padding: "10px 22px", borderRadius: 8, fontWeight: 800, fontSize: 14 }}>{ctaText}</div>}
              </div>
              <div style={{ padding: "14px 24px", background: "#f9fafb", borderTop: "1px solid #f3f4f6" }}>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Sent via Crave. · Unsubscribe</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RestaurantLayout>
  );
}