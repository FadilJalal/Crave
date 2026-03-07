import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";

const STATUS_COLOR = {
  "Food Processing": { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
  "Out for delivery": { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
  "Out for Delivery": { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
  "Delivered":        { bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
};

function StatCard({ icon, label, value, sub, accent, loading }) {
  return (
    <div style={{
      background: "white",
      borderRadius: 20,
      padding: "22px 24px",
      border: "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* accent bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "20px 20px 0 0" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 10 }}>
            {label}
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#111827", letterSpacing: "-1px", lineHeight: 1 }}>
            {loading ? <span style={{ opacity: 0.3 }}>—</span> : value}
          </div>
          {sub && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, fontWeight: 600 }}>{sub}</div>}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: accent + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [foods, setFoods]   = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const [foodRes, orderRes] = await Promise.all([
        api.get("/api/restaurantadmin/foods"),
        api.get("/api/order/restaurant/list"),
      ]);
      if (foodRes.data?.success)  setFoods(foodRes.data.data || []);
      if (orderRes.data?.success) setOrders(orderRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const today         = new Date().toDateString();
  const todayOrders   = orders.filter(o => new Date(o.createdAt).toDateString() === today);
  const pendingOrders = orders.filter(o => o.status === "Food Processing");
  const todayRevenue  = todayOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalRevenue  = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const recentOrders  = orders.slice(0, 6);

  // category breakdown
  const categoryMap = {};
  foods.forEach(f => { categoryMap[f.category] = (categoryMap[f.category] || 0) + 1; });
  const topCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <RestaurantLayout>
      <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#111827", letterSpacing: "-0.8px" }}>
              Dashboard
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#9ca3af", fontWeight: 500 }}>
              {new Date().toLocaleDateString("en-AE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => navigate("/orders")} style={{
              padding: "10px 18px", borderRadius: 12, border: "1px solid #e5e7eb",
              background: "white", fontWeight: 700, cursor: "pointer", fontSize: 13, color: "#374151",
            }}>
              🧾 Orders {pendingOrders.length > 0 && (
                <span style={{ marginLeft: 6, background: "#ff4e2a", color: "white", borderRadius: 999, padding: "2px 7px", fontSize: 11 }}>
                  {pendingOrders.length}
                </span>
              )}
            </button>
            <button onClick={() => navigate("/add-food")} style={{
              padding: "10px 18px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #ff4e2a, #ff6a3d)",
              color: "white", fontWeight: 800, cursor: "pointer", fontSize: 13,
              boxShadow: "0 4px 14px rgba(255,78,42,0.35)",
            }}>
              + Add Food
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          <StatCard icon="🍽️" label="Menu Items"      value={foods.length}       sub={`${topCategories.length} categories`}  accent="#6366f1" loading={loading} />
          <StatCard icon="📦" label="Today's Orders"  value={todayOrders.length} sub="orders placed today"                    accent="#f59e0b" loading={loading} />
          <StatCard icon="⏳" label="Pending"         value={pendingOrders.length} sub="awaiting processing"                  accent="#ef4444" loading={loading} />
          <StatCard icon="💰" label="Today's Revenue" value={`AED ${todayRevenue}`} sub={`Total: AED ${totalRevenue}`}        accent="#22c55e" loading={loading} />
        </div>

        {/* Two column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Recent Orders */}
          <div style={{ background: "white", borderRadius: 20, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, color: "#111827" }}>Recent Orders</div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{orders.length} total orders</div>
              </div>
              <button onClick={() => navigate("/orders")} style={{
                fontSize: 12, fontWeight: 700, color: "#ff4e2a", background: "#fff1ee",
                border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer",
              }}>View all →</button>
            </div>

            {loading ? (
              <div style={{ padding: 22 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ height: 52, background: "#f9fafb", borderRadius: 12, marginBottom: 8 }} />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
                <div style={{ fontSize: 32 }}>📭</div>
                <div style={{ fontWeight: 600, marginTop: 8 }}>No orders yet</div>
              </div>
            ) : (
              <div style={{ padding: "10px 14px" }}>
                {recentOrders.map((order) => {
                  const sc = STATUS_COLOR[order.status] || STATUS_COLOR["Food Processing"];
                  return (
                    <div key={order._id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 10px", borderRadius: 12,
                      transition: "background .15s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: sc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                        }}>📦</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {order.address?.firstName} {order.address?.lastName}
                          </div>
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {order.items?.map(i => `${i.name} x${i.quantity}`).join(", ")}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, marginLeft: 10 }}>
                        <div style={{ fontWeight: 900, fontSize: 13, color: "#111827" }}>AED {order.amount}</div>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: sc.bg, color: sc.color, marginTop: 3 }}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Menu breakdown */}
            <div style={{ background: "white", borderRadius: 20, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16, color: "#111827" }}>Menu Overview</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{foods.length} items across {topCategories.length} categories</div>
                </div>
                <button onClick={() => navigate("/menu")} style={{
                  fontSize: 12, fontWeight: 700, color: "#6366f1", background: "#eef2ff",
                  border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                }}>Manage →</button>
              </div>
              <div style={{ padding: "12px 16px" }}>
                {loading ? (
                  <div style={{ height: 80, background: "#f9fafb", borderRadius: 12 }} />
                ) : foods.length === 0 ? (
                  <div style={{ padding: "20px 0", textAlign: "center", color: "#9ca3af" }}>
                    <div>No items yet</div>
                    <button onClick={() => navigate("/add-food")} style={{ marginTop: 10, padding: "8px 16px", borderRadius: 10, background: "#ff4e2a", color: "white", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                      + Add your first item
                    </button>
                  </div>
                ) : (
                  <>
                    {foods.slice(0, 4).map((f) => (
                      <div key={f._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 8px", borderRadius: 10 }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{f.name}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>{f.category}</div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: "#374151" }}>AED {f.price}</div>
                      </div>
                    ))}
                    {foods.length > 4 && (
                      <div style={{ textAlign: "center", padding: "8px 0 4px", fontSize: 12, color: "#9ca3af" }}>
                        +{foods.length - 4} more items
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ background: "linear-gradient(135deg, #1f2937, #111827)", borderRadius: 20, padding: "22px", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: "white", marginBottom: 4 }}>Quick Actions</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Common tasks at your fingertips</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Add New Item", icon: "➕", path: "/add-food", bg: "#ff4e2a" },
                  { label: "View Orders",  icon: "🧾", path: "/orders",   bg: "#6366f1" },
                  { label: "Edit Menu",    icon: "✏️", path: "/menu",     bg: "#0ea5e9" },
                  { label: "Refresh Data", icon: "🔄", path: null,        bg: "#22c55e", action: load },
                ].map((item) => (
                  <button key={item.label} onClick={() => item.action ? item.action() : navigate(item.path)} style={{
                    padding: "14px 12px", borderRadius: 14, border: "none",
                    background: item.bg + "22", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 10,
                    transition: "background .15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = item.bg + "40"}
                    onMouseLeave={e => e.currentTarget.style.background = item.bg + "22"}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "white" }}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </RestaurantLayout>
  );
}