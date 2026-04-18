import { useEffect, useMemo, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import { toast } from "react-toastify";

const SEGMENT_COLORS = {
  VIP: "#10b981",
  Loyal: "#3b82f6",
  Regular: "#f59e0b",
  "At Risk": "#f97316",
  Lost: "#ef4444",
  New: "#8b5cf6",
};

const SEGMENT_EMOJIS = {
  VIP: "👑",
  Loyal: "💎",
  Regular: "🧑",
  "At Risk": "⚠️",
  Lost: "💔",
  New: "🌱",
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) => `AED ${toNumber(value).toLocaleString()}`;

export default function AICustomerSegmentation() {
  const { dark } = useTheme();
  const [segments, setSegments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState("");
  const [sendingKey, setSendingKey] = useState("");
  const [scriptLoadingKey, setScriptLoadingKey] = useState("");
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    loadSegmentation();
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const res = await api.get("/api/subscription/mine");
      if (res.data?.success) setSubscription(res.data.data || null);
      else setSubscription(null);
    } catch {
      setSubscription(null);
    }
  };

  const loadSegmentation = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/ai/restaurant/customer-segmentation");
      if (res.data?.success) {
        setSegments(Array.isArray(res.data.segments) ? res.data.segments : []);
        setCustomers(Array.isArray(res.data.customers) ? res.data.customers : []);
        setMetrics(res.data.metrics || {});
      }
    } catch (error) {
      console.error("Failed to load segmentation:", error);
    }
    setLoading(false);
  };

  const exportSegment = async (segmentType) => {
    try {
      const res = await api.post("/api/ai/restaurant/export-segment", {
        segmentType,
        format: "csv",
      });

      if (res.data?.success) {
        const url = window.URL.createObjectURL(new Blob([res.data.csv]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${segmentType}_customers.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      console.error("Failed to export segment:", error);
    }
  };

  const exportAllCustomersCsv = () => {
    const header = [
      "Customer Name",
      "Email",
      "Segment",
      "Total Orders",
      "Total Spent",
      "Average Order",
      "Last Order",
    ];

    const rows = customers.map((c) => [
      c.name || "Customer",
      c.email || "",
      c.segment || "Regular",
      toNumber(c.totalOrders),
      toNumber(c.totalSpent),
      toNumber(c.avgOrder),
      c.lastOrder || "",
    ]);

    const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((line) => line.map(escape).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "ai_customer_segmentation_customers.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const generateCampaignScript = async (segmentType, supportersOnly = false, applyToInput = true) => {
    const key = `${segmentType}:${supportersOnly ? "top" : "all"}`;
    setScriptLoadingKey(key);
    try {
      const res = await api.post("/api/ai/restaurant/generate-campaign-script", {
        segmentType,
        supportersOnly,
      });

      if (res.data?.success && res.data?.script) {
        if (applyToInput) setCampaignMessage(res.data.script);
        return res.data.script;
      }

      toast.error(res.data?.message || "Failed to generate AI script.");
      return "";
    } catch (error) {
      console.error("Failed to generate campaign script:", error);
      toast.error("Failed to generate AI script.");
      return "";
    } finally {
      setScriptLoadingKey("");
    }
  };

  const sendCampaign = async (segmentType, supportersOnly = false) => {
    const key = `${segmentType}:${supportersOnly ? "top" : "all"}`;
    setSendingKey(key);
    try {
      let messageToSend = campaignMessage.trim();
      if (!messageToSend) {
        messageToSend = await generateCampaignScript(segmentType, supportersOnly, true);
      }

      const res = await api.post("/api/ai/restaurant/create-campaign", {
        segmentType,
        supportersOnly,
        supporterLimit: 20,
        message: messageToSend || undefined,
      });

      if (res.data?.success) {
        toast.success(res.data?.message || `Campaign created for ${segmentType} customers.`);
      } else {
        toast.error(res.data?.message || "Campaign failed.");
      }
    } catch (error) {
      console.error("Failed to create campaign:", error);
      toast.error("Failed to create campaign.");
    }
    setSendingKey("");
  };

  const segmentCards = useMemo(() => {
    return segments.map((segment) => {
      const type = segment.type || "Regular";
      const segmentCustomers = customers
        .filter((c) => c.segment === type)
        .sort((a, b) => toNumber(b.totalSpent) - toNumber(a.totalSpent));

      const topCustomers = segmentCustomers.slice(0, 3);

      return {
        ...segment,
        type,
        color: SEGMENT_COLORS[type] || "#6b7280",
        emoji: SEGMENT_EMOJIS[type] || "🧑",
        percentage: Math.max(0, Math.min(100, toNumber(segment.percentage))),
        customersCount: toNumber(segment.customers),
        avgSpent: toNumber(segment.avgSpent),
        avgOrders: toNumber(segment.avgOrders),
        topCustomers,
      };
    });
  }, [segments, customers]);

  const topCustomersOverall = useMemo(() => {
    return [...customers]
      .sort((a, b) => toNumber(b.totalSpent) - toNumber(a.totalSpent))
      .slice(0, 8);
  }, [customers]);

  const summaryCards = [
    {
      label: "Total Customers",
      value: toNumber(metrics.totalCustomers),
      tone: dark ? "#67e8f9" : "#0ea5e9",
    },
    {
      label: "Active Segments",
      value: segmentCards.length,
      tone: dark ? "#a3e635" : "#65a30d",
    },
    {
      label: "Average Order Value",
      value: formatMoney(metrics.avgOrderValue),
      tone: dark ? "#fdba74" : "#ea580c",
    },
    {
      label: "Retention Rate",
      value: `${toNumber(metrics.retentionRate)}%`,
      tone: dark ? "#c4b5fd" : "#7c3aed",
    },
  ];

  const heroBg = dark
    ? "radial-gradient(1100px 300px at -10% -35%, rgba(34,211,238,0.22), transparent 62%), radial-gradient(900px 260px at 110% -35%, rgba(249,115,22,0.22), transparent 62%), linear-gradient(135deg, #090f1a, #0f172a)"
    : "radial-gradient(1100px 300px at -10% -35%, rgba(14,165,233,0.13), transparent 62%), radial-gradient(900px 260px at 110% -35%, rgba(249,115,22,0.13), transparent 62%), linear-gradient(135deg, #ffffff, #f8fafc)";

  const isEnterprise = String(subscription?.plan || "").toLowerCase() === "enterprise"
    && String(subscription?.status || "").toLowerCase() === "active";

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 20 }}>
        <section
          className="card"
          style={{
            padding: 26,
            borderRadius: 24,
            background: heroBg,
            border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #dbe3ef",
            boxShadow: dark ? "0 18px 42px rgba(0,0,0,0.42)" : "0 12px 34px rgba(15,23,42,0.11)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 10,
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: dark ? "#67e8f9" : "#0369a1",
                  background: dark ? "rgba(34,211,238,0.15)" : "rgba(14,165,233,0.13)",
                  border: dark ? "1px solid rgba(34,211,238,0.35)" : "1px solid rgba(3,105,161,0.2)",
                }}
              >
                AI Segment Studio
              </div>
              <h2 style={{ margin: 0, fontSize: 34, fontWeight: 900, letterSpacing: "-0.8px" }}>
                🎯 Customer Segmentation
              </h2>
              <p style={{ margin: "8px 0 0", fontSize: 14, maxWidth: 680, color: dark ? "rgba(248,250,252,0.84)" : "#334155" }}>
                Full-funnel segmentation view with instant export and campaign actions directly on each segment card.
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btn-outline"
                onClick={exportAllCustomersCsv}
                disabled={loading || customers.length === 0}
                style={{ fontSize: 13, fontWeight: 800 }}
              >
                📊 Export CSV
              </button>
              <button
                className="btn btn-outline"
                onClick={loadSegmentation}
                disabled={loading}
                style={{ fontSize: 13, fontWeight: 800 }}
              >
                {loading ? "Analyzing..." : "Refresh Data"}
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="card" style={{ padding: 56, textAlign: "center" }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🧠</div>
            <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)", fontWeight: 700 }}>
              Crunching customer patterns...
            </p>
          </div>
        ) : (
          <>
            <section className="grid-4">
              {summaryCards.map((item, idx) => (
                <article
                  key={idx}
                  className="stat"
                  style={{
                    borderRadius: 18,
                    background: dark ? "linear-gradient(145deg, #0f172a, #111827)" : "linear-gradient(145deg, #ffffff, #f8fafc)",
                    boxShadow: dark ? "0 10px 24px rgba(0,0,0,0.3)" : "0 8px 24px rgba(15,23,42,0.1)",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", fontWeight: 700 }}>{item.label}</p>
                  <p style={{ margin: "9px 0 0", fontSize: 30, fontWeight: 900, letterSpacing: "-0.5px", color: item.tone }}>{item.value}</p>
                </article>
              ))}
            </section>

             {/* PRECISE CAMPAIGN PLAYBOOK REDO */}
             <section 
                className="card" 
                style={{ 
                  padding: 32, 
                  borderRadius: 28,
                  position: "relative",
                  overflow: "hidden",
                  background: dark ? "rgba(15,23,42,0.6)" : "#fff",
                  boxShadow: dark ? "0 24px 60px rgba(0,0,0,0.5)" : "0 15px 40px rgba(15,23,42,0.08)",
                  border: dark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #eef2f7"
                }}
             >
                {/* Visual Accent */}
                <div style={{
                  position: "absolute", top: -20, right: -20, width: 200, height: 200,
                  borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)", filter: "blur(20px)"
                }} />

                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                   <div style={{ fontSize: 32 }}>🚀</div>
                   <div>
                      <h3 style={{ margin: 0, fontSize: 26, fontWeight: 950, letterSpacing: "-0.5px" }}>Campaign Playbook</h3>
                      <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)", fontWeight: 600 }}>
                         Deploy high-resonance AI campaigns to specific behavioral clusters.
                      </p>
                   </div>
                   {!isEnterprise && (
                      <div style={{ 
                        marginLeft: "auto", background: "#f59e0b", color: "#fff", 
                        padding: "6px 14px", borderRadius: 12, fontSize: 11, fontWeight: 900,
                        textTransform: "uppercase", letterSpacing: 1
                      }}>Enterprise Feature</div>
                   )}
                </div>

                <div style={{ 
                  marginBottom: 14, 
                  padding: "16px 20px", 
                  borderRadius: 20, 
                  background: dark ? "rgba(255,255,255,0.03)" : "#f8fafc",
                  border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #eef2f7"
                }}>
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                         Strategy Message Signal
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "4px 10px", borderRadius: 100 }}>
                         Live Draft
                      </span>
                   </div>
                   <textarea
                      value={campaignMessage}
                      onChange={(e) => setCampaignMessage(e.target.value)}
                      placeholder="Insert your custom campaign logic... or use AI Write below to auto-generate based on segment data."
                      style={{
                        width: "100%", minHeight: 100, borderRadius: 12, border: "none",
                        background: "transparent", color: dark ? "#fff" : "#111827",
                        fontSize: 15, fontWeight: 600, outline: "none", resize: "none",
                        fontFamily: "inherit", lineHeight: 1.6
                      }}
                   />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                   {segmentCards.map((item, idx) => (
                     <article
                       key={idx}
                       style={{
                         padding: 24, borderRadius: 24,
                         background: dark ? `${item.color}0a` : `${item.color}05`,
                         border: `1.5px solid ${item.color}25`,
                         position: "relative", overflow: "hidden"
                       }}
                     >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                           <div style={{ width: 48, height: 48, borderRadius: 14, background: `${item.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                              {item.emoji}
                           </div>
                           <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 18, fontWeight: 900 }}>{item.type}</div>
                              <div style={{ fontSize: 12, color: item.color, fontWeight: 800 }}>{item.customersCount} active targets</div>
                           </div>
                        </div>

                        <p style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600, lineHeight: 1.5, marginBottom: 20 }}>
                           {item.description}
                        </p>

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                           <button 
                             className="btn btn-outline" 
                             onClick={() => generateCampaignScript(item.type, false, true)}
                             disabled={scriptLoadingKey !== ""}
                             style={{ flex: 1, padding: "10px", fontSize: 12, borderRadius: 12, border: `1px solid ${item.color}40`, color: item.color }}
                           >
                             {scriptLoadingKey === `${item.type}:all` ? "Writing..." : "✨ AI Script"}
                           </button>
                           <button 
                             className="btn" 
                             onClick={() => sendCampaign(item.type, false)}
                             disabled={sendingKey !== "" || !isEnterprise}
                             style={{ flex: 2, padding: "10px", fontSize: 13, borderRadius: 12, background: item.color, color: "#fff", fontWeight: 900, boxShadow: `0 8px 20px ${item.color}25` }}
                           >
                             {sendingKey === `${item.type}:all` ? "Dispatching..." : `Send to All ${item.type}`}
                           </button>
                        </div>
                     </article>
                   ))}
                </div>
             </section>

            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
              {segmentCards.map((segment, idx) => (
                <article
                  key={idx}
                  className="card"
                  style={{
                    borderRadius: 20,
                    padding: 22,
                    border: `1.5px solid ${segment.color}55`,
                    background: dark ? "linear-gradient(165deg, rgba(9,15,26,0.98), rgba(15,23,42,0.96))" : "linear-gradient(165deg, #ffffff, #f8fafc)",
                    boxShadow: dark ? "0 8px 24px rgba(0,0,0,0.32)" : "0 10px 26px rgba(15,23,42,0.11)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 20,
                        background: `${segment.color}1f`,
                        border: `1px solid ${segment.color}55`,
                      }}
                    >
                      {segment.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{segment.type}</h3>
                      <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
                        {segment.customersCount} customers
                      </p>
                    </div>
                    <span
                      style={{
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 11,
                        fontWeight: 800,
                        color: segment.color,
                        background: `${segment.color}1f`,
                        border: `1px solid ${segment.color}44`,
                      }}
                    >
                      {segment.percentage}%
                    </span>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 700, letterSpacing: "0.4px" }}>SHARE</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: segment.color }}>{segment.percentage}%</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 999, overflow: "hidden", background: dark ? "#111827" : "#e5e7eb" }}>
                      <div style={{ width: `${segment.percentage}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${segment.color}, ${segment.color}cc)` }} />
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ padding: "10px 12px", borderRadius: 12, background: dark ? "rgba(255,255,255,0.04)" : "#f1f5f9" }}>
                      <div style={{ fontSize: 10, color: "var(--text-light)", fontWeight: 700, letterSpacing: "0.4px" }}>AVG SPENT</div>
                      <div style={{ marginTop: 2, fontSize: 14, fontWeight: 800 }}>{formatMoney(segment.avgSpent)}</div>
                    </div>
                    <div style={{ padding: "10px 12px", borderRadius: 12, background: dark ? "rgba(255,255,255,0.04)" : "#f1f5f9" }}>
                      <div style={{ fontSize: 10, color: "var(--text-light)", fontWeight: 700, letterSpacing: "0.4px" }}>AVG ORDERS</div>
                      <div style={{ marginTop: 2, fontSize: 14, fontWeight: 800 }}>{segment.avgOrders}</div>
                    </div>
                  </div>

                  <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{segment.description || "No description available for this segment."}</p>

                  <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {segment.topCustomers.length > 0 ? (
                      segment.topCustomers.map((c, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 999,
                            padding: "5px 10px",
                            color: dark ? "#e2e8f0" : "#334155",
                            background: dark ? "rgba(255,255,255,0.06)" : "#eef2ff",
                            border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #c7d2fe",
                          }}
                        >
                          {c.name || "Customer"}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>No customer preview yet.</span>
                    )}
                  </div>

                  <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn btn-outline" onClick={() => exportSegment(segment.type)} style={{ fontSize: 12, padding: "7px 12px" }}>
                      📊 Export CSV
                    </button>
                  </div>
                </article>
              ))}
            </section>

            <section className="card" style={{ padding: 24, borderRadius: 20 }}>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>🏆 Top Customers Overall</h3>
              <p style={{ margin: "6px 0 14px", fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
                Highest-spending customers across all segments.
              </p>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Segment</th>
                      <th>Total Orders</th>
                      <th>Total Spent</th>
                      <th>Avg Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomersOverall.map((customer, idx) => {
                      const segType = customer.segment || "Regular";
                      const segColor = SEGMENT_COLORS[segType] || "#6b7280";

                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700 }}>{customer.name || "Customer"}</td>
                          <td>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                borderRadius: 999,
                                padding: "4px 10px",
                                color: segColor,
                                background: `${segColor}1a`,
                                border: `1px solid ${segColor}44`,
                              }}
                            >
                              {SEGMENT_EMOJIS[segType] || "🧑"} {segType}
                            </span>
                          </td>
                          <td>{toNumber(customer.totalOrders)}</td>
                          <td>{formatMoney(customer.totalSpent)}</td>
                          <td>{formatMoney(customer.avgOrder)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}
