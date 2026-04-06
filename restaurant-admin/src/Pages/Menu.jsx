import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import RestaurantLayout from "../components/RestaurantLayout";
import { api, BASE_URL } from "../utils/api";
import { useTheme } from "../ThemeContext";

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

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [sortBy, setSortBy] = useState("az");
  const [deletingCat, setDeletingCat] = useState(false);
  const { dark } = useTheme();

  const loadFoods = async () => {
    try {
      setLoading(true);
      console.log("[LOAD FOODS] Starting to fetch menu items...");
      const res = await api.get("/api/restaurantadmin/foods");
      console.log("[LOAD FOODS RESPONSE]", res.data);
      if (res.data?.success) {
        const foods = res.data.data || [];
        console.log(`[LOAD FOODS SUCCESS] Loaded ${foods.length} items`);
        setFoods(foods);
      } else {
        const errorMsg = res.data?.message || "Failed to load menu";
        console.error("[LOAD FOODS FAILED]", errorMsg);
        alert(errorMsg);
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to load menu";
      console.error("[LOAD FOODS ERROR]", {
        message: errorMsg,
        status: err?.response?.status,
        data: err?.response?.data
      });
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemAvailability = async (id, currentStatus) => {
    setToggling(prev => ({ ...prev, [id]: true }));
    try {
      // Check if authenticated
      const token = localStorage.getItem("restaurantToken");
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }
      console.log("[TOGGLE] Token exists:", !!token);
      
      const newStatus = !currentStatus;
      console.log(`[TOGGLE] Item ${id}: ${currentStatus} → ${newStatus}`);
      
      const res = await api.post(`/api/restaurantadmin/food/${id}/toggle-availability`, { 
        inStock: newStatus
      });
      
      console.log("[TOGGLE RESPONSE]", res.data);
      
      if (res.data?.success) {
        console.log(`[TOGGLE SUCCESS] Item ${id} now inStock=${newStatus}`);
        setFoods(prev => prev.map(f => 
          f._id === id ? { ...f, inStock: newStatus } : f
        ));
        alert(`Item ${newStatus ? "enabled ✓" : "disabled ✕"}`);
      } else {
        const errorMsg = res.data?.message || "Failed to toggle availability";
        console.error("[TOGGLE FAILED]", errorMsg, res.data);
        alert(errorMsg);
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || "Network or server error";
      console.error("[TOGGLE ERROR]", {
        message: errorMsg,
        status: err?.response?.status,
        data: err?.response?.data,
        fullError: err
      });
      alert(errorMsg);
    } finally {
      setToggling(prev => ({ ...prev, [id]: false }));
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

  const deleteByCategory = async (category) => {
    const count = foods.filter(f => f.category === category).length;
    if (!window.confirm(`Delete all ${count} item${count !== 1 ? "s" : ""} in "${category}"? This cannot be undone.`)) return;
    setDeletingCat(true);
    try {
      const res = await api.post("/api/food/remove-by-category", { category });
      if (res.data?.success) {
        setFoods(prev => prev.filter(f => f.category !== category));
        setCatFilter("all");
        alert(res.data.message);
      } else {
        alert(res.data?.message || "Failed to delete category items");
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete category items");
    } finally {
      setDeletingCat(false);
    }
  };

  // --- REMOVED: Stock toggle functionality moved to Inventory section ---

  useEffect(() => { loadFoods(); }, []);

  const allCategories = useMemo(() =>
    [...new Set(foods.map(f => f.category).filter(Boolean))].sort()
  , [foods]);

  const activeFilterCount = [
    search.trim() !== "",
    catFilter !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setCatFilter("all");
    setSortBy("az");
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = foods.filter(f => {
      const matchesCat    = catFilter === "all" || f.category === catFilter;
      const matchesSearch = !q || f.name.toLowerCase().includes(q) || f.category?.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
    result.sort((a, b) => {
      if (sortBy === "az")      return a.name.localeCompare(b.name);
      if (sortBy === "za")      return b.name.localeCompare(a.name);
      if (sortBy === "highest") return (b.price || 0) - (a.price || 0);
      if (sortBy === "lowest")  return (a.price || 0) - (b.price || 0);
      return 0;
    });
    return result;
  }, [foods, search, catFilter, sortBy]);

  const selectStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    border: "1px solid var(--border)", fontSize: 13, outline: "none",
    fontFamily: "inherit", background: dark ? "#111827" : "white", color: "var(--text)", cursor: "pointer",
  };
  const labelStyle = {
    fontSize: 11, fontWeight: 800, color: "var(--muted)",
    marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px",
  };
  const panelBg = dark ? "#1f2937" : "#fff";
  const rowBg = dark ? "#1f2937" : "#ffffff";
  const rowBorder = dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid var(--border)";
  const rowShadow = dark ? "0 2px 14px rgba(0,0,0,0.28)" : "0 2px 10px rgba(17,24,39,0.04)";
  const softText = dark ? "rgba(255,255,255,0.65)" : "#9ca3af";

  return (
    <RestaurantLayout>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <h2 style={{ margin: 0, minWidth: 0, overflowWrap: "anywhere" }}>
          Menu&nbsp;
          <span style={{ fontWeight: 400, color: softText, fontSize: 18 }}>
            ({filtered.length}{filtered.length !== foods.length ? ` of ${foods.length}` : ""} items)
          </span>
        </h2>
      </div>

      {!loading && (
        <div style={{ background: panelBg, border: rowBorder, borderRadius: 16,
          padding: "18px 20px", marginBottom: 24 }}>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, alignItems: "end" }}>

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
                    fontFamily: "inherit", boxSizing: "border-box", background: dark ? "#111827" : "white", color: "var(--text)" }}
                />
              </div>
            </div>

            <div>
              <div style={labelStyle}>Category</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={selectStyle}>
                  <option value="all">All Categories</option>
                  {allCategories.map(c => (
                    <option key={c} value={c}>{c} ({foods.filter(f => f.category === c).length})</option>
                  ))}
                </select>
                {catFilter !== "all" && (
                  <button
                    onClick={() => deleteByCategory(catFilter)}
                    disabled={deletingCat}
                    title={`Delete all items in "${catFilter}"`}
                    style={{
                      flexShrink: 0,
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "9px 13px", borderRadius: 10, fontSize: 12, fontWeight: 800,
                      cursor: deletingCat ? "wait" : "pointer",
                      border: "1px solid #fca5a5",
                      background: deletingCat ? (dark ? "rgba(220,38,38,0.25)" : "#fee2e2") : (dark ? "rgba(220,38,38,0.18)" : "#fff1f1"),
                      color: "#dc2626",
                      whiteSpace: "nowrap",
                      opacity: deletingCat ? 0.7 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                    {deletingCat ? "Deleting…" : "Delete All"}
                  </button>
                )}
              </div>
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
            flexWrap: "wrap", gap: 12, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Sort by:</span>
              {SORT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setSortBy(opt.value)} style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${sortBy === opt.value ? (dark ? "#ff4e2a" : "#111827") : "var(--border)"}`,
                  background: sortBy === opt.value ? (dark ? "#ff4e2a" : "#111827") : (dark ? "rgba(255,255,255,0.04)" : "white"),
                  color: sortBy === opt.value ? "white" : "var(--muted)",
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters}
                style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", background: dark ? "rgba(239,68,68,0.15)" : "#fef2f2",
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
        <div style={{ textAlign: "center", padding: "48px 0", color: softText }}>
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
            return (
              <div key={f._id} className="list-row" style={{ background: rowBg, border: rowBorder, boxShadow: rowShadow, gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 260px" }}>
                  <div style={{ position: "relative" }}>
                    <img
                      src={`${BASE_URL}/images/${f.image}`}
                      alt={f.name}
                      style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover",
                        border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #e2e8f0" }}
                      onError={e => { e.target.style.display = "none"; }}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: dark ? "#f9fafb" : "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {f.name}
                    </div>
                    <div className="muted" style={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.65)" : undefined, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.category}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "flex-end", flex: "1 1 320px" }}>
                  <div style={{ fontWeight: 700, color: dark ? "#f9fafb" : "#111827" }}>AED {f.price}</div>

                  <button 
                    onClick={() => toggleItemAvailability(f._id, f.inStock ?? true)}
                    disabled={toggling[f._id]}
                    style={{ 
                      padding: "6px 14px", 
                      borderRadius: 8, 
                      border: (f.inStock ?? true) ? "1px solid #86efac" : "1px solid #fca5a5",
                      background: (f.inStock ?? true) ? "#f0fdf4" : "#fff1f1", 
                      color: (f.inStock ?? true) ? "#16a34a" : "#dc2626", 
                      fontWeight: 700,
                      cursor: toggling[f._id] ? "not-allowed" : "pointer", 
                      fontSize: 13,
                      opacity: toggling[f._id] ? 0.6 : 1
                    }}>
                    {(f.inStock ?? true) ? "✓ ON" : "✕ OFF"}
                  </button>

                  <button onClick={() => navigate(`/edit-food/${f._id}`)}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #bfdbfe",
                      background: dark ? "rgba(29,78,216,0.2)" : "#eff6ff", color: dark ? "#93c5fd" : "#1d4ed8", fontWeight: 700,
                      cursor: "pointer", fontSize: 13 }}>
                    Edit
                  </button>
                  <button onClick={() => removeFood(f._id)}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #fca5a5",
                      background: dark ? "rgba(220,38,38,0.18)" : "#fff1f1", color: "#dc2626", fontWeight: 700,
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