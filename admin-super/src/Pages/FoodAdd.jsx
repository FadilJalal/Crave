import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { BACKEND_URL } from "../config";

export default function FoodAdd() {
  const [image, setImage] = useState(null);
  const [restaurants, setRestaurants] = useState([]);

  const [data, setData] = useState({
    restaurantId: "",
    name: "",
    description: "",
    price: "",
    category: "Salad",
  });

  const token = localStorage.getItem("adminToken");

  const fetchRestaurants = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/restaurant/list`);
      if (res.data.success) {
        setRestaurants(res.data.data);
        // auto select first restaurant
        if (res.data.data.length && !data.restaurantId) {
          setData((d) => ({ ...d, restaurantId: res.data.data[0]._id }));
        }
      } else {
        toast.error("Failed to load restaurants");
      }
    } catch (err) {
      toast.error(err?.message || "Network error");
    }
  };

  useEffect(() => {
    fetchRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (!image) return toast.error("Image not selected");
    if (!data.restaurantId) return toast.error("Select a restaurant");

    try {
      const formData = new FormData();
      formData.append("restaurantId", data.restaurantId);
      formData.append("name", data.name);
      formData.append("description", data.description);
      formData.append("price", Number(data.price));
      formData.append("category", data.category);
      formData.append("image", image);

      const res = await axios.post(`${BACKEND_URL}/api/food/add`, formData, {
        headers: {
          // token is not required for your current food route,
          // but keeping it for future protection
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data.success) {
        toast.success("Food Added");
        setData((d) => ({
          ...d,
          name: "",
          description: "",
          price: "",
        }));
        setImage(null);
      } else {
        toast.error(res.data.message || "Error adding food");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Network error");
    }
  };

  return (
    <div style={styles.wrap}>
      <h1 style={styles.h1}>Add Food</h1>

      <form onSubmit={onSubmitHandler} style={styles.card}>
        <label style={styles.label}>Restaurant</label>
        <select
          value={data.restaurantId}
          onChange={(e) => setData((d) => ({ ...d, restaurantId: e.target.value }))}
          style={styles.input}
        >
          {restaurants.map((r) => (
            <option key={r._id} value={r._id}>
              {r.name} — {r.address}
            </option>
          ))}
        </select>

        <label style={styles.label}>Food Name</label>
        <input
          style={styles.input}
          value={data.name}
          onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
          placeholder="Type here"
          required
        />

        <label style={styles.label}>Description</label>
        <textarea
          style={{ ...styles.input, minHeight: 110 }}
          value={data.description}
          onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))}
          placeholder="Write here"
          required
        />

        <div style={styles.row}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Category</label>
            <select
              value={data.category}
              onChange={(e) => setData((d) => ({ ...d, category: e.target.value }))}
              style={styles.input}
            >
              <option value="Salad">Salad</option>
              <option value="Rolls">Rolls</option>
              <option value="Deserts">Deserts</option>
              <option value="Sandwich">Sandwich</option>
              <option value="Cake">Cake</option>
              <option value="Pure Veg">Pure Veg</option>
              <option value="Pasta">Pasta</option>
              <option value="Noodles">Noodles</option>
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={styles.label}>Price</label>
            <input
              style={styles.input}
              type="number"
              value={data.price}
              onChange={(e) => setData((d) => ({ ...d, price: e.target.value }))}
              placeholder="25"
              required
            />
          </div>
        </div>

        <label style={styles.label}>Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0] || null)}
          style={styles.input}
          required
        />

        <button style={styles.btn} type="submit">
          ADD FOOD
        </button>
      </form>
    </div>
  );
}

const styles = {
  wrap: { maxWidth: 900 },
  h1: { marginTop: 0 },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 18,
  },
  label: { fontSize: 12, opacity: 0.8, marginTop: 8 },
  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
    outline: "none",
  },
  row: { display: "flex", gap: 12, marginTop: 8 },
  btn: {
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    border: "none",
    background: "white",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
  },
};