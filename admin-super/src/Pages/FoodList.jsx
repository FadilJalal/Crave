import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { BACKEND_URL } from "../config";

export default function FoodList() {
  const [list, setList] = useState([]);
  const [editItem, setEditItem] = useState(null); // item being edited
  const [editImage, setEditImage] = useState(null); // new image file
  const [saving, setSaving] = useState(false);

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

  const saveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("id", editItem._id);
      formData.append("name", editItem.name);
      formData.append("description", editItem.description);
      formData.append("price", editItem.price);
      formData.append("category", editItem.category);
      if (editImage) formData.append("image", editImage);

      const res = await axios.post(`${BACKEND_URL}/api/food/edit`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        toast.success("Food updated!");
        setEditItem(null);
        setEditImage(null);
        fetchList();
      } else {
        toast.error(res.data.message || "Error updating");
      }
    } catch (err) {
      toast.error(err?.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  // Get image src — handle both Cloudinary URLs and local filenames
  const getImgSrc = (image) =>
    image?.startsWith("http") ? image : `${BACKEND_URL}/images/${image}`;

  useEffect(() => {
    fetchList();
  }, []);

  return (
    <div style={{ maxWidth: 1100 }}>
      <h1 style={{ marginTop: 0, color: "var(--text)" }}>Food List</h1>

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
          <div key={item._id} style={{ ...styles.row, color: "var(--text)" }}>
            <div>
              <img
                src={getImgSrc(item.image)}
                alt=""
                style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }}
                onError={(e) => { e.target.src = "https://via.placeholder.com/44?text=?"; }}
              />
            </div>
            <div>{item.name}</div>
            <div>{item.restaurantId?.name || "—"}</div>
            <div>{item.category}</div>
            <div>AED {item.price}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={styles.editBtn} onClick={() => { setEditItem({ ...item }); setEditImage(null); }}>
                Edit
              </button>
              <button style={styles.x} onClick={() => removeFood(item._id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div style={styles.overlay} onClick={() => setEditItem(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: "white" }}>Edit Food Item</h2>

            <label style={styles.label}>Name</label>
            <input
              style={styles.input}
              value={editItem.name}
              onChange={(e) => setEditItem((p) => ({ ...p, name: e.target.value }))}
            />

            <label style={styles.label}>Description</label>
            <textarea
              style={{ ...styles.input, minHeight: 80 }}
              value={editItem.description}
              onChange={(e) => setEditItem((p) => ({ ...p, description: e.target.value }))}
            />

            <label style={styles.label}>Price (AED)</label>
            <input
              style={styles.input}
              type="number"
              value={editItem.price}
              onChange={(e) => setEditItem((p) => ({ ...p, price: e.target.value }))}
            />

            <label style={styles.label}>Category</label>
            <input
              style={styles.input}
              value={editItem.category}
              onChange={(e) => setEditItem((p) => ({ ...p, category: e.target.value }))}
            />

            {/* Current image */}
            <label style={styles.label}>Current Image</label>
            <img
              src={getImgSrc(editItem.image)}
              alt="current"
              style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover", marginBottom: 8 }}
              onError={(e) => { e.target.src = "https://via.placeholder.com/80?text=?"; }}
            />
            {editItem.image?.startsWith("http") && (
              <div style={{ fontSize: 12, color: "#f97316", marginBottom: 8 }}>
                ⚠️ This image is hosted on an external URL (Cloudinary). Upload a local image below to replace it.
              </div>
            )}

            <label style={styles.label}>Replace Image (upload local file)</label>
            <input
              type="file"
              accept="image/*"
              style={styles.input}
              onChange={(e) => setEditImage(e.target.files?.[0] || null)}
            />
            {editImage && (
              <div style={{ fontSize: 12, color: "#4ade80", marginBottom: 4 }}>
                ✅ New image selected: {editImage.name}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button style={styles.saveBtn} onClick={saveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button style={styles.cancelBtn} onClick={() => setEditItem(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  table: {
    marginTop: 12,
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid var(--border)",
    background: "var(--card)",
  },
  head: {
    background: "var(--bg)",
    fontWeight: 800,
    color: "var(--text)",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "80px 1.2fr 1.1fr 0.9fr 0.7fr 1fr",
    gap: 12,
    padding: 14,
    alignItems: "center",
    borderBottom: "1px solid var(--border)",
  },
  x: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "#ef4444",
    cursor: "pointer",
    fontWeight: 700,
  },
  editBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(99,102,241,0.5)",
    background: "rgba(99,102,241,0.15)",
    color: "#a5b4fc",
    cursor: "pointer",
    fontWeight: 700,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 480,
    maxHeight: "90vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    color: "var(--text)",
  },
  label: { fontSize: 12, color: "var(--muted)", marginTop: 8 },
  input: {
    padding: 10,
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  saveBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    border: "none",
    background: "#ff4e2a",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--text)",
    fontWeight: 700,
    cursor: "pointer",
  },
};