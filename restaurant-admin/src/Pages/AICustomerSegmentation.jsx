import { useState, useEffect } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";

export default function AICustomerSegmentation() {
  const [segments, setSegments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    loadSegmentation();
  }, []);

  const loadSegmentation = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/ai/restaurant/customer-segmentation");
      if (res.data.success) {
        setSegments(res.data.segments || []);
        setCustomers(res.data.customers || []);
        setMetrics(res.data.metrics || {});
      }
    } catch (error) {
      console.error("Failed to load segmentation:", error);
    }
    setLoading(false);
  };

  const getSegmentColor = (type) => {
    const colors = {
      "VIP": "#16a34a",
      "Loyal": "#2563eb", 
      "Regular": "#f59e0b",
      "At Risk": "#ea580c",
      "Lost": "#dc2626",
      "New": "#8b5cf6"
    };
    return colors[type] || "#6b7280";
  };

  const getSegmentEmoji = (type) => {
    const emojis = {
      "VIP": "👑",
      "Loyal": "💎",
      "Regular": "👤", 
      "At Risk": "⚠️",
      "Lost": "💔",
      "New": "🌟"
    };
    return emojis[type] || "👤";
  };

  const exportSegment = async (segmentType) => {
    try {
      const res = await api.post("/api/ai/restaurant/export-segment", {
        segmentType,
        format: "csv"
      });
      
      if (res.data.success) {
        // Create download link
        const url = window.URL.createObjectURL(new Blob([res.data.csv]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${segmentType}_customers.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      console.error("Failed to export segment:", error);
    }
  };

  const sendCampaign = async (segmentType) => {
    try {
      const res = await api.post("/api/ai/restaurant/create-campaign", {
        segmentType,
        message: `Special offer for our ${segmentType.toLowerCase()} customers!`
      });
      
      if (res.data.success) {
        alert(`Campaign created for ${segmentType} customers!`);
      }
    } catch (error) {
      console.error("Failed to create campaign:", error);
    }
  };

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1400 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 8px" }}>🎯 AI Customer Segmentation</h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 32px" }}>
          AI-powered customer segmentation to understand and target different customer groups
        </p>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)" }}>
              Analyzing customer behavior...
            </p>
          </div>
        ) : (
          <>
            {/* Overview Metrics */}
            <div className="grid-4" style={{ marginBottom: 32 }}>
              <div className="stat">
                <p style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700, margin: 0 }}>Total Customers</p>
                <p style={{ fontSize: 32, fontWeight: 900, margin: "8px 0 0", color: "var(--primary)" }}>
                  {metrics.totalCustomers || 0}
                </p>
              </div>
              <div className="stat">
                <p style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700, margin: 0 }}>Active Segments</p>
                <p style={{ fontSize: 32, fontWeight: 900, margin: "8px 0 0", color: "var(--success)" }}>
                  {segments.length}
                </p>
              </div>
              <div className="stat">
                <p style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700, margin: 0 }}>Avg Order Value</p>
                <p style={{ fontSize: 32, fontWeight: 900, margin: "8px 0 0", color: "var(--warning)" }}>
                  AED {metrics.avgOrderValue || 0}
                </p>
              </div>
              <div className="stat">
                <p style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700, margin: 0 }}>Retention Rate</p>
                <p style={{ fontSize: 32, fontWeight: 900, margin: "8px 0 0", color: "var(--info)" }}>
                  {metrics.retentionRate || 0}%
                </p>
              </div>
            </div>

            {/* Segments Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 32 }}>
              {segments.map((segment, index) => (
                <div 
                  key={index}
                  className="card"
                  style={{ 
                    padding: 24,
                    cursor: "pointer",
                    border: selectedSegment === segment.type ? "2px solid var(--primary)" : "1px solid var(--border)",
                    transform: selectedSegment === segment.type ? "scale(1.02)" : "scale(1)"
                  }}
                  onClick={() => setSelectedSegment(selectedSegment === segment.type ? null : segment.type)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: `${getSegmentColor(segment.type)}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20
                    }}>
                      {getSegmentEmoji(segment.type)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                        {segment.type}
                      </h3>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>
                        {segment.customers} customers
                      </p>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 600 }}>OF TOTAL</span>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{segment.percentage}%</span>
                    </div>
                    <div style={{
                      height: 6,
                      background: "var(--bg-secondary)",
                      borderRadius: 3,
                      overflow: "hidden"
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${segment.percentage}%`,
                        background: getSegmentColor(segment.type),
                        borderRadius: 3
                      }} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 10, color: "var(--text-light)", fontWeight: 600 }}>AVG SPENT</span>
                      <p style={{ fontSize: 14, fontWeight: 700, margin: "2px 0 0" }}>
                        AED {segment.avgSpent}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "var(--text-light)", fontWeight: 600 }}>AVG ORDERS</span>
                      <p style={{ fontSize: 14, fontWeight: 700, margin: "2px 0 0" }}>
                        {segment.avgOrders}
                      </p>
                    </div>
                  </div>

                  <div style={{ marginTop: 16, padding: 12, background: "var(--bg-secondary)", borderRadius: 8 }}>
                    <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, fontStyle: "italic" }}>
                      {segment.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Segment Details */}
            {selectedSegment && (
              <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
                    {getSegmentEmoji(selectedSegment)} {selectedSegment} Customers
                  </h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button 
                      className="btn btn-outline"
                      onClick={() => exportSegment(selectedSegment)}
                      style={{ fontSize: 12 }}
                    >
                      📊 Export CSV
                    </button>
                    <button 
                      className="btn"
                      onClick={() => sendCampaign(selectedSegment)}
                      style={{ fontSize: 12 }}
                    >
                      📧 Create Campaign
                    </button>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Email</th>
                        <th>Total Orders</th>
                        <th>Total Spent</th>
                        <th>Avg Order</th>
                        <th>Last Order</th>
                        <th>Preferences</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers
                        .filter(c => c.segment === selectedSegment)
                        .slice(0, 10)
                        .map((customer, index) => (
                          <tr key={index}>
                            <td>
                              <span style={{ fontWeight: 700 }}>{customer.name}</span>
                            </td>
                            <td style={{ fontSize: 13 }}>{customer.email}</td>
                            <td>{customer.totalOrders}</td>
                            <td>AED {customer.totalSpent}</td>
                            <td>AED {customer.avgOrder}</td>
                            <td>{customer.lastOrder}</td>
                            <td>
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {customer.preferences?.slice(0, 2).map((pref, i) => (
                                  <span key={i} className="badge badge-info" style={{ fontSize: 10 }}>
                                    {pref}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* AI Insights */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 16px" }}>🧠 AI Insights</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ padding: 16, background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", borderRadius: 12, border: "1px solid #bbf7d0" }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#166534" }}>
                    🎯 <strong>Opportunity:</strong> VIP customers represent only {segments.find(s => s.type === "VIP")?.percentage || 0}% of customers but contribute 35% of revenue.
                  </p>
                </div>
                <div style={{ padding: 16, background: "linear-gradient(135deg, #fef3c7, #fde68a)", borderRadius: 12, border: "1px solid #fbbf24" }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#92400e" }}>
                    ⚠️ <strong>Risk Alert:</strong> {segments.find(s => s.type === "At Risk")?.customers || 0} customers at risk of churning. Target with retention campaigns.
                  </p>
                </div>
                <div style={{ padding: 16, background: "linear-gradient(135deg, #dbeafe, #bfdbfe)", borderRadius: 12, border: "1px solid #93c5fd" }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1e40af" }}>
                    💡 <strong>Recommendation:</strong> Focus on converting "Regular" customers to "Loyal" with personalized offers and loyalty programs.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}
