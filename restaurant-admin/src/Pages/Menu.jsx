import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import RestaurantLayout from "../components/RestaurantLayout";
import { api, BASE_URL } from "../utils/api";

const SORT_OPTIONS = [
  { label: "A → Z",         value: "az"      },
  { label: "Z → A",         value: "za"      },
  { label: "Highest price", value: "highest" },
  { label: "Lowest price",  value: "lowest"  },
];

export default function Menu() {
  const [foods,    setFoods]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [toggling, setToggling] = useState({});
  const navigate = useNavigate();

  const [search,      setSearch]      = useState("");
  const [catFilter,   setCatFilter]   = useState("all");
  const [sortBy,      setSortBy]      = useState("az");
  const [stockFilter, setStockFilter] = useState("all");

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
      if (res.data?.success) setFoods(prev => prev.filter(f => f._id !== id));
      else alert(res.data?.message || "Failed to remove item");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to remove item");
    }
  };

  const toggleStock = async (food) => {
    setToggling(prev => ({ ...prev, [food._id]: true }));
    try {
      const res = await api.post("/api/restaurantadmin/food/stock", {
        foodId: food._id,
        inStock: !food.inStock,
      });
      if (res.data?.success) {
        setFoods(prev => prev.map(f =>
          f._id === food._id ? { ...f, inStock: res.data.inStock } : f
        ));
      } else {
        alert(res.data?.message || "Failed to update stock");
      }
    } catch {
      alert("Error updating stock status");
    } finally {
      setToggling(prev => ({ ...prev, [food._id]: false }));
    }
  };

  useEffect(() => { loadFoods(); }, []);

  const allCategories = useMemo(() =>
    [...new Set(foods.map(f => f.category).filter(Boolean))].sort()
  , [foods]);

  const activeFilterCount = [
    search.trim() !== "",
    catFilter !== "all",
    stockFilter !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setCatFilter("all");
    setSortBy("az");
    setStockFilter("all");
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = foods.filter(f => {
      const matchesCat    = catFilter === "all" || f.category === catFilter;
      const matchesSearch = !q || f.name.toLowerCase().includes(q) || f.category?.toLowerCase().includes(q);
      const matchesStock  = stockFilter === "all" ? true
        : stockFilter === "in" ? f.inStock !== false
        : f.inStock === false;
      return matchesCat && matchesSearch && matchesStock;
    });
    result.sort((a, b) => {
      if (sortBy === "az")      return a.name.localeCompare(b.name);
      if (sortBy === "za")      return b.name.localeCompare(a.name);
      if (sortBy === "highest") return (b.price || 0) - (a.price || 0);
      if (sortBy === "lowest")  return (a.price || 0) - (b.price || 0);
      return 0;
    });
    return result;
  }, [foods, search, catFilter, sortBy, stockFilter]);

  const outOfStockCount = foods.filter(f => f.inStock === false).length;

  const selectStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    border: "1px solid var(--border)", fontSize: 13, outline: "none",
    fontFamily: "inherit", background: "white", cursor: "pointer",
  };
  const labelStyle = {
    fontSize: 11, fontWeight: 800, color: "var(--muted)",
    marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px",
  };

  return (
    <RestaurantLayout>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>
          Menu&nbsp;
          <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 18 }}>
            ({filtered.length}{filtered.length !== foods.length ? ` of ${foods.length}` : ""} items)
          </span>
        </h2>
        {outOfStockCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 10 }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
              {outOfStockCount} item{outOfStockCount !== 1 ? "s" : ""} out of stock
            </span>
            <button
              onClick={() => setStockFilter("out")}
              style={{ background: "none", border: "none", color: "#b45309", fontWeight: 800, fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: 0 }}
            >
              View
            </button>
          </div>
        )}
      </div>

      {!loading && (
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16,
          padding: "18px 20px", marginBottom: 24 }}>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 14, alignItems: "end" }}>

            <div>
              <div style={labelStyle}>Search</div>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Name or category..."
                  style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 10,
                    border: "1px solid var(--border)", fontSize: 13, outline: "none",
                    fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div>
              <div style={labelStyle}>Category</div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={selectStyle}>
                <option value="all">All Categories</option>
                {allCategories.map(c => (
                  <option key={c} value={c}>{c} ({foods.filter(f => f.category === c).length})</option>
                ))}
              </select>
            </div>

            <div>
              <div style={labelStyle}>Stock Status</div>
              <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} style={selectStyle}>
                <option value="all">All Items</option>
                <option value="in">In Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>

            <div>
              <div style={labelStyle}>Price Range</div>
              <select style={selectStyle} defaultValue="all">
                <option value="all">All Prices</option>
                <option value="under20">Under AED 20</option>
                <option value="20to50">AED 20 – 50</option>
                <option value="over50">Over AED 50</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Sort by:</span>
              {SORT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setSortBy(opt.value)} style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${sortBy === opt.value ? "#111827" : "var(--border)"}`,
                  background: sortBy === opt.value ? "#111827" : "white",
                  color: sortBy === opt.value ? "white" : "var(--muted)",
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters}
                style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", background: "#fef2f2",
                  border: "1px solid #fecaca", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
                ✕ Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <p className="muted">Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🍽️</div>
          <p style={{ fontWeight: 700, margin: "0 0 6px", fontSize: 16 }}>
            {foods.length === 0 ? "No menu items yet." : "No items match your filters."}
          </p>
          {foods.length > 0 && (
            <button onClick={clearFilters}
              style={{ background: "none", border: "none", color: "#ff4e2a", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="list">
          {filtered.map(f => {
            const isInStock = f.inStock !== false;
            return (
              <div key={f._id} className="list-row" style={{ opacity: isInStock ? 1 : 0.75 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ position: "relative" }}>
                    <img
                      src={`${BASE_URL}/images/${f.image}`}
                      alt={f.name}
                      style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover",
                        border: "1px solid #e2e8f0",
                        filter: isInStock ? "none" : "grayscale(60%)" }}
                      onError={e => { e.target.style.display = "none"; }}
                    />
                    {!isInStock && (
                      <div style={{
                        position: "absolute", inset: 0, borderRadius: 10,
                        background: "rgba(0,0,0,0.45)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ fontSize: 18 }}>🚫</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                      {f.name}
                      {!isInStock && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px",
                          borderRadius: 999, background: "#fee2e2", color: "#991b1b" }}>
                          OUT OF STOCK
                        </span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>{f.category}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontWeight: 700 }}>AED {f.price}</div>

                  <button
                    onClick={() => toggleStock(f)}
                    disabled={toggling[f._id]}
                    title={isInStock ? "Mark as out of stock" : "Mark as in stock"}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: toggling[f._id] ? "wait" : "pointer",
                      border: isInStock ? "1px solid #bbf7d0" : "1px solid #fca5a5",
                      background: isInStock ? "#f0fdf4" : "#fff1f1",
                      color: isInStock ? "#166534" : "#dc2626",
                      transition: "all 0.15s",
                      opacity: toggling[f._id] ? 0.6 : 1,
                    }}
                  >
                    <div style={{
                      width: 28, height: 16, borderRadius: 999,
                      background: isInStock ? "#22c55e" : "#d1d5db",
                      position: "relative", transition: "background 0.2s", flexShrink: 0,
                    }}>
                      <div style={{
                        position: "absolute", top: 2,
                        left: isInStock ? 14 : 2,
                        width: 12, height: 12, borderRadius: "50%",
                        background: "white", transition: "left 0.2s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }} />
                    </div>
                    {toggling[f._id] ? "…" : isInStock ? "In Stock" : "Out of Stock"}
                  </button>

                  <button onClick={() => navigate(`/edit-food/${f._id}`)}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #bfdbfe",
                      background: "#eff6ff", color: "#1d4ed8", fontWeight: 700,
                      cursor: "pointer", fontSize: 13 }}>
                    Edit
                  </button>
                  <button onClick={() => removeFood(f._id)}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #fca5a5",
                      background: "#fff1f1", color: "#dc2626", fontWeight: 700,
                      cursor: "pointer", fontSize: 13 }}>
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </RestaurantLayout>
  );
}