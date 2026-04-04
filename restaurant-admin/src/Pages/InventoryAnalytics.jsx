import { useEffect, useState, useMemo } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { toast } from "react-toastify";

const InventoryAnalytics = () => {
  const [timeframe, setTimeframe] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [turnoverData, setTurnoverData] = useState(null);
  const [supplierData, setSupplierData] = useState(null);
  const [costData, setCostData] = useState(null);
  const [tab, setTab] = useState("inventory"); // inventory, turnover, suppliers, costs

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [inv, turn, supp, cost] = await Promise.all([
        api.get(`/api/inventory/analytics/inventory?timeframe=${timeframe}`).catch(err => {
          console.error("Failed to load inventory analytics:", err);
          return { data: { success: false } };
        }),
        api.get(`/api/inventory/analytics/turnover?timeframe=${timeframe}`).catch(err => {
          console.error("Failed to load turnover analytics:", err);
          return { data: { success: false } };
        }),
        api.get(`/api/inventory/analytics/suppliers`).catch(err => {
          console.error("Failed to load supplier analytics:", err);
          return { data: { success: false } };
        }),
        api.get(`/api/inventory/analytics/costs`).catch(err => {
          console.error("Failed to load cost analytics:", err);
          return { data: { success: false } };
        })
      ]);

      if (inv.data?.success) setAnalyticsData(inv.data.data);
      if (turn.data?.success) setTurnoverData(turn.data.data);
      if (supp.data?.success) setSupplierData(supp.data.data);
      if (cost.data?.success) setCostData(cost.data.data);

      // Show warning if any failed silently
      const failedLoads = [inv, turn, supp, cost].filter(r => !r.data?.success).length;
      if (failedLoads > 0) {
        console.warn(`${failedLoads} analytics endpoints failed to load`);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
      toast.error("Failed to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);

  // Styles
  const safeAnalyticsData = analyticsData || {
    current: { totalValue: 0, totalItems: 0, totalUnits: 0, byCategory: [] },
    summary: { timeframe, avgDailyUsage: 0, totalDaysTracked: 0, projectedMonthlyUsage: 0 }
  };

  const categoryRows = safeAnalyticsData.current.byCategory || [];

  const s = {
    wrap: { maxWidth: 1200, margin: "0 auto", padding: "0 20px" },
    hdr: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 24, flexWrap: "wrap" },
    hdrLeft: { flex: 1 },
    title: { fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: -0.6 },
    sub: { fontSize: 13, color: "var(--muted)", margin: "4px 0 0", fontWeight: 500 },
    tabs: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 12 },
    tab: (active) => ({
      padding: "8px 16px",
      borderRadius: 8,
      border: active ? "2px solid var(--orange)" : "1px solid transparent",
      background: active ? "var(--orangeSoft)" : "transparent",
      color: active ? "var(--orange)" : "var(--text)",
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer",
      fontFamily: "inherit"
    }),
    select: { padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "#f9fafb", fontFamily: "inherit", cursor: "pointer", fontSize: 12 },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16, marginBottom: 24 },
    card: {
      background: "white",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 16,
      boxShadow: "0 2px 10px rgba(0,0,0,0.04)"
    },
    cardTitle: { fontSize: 12, color: "var(--muted)", fontWeight: 700, margin: "0 0 8px", textTransform: "uppercase" },
    cardValue: { fontSize: 28, fontWeight: 900, margin: 0, color: "var(--text)", letterSpacing: -0.6 },
    cardSub: { fontSize: 11, color: "var(--muted)", fontWeight: 600, margin: "4px 0 0" },
    largCard: { gridColumn: "1 / -1" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
    th: { padding: "12px 14px", textAlign: "left", fontWeight: 800, borderBottom: "2px solid var(--border)", background: "#f9fafb", color: "#374151" },
    td: { padding: "12px 14px", borderBottom: "1px solid #f3f4f6" },
    badge: (color) => ({
      display: "inline-block",
      padding: "4px 8px",
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      background: color === "high" ? "#dcfce7" : color === "medium" ? "#fef3c7" : "#fee2e2",
      color: color === "high" ? "#166534" : color === "medium" ? "#92400e" : "#991b1b"
    }),
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: 900, margin: "0 0 16px" },
    bar: { height: 6, borderRadius: 50, background: "#f3f4f6", overflow: "hidden" },
    barFill: (color) => ({ height: "100%", background: color, borderRadius: 50 }),
    chartContainer: { background: "white", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 24 }
  };

  if (loading) {
    return (
      <RestaurantLayout>
        <div style={s.wrap}>
          <div style={s.hdr}><h1 style={s.title}>📊 Inventory Analytics</h1></div>
          <div style={s.grid}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
          </div>
          <div style={s.grid}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 300, borderRadius: 12 }} />)}
          </div>
        </div>
      </RestaurantLayout>
    );
  }

  const hasData = analyticsData || turnoverData || supplierData || costData;
  const isError = !loading && !hasData;

  if (isError) {
    return (
      <RestaurantLayout>
        <div style={s.wrap}>
          <div style={s.hdr}><h1 style={s.title}>📊 Inventory Analytics</h1></div>
          <div style={{ 
            textAlign: "center", 
            padding: "60px 20px", 
            background: "white", 
            borderRadius: 12, 
            border: "1px solid var(--border)" 
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <p style={{ fontSize: 18, fontWeight: 900, margin: "0 0 8px" }}>Failed to Load Analytics</p>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 24px" }}>We couldn't load your inventory analytics. Please try again.</p>
            <button className="btn" onClick={loadAnalytics} style={{ fontSize: 13 }}>↻ Retry</button>
          </div>
        </div>
      </RestaurantLayout>
    );
  }

  return (
    <RestaurantLayout>
      <div style={s.wrap}>
        {/* Header */}
        <div style={s.hdr}>
          <div style={s.hdrLeft}>
            <h1 style={s.title}>📊 Inventory Analytics</h1>
            <p style={s.sub}>Track stock value, turnover, suppliers, and costs</p>
          </div>
          <select style={s.select} value={timeframe} onChange={e => setTimeframe(e.target.value)}>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="60d">Last 60 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          <button style={s.tab(tab === "inventory")} onClick={() => setTab("inventory")}>📦 Inventory Value</button>
          <button style={s.tab(tab === "turnover")} onClick={() => setTab("turnover")}>🔄 Stock Turnover</button>
          <button style={s.tab(tab === "suppliers")} onClick={() => setTab("suppliers")}>🏢 Suppliers</button>
          <button style={s.tab(tab === "costs")} onClick={() => setTab("costs")}>💰 Cost Analysis</button>
        </div>

        {/* INVENTORY VALUE TAB */}
        {tab === "inventory" && analyticsData && (
          <div>
            {/* Current Snapshot */}
            <div style={s.grid}>
              <div style={s.card}>
                <p style={s.cardTitle}>Total Inventory Value</p>
                <p style={s.cardValue}>AED {safeAnalyticsData.current.totalValue.toLocaleString()}</p>
                <p style={s.cardSub}>{safeAnalyticsData.current.totalItems} items in stock</p>
              </div>
              <div style={s.card}>
                <p style={s.cardTitle}>Total Units</p>
                <p style={s.cardValue}>{safeAnalyticsData.current.totalUnits.toLocaleString()}</p>
                <p style={s.cardSub}>Across all categories</p>
              </div>
              <div style={s.card}>
                <p style={s.cardTitle}>Avg Daily Usage</p>
                <p style={s.cardValue}>AED {analyticsData.summary.avgDailyUsage.toLocaleString()}</p>
                <p style={s.cardSub}>Based on {analyticsData.summary.totalDaysTracked} days</p>
              </div>
              <div style={s.card}>
                <p style={s.cardTitle}>Projected Monthly</p>
                <p style={s.cardValue}>AED {analyticsData.summary.projectedMonthlyUsage.toLocaleString()}</p>
                <p style={s.cardSub}>Estimated usage</p>
              </div>
            </div>

            {/* Category Breakdown */}
            <div style={s.section}>
              <h2 style={s.sectionTitle}>By Category</h2>
              <div style={s.chartContainer}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Category</th>
                      <th style={s.th}>Items</th>
                      <th style={s.th}>Units</th>
                      <th style={s.th}>Total Value</th>
                      <th style={s.th}>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryRows.map((cat, idx) => (
                      <tr key={idx}>
                        <td style={s.td}>
                          <strong>{cat.category.replace(/_/g, " ").toUpperCase()}</strong>
                        </td>
                        <td style={s.td}>{cat.items}</td>
                        <td style={s.td}>{cat.units.toLocaleString()}</td>
                        <td style={s.td}>
                          <strong>AED {cat.value.toLocaleString()}</strong>
                        </td>
                        <td style={s.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ ...s.bar, width: 60 }}>
                              <div style={s.barFill((cat.percentage / 100) * 360)} />
                            </div>
                            <strong>{cat.percentage}%</strong>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TURNOVER TAB */}
        {tab === "turnover" && turnoverData && (
          <div>
            {turnoverData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>No usage data yet</p>
                <p style={{ fontSize: 13, margin: "4px 0 0" }}>Complete some orders to see turnover analytics</p>
              </div>
            ) : (
              turnoverData.map((cat, idx) => (
                <div key={idx} style={s.section}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <h2 style={{ ...s.sectionTitle, margin: 0 }}>
                      {cat.category.replace(/_/g, " ").toUpperCase()}
                    </h2>
                    <div
                      style={{
                        ...s.badge(cat.avgTurnover > 70 ? "high" : cat.avgTurnover > 40 ? "medium" : "low"),
                        marginLeft: "auto"
                      }}
                    >
                      Avg Turnover: {cat.avgTurnover}%
                    </div>
                  </div>

                  <div style={s.chartContainer}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>Item</th>
                          <th style={s.th}>Used</th>
                          <th style={s.th}>Turnover</th>
                          <th style={s.th}>Efficiency</th>
                          <th style={s.th}>Current Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.items.map((item, i) => (
                          <tr key={i}>
                            <td style={s.td}>{item.name}</td>
                            <td style={s.td}>AED {item.usedValue.toLocaleString()}</td>
                            <td style={s.td}>
                              <strong>{item.turnoverRate}%</strong>
                            </td>
                            <td style={s.td}>
                              <span style={s.badge(item.efficiency)}>
                                {item.efficiency.toUpperCase()}
                              </span>
                            </td>
                            <td style={s.td}>{item.currentStock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SUPPLIERS TAB */}
        {tab === "suppliers" && supplierData && (
          <div>
            {supplierData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
                <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>No suppliers yet</p>
                <p style={{ fontSize: 13, margin: "4px 0 0" }}>Add suppliers to your inventory items to see analytics</p>
              </div>
            ) : (
              supplierData.map((supplier, idx) => (
                <div key={idx} style={s.section}>
                  <div style={{ ...s.chartContainer, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
                      <div>
                        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 900 }}>{supplier.name || "Unknown Supplier"}</h3>
                        {supplier.contact && <p style={{ margin: "0 0 2px", fontSize: 12, color: "var(--muted)" }}>📞 {supplier.contact}</p>}
                        {supplier.email && <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>📧 {supplier.email}</p>}
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ ...s.cardTitle, margin: 0 }}>Quality Score</p>
                          <p style={{ fontSize: 20, fontWeight: 900, margin: "4px 0 0" }}>{supplier.qualityScore}/100</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ ...s.cardTitle, margin: 0 }}>Total Value</p>
                          <p style={{ fontSize: 20, fontWeight: 900, margin: "4px 0 0", color: "#2563eb" }}>AED {supplier.totalValue.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                      <p style={{ ...s.cardTitle, marginBottom: 12 }}>Items Supplied ({supplier.itemCount})</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                        {supplier.items.map((item, i) => (
                          <div key={i} style={{ padding: 12, background: "#f9fafb", borderRadius: 8, border: "1px solid #f3f4f6" }}>
                            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 13 }}>{item.name}</p>
                            <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--muted)" }}>Value: AED {item.value.toLocaleString()}</p>
                            <p style={{ margin: "0 0 4px", fontSize: 11, color: "var(--muted)" }}>Stock: {item.stock}</p>
                            {item.expiryDate && (
                              <p style={{ margin: 0, fontSize: 11, color: new Date(item.expiryDate) < new Date() ? "#dc2626" : "var(--muted)" }}>
                                Expires: {new Date(item.expiryDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* COSTS TAB */}
        {tab === "costs" && costData && (
          <div>
            {/* Current Investment */}
            <div style={s.grid}>
              <div style={s.card}>
                <p style={s.cardTitle}>Total Capital Invested</p>
                <p style={s.cardValue}>AED {costData.current.totalCapitalInvested.toLocaleString()}</p>
                <p style={s.cardSub}>Current inventory value</p>
              </div>
              <div style={s.card}>
                <p style={s.cardTitle}>Average Unit Cost</p>
                <p style={s.cardValue}>AED {costData.current.averageUnitCost.toFixed(2)}</p>
                <p style={s.cardSub}>Across all items</p>
              </div>
              <div style={s.card}>
                <p style={s.cardTitle}>Total Cost Used</p>
                <p style={s.cardValue}>AED {costData.usage.totalCostUsed.toLocaleString()}</p>
                <p style={s.cardSub}>From orders</p>
              </div>
            </div>

            {/* Highest Cost Items */}
            <div style={s.section}>
              <h2 style={s.sectionTitle}>💎 Most Expensive Items</h2>
              <div style={s.chartContainer}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Item</th>
                      <th style={s.th}>Unit Cost (AED)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costData.current.highestCostItems.slice(0, 10).map((item, idx) => (
                      <tr key={idx}>
                        <td style={s.td}>{item.name}</td>
                        <td style={s.td}>
                          <strong>AED {item.cost.toFixed(2)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lowest Cost Items */}
            <div style={s.section}>
              <h2 style={s.sectionTitle}>💸 Budget-Friendly Items</h2>
              <div style={s.chartContainer}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Item</th>
                      <th style={s.th}>Unit Cost (AED)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costData.current.lowestCostItems.slice(0, 10).map((item, idx) => (
                      <tr key={idx}>
                        <td style={s.td}>{item.name}</td>
                        <td style={s.td}>
                          <strong>AED {item.cost.toFixed(2)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cost by Category */}
            <div style={s.section}>
              <h2 style={s.sectionTitle}>By Category</h2>
              <div style={s.chartContainer}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Category</th>
                      <th style={s.th}>Items</th>
                      <th style={s.th}>Total Value</th>
                      <th style={s.th}>Avg Unit Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costData.usage.costByCategory.map((cat, idx) => (
                      <tr key={idx}>
                        <td style={s.td}>
                          <strong>{cat.category.replace(/_/g, " ").toUpperCase()}</strong>
                        </td>
                        <td style={s.td}>{cat.items}</td>
                        <td style={s.td}>AED {cat.totalValue.toLocaleString()}</td>
                        <td style={s.td}>AED {cat.avgUnitCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
};

export default InventoryAnalytics;
