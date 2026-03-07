import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { BACKEND_URL } from "../config";

export default function FoodList() {
  const [list, setList] = useState([]);

  const fetchList = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await axios.get(`${BACKEND_URL}/api/food/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setList(res.data.data);
      else toast.error("Error loading foods");
    } catch (err) {
      toast.error(err?.message || "Network error");
    }
  };

  const removeFood = async (id) => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await axios.post(`${BACKEND_URL}/api/food/remove`, { id }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) toast.success("Food removed");
      else toast.error(res.data.message || "Error removing");
      fetchList();
    } catch (err) {
      toast.error(err?.message || "Network error");
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  return (
    <div style={{ maxWidth: 1100 }}>
      <h1 style={{ marginTop: 0 }}>Food List</h1>

      <div style={styles.table}>
        <div style={{ ...styles.row, ...styles.head }}>
          <div>Image</div>
          <div>Name</div>
          <div>Restaurant</div>
          <div>Category</div>
          <div>Price</div>
          <div>Action</div>
        </div>

        {list.map((item) => (
          <div key={item._id} style={styles.row}>
            <div>
              <img
                src={`${BACKEND_URL}/images/${item.image}`}
                alt=""
                style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }}
              />
            </div>
            <div>{item.name}</div>
            <div>{item.restaurantId?.name || "—"}</div>
            <div>{item.category}</div>
            <div>AED {item.price}</div>
            <div>
              <button style={styles.x} onClick={() => removeFood(item._id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  table: {
    marginTop: 12,
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  head: {
    background: "rgba(255,255,255,0.06)",
    fontWeight: 800,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "80px 1.2fr 1.1fr 0.9fr 0.7fr 0.7fr",
    gap: 12,
    padding: 14,
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  x: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
};