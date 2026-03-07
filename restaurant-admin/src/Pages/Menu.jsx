import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RestaurantLayout from "../components/RestaurantLayout";
import { api, BASE_URL } from "../utils/api";

export default function Menu() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadFoods = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/restaurantadmin/foods");
      if (res.data?.success) setFoods(res.data.data || []);
      else alert(res.data?.message || "Failed to load menu");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  const removeFood = async (id) => {
    if (!window.confirm("Remove this item from the menu?")) return;
    try {
      const res = await api.post("/api/food/remove", { id });
      if (res.data?.success) {
        setFoods((prev) => prev.filter((f) => f._id !== id));
      } else {
        alert(res.data?.message || "Failed to remove item");
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to remove item");
    }
  };

  const editFood = async (food) => {
    navigate(`/edit-food/${food._id}`);
  };

  useEffect(() => {
    loadFoods();
  }, []);

  return (
    <RestaurantLayout>
      <h2 style={{ marginTop: 0 }}>Menu ({foods.length} items)</h2>

      {loading ? (
        <p className="muted">Loading...</p>
      ) : foods.length === 0 ? (
        <p className="muted">No menu items yet. Go to Add Food to get started.</p>
      ) : (
        <div className="list">
          {foods.map((f) => (
            <div key={f._id} className="list-row">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img
                  src={`${BASE_URL}/images/${f.image}`}
                  alt={f.name}
                  style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", border: "1px solid #e2e8f0" }}
                  onError={(e) => { e.target.style.display = "none"; }}
                />
                <div>
                  <div style={{ fontWeight: 700 }}>{f.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{f.category}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontWeight: 700 }}>AED {f.price}</div>
                <button
                  onClick={() => editFood(f)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: "1px solid #bfdbfe",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => removeFood(f._id)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: "1px solid #fca5a5",
                    background: "#fff1f1",
                    color: "#dc2626",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </RestaurantLayout>
  );
}
