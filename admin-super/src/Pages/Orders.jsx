import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { BACKEND_URL } from "../config";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken");
      const res = await axios.get(`${BACKEND_URL}/api/order/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setOrders(res.data.data.reverse());
      } else {
        toast.error(res.data.message || "Error fetching orders");
      }
    } catch (err) {
      toast.error(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const statusHandler = async (orderId, status) => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await axios.post(`${BACKEND_URL}/api/order/status`, {
        orderId,
        status,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        toast.success("Status updated");
        fetchAllOrders();
      } else {
        toast.error(res.data.message || "Error updating status");
      }
    } catch (err) {
      toast.error(err?.message || "Network error");
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  return (
    <div style={{ maxWidth: 1200 }}>
      <h1 style={{ marginTop: 0 }}>Orders</h1>

      {loading && <div style={{ opacity: 0.7 }}>Loading...</div>}

      <div style={styles.list}>
        {orders.map((order) => (
          <div key={order._id} style={styles.card}>
            <div style={styles.topRow}>
              <div style={{ fontWeight: 900 }}>
                Order #{order._id.slice(-6).toUpperCase()}
              </div>
              <div style={{ opacity: 0.8 }}>
                {new Date(order.date).toLocaleString()}
              </div>
            </div>

            <div style={styles.grid}>
              <div>
                <div style={styles.label}>Customer</div>
                <div style={styles.value}>
                  {order.address?.firstName} {order.address?.lastName}
                </div>
                <div style={{ opacity: 0.8, marginTop: 6 }}>
                  {order.address?.street}, {order.address?.city},{" "}
                  {order.address?.state}, {order.address?.country},{" "}
                  {order.address?.zipcode}
                </div>
                <div style={{ opacity: 0.8, marginTop: 6 }}>
                  📞 {order.address?.phone}
                </div>
              </div>

              <div>
                <div style={styles.label}>Items</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {order.items?.map((it, idx) => (
                    <div key={idx} style={styles.item}>
                      <span style={{ fontWeight: 800 }}>{it.name}</span>
                      <span style={{ opacity: 0.8 }}>x {it.quantity}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, opacity: 0.8 }}>
                  Total items: {order.items?.length || 0}
                </div>
              </div>

              <div>
                <div style={styles.label}>Amount</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>
                  AED {order.amount}
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={styles.label}>Status</div>
                  <select
                    style={styles.select}
                    value={order.status}
                    onChange={(e) => statusHandler(order._id, e.target.value)}
                  >
                    <option value="Food Processing">Food Processing</option>
                    <option value="Out for delivery">Out for delivery</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {(() => {
                    const method = order.paymentMethod || (order.payment ? "stripe" : "cod");
                    const map = {
                      cod:    { label: "💵 Cash on Delivery", bg: "#fef3c7", color: "#92400e" },
                      stripe: { label: "💳 Paid Online",      bg: "#d1fae5", color: "#065f46" },
                      split:  { label: "🧮 Split Payment",    bg: "#ede9fe", color: "#5b21b6" },
                    };
                    const m = map[method] || map.cod;
                    return (
                      <span style={{ fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 50, background: m.bg, color: m.color }}>
                        {m.label}
                      </span>
                    );
                  })()}
                  {!order.payment && order.paymentMethod !== "cod" && (
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 50, background: "#fee2e2", color: "#991b1b" }}>
                      ❌ Unpaid
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {!loading && orders.length === 0 && (
          <div style={{ opacity: 0.7 }}>No orders found.</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  list: { display: "flex", flexDirection: "column", gap: 14, marginTop: 12 },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 12,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1.2fr 0.8fr",
    gap: 14,
  },
  label: { fontSize: 12, opacity: 0.7, marginBottom: 6 },
  value: { fontSize: 16, fontWeight: 800 },
  item: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.25)",
  },
  select: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
    outline: "none",
    cursor: "pointer",
    fontWeight: 700,
  },
};