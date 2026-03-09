import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import RestaurantLayout from "../components/RestaurantLayout";
import { api, BASE_URL } from "../utils/api";

const SORT_OPTIONS = [
  { label: "A → Z",        value: "az"       },
  { label: "Z → A",        value: "za"       },
  { label: "Highest price", value: "highest" },
  { label: "Lowest price",  value: "lowest"  },
];

export default function Menu() {
  const [foods,   setFoods]   = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ── Filters ──────────────────────────────────────────────────────
  const [search,   setSearch]   = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [sortBy,   setSortBy]   = useState("az");

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

  useEffect(() => { loadFoods(); }, []);

  // Unique categories derived from data
  const allCategories = useMemo(() =>
    [...new Set(foods.map(f => f.category).filter(Boolean))].sort()
  , [foods]);

  // How many active filters (excluding sort)
  const activeFilterCount = [
    search.trim() !== "",
    catFilter !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setCatFilter("all");
    setSortBy("az");
  };

  // Apply search + category + sort
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

  // ── Shared select style ───────────────────────────────────────────
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

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>
          Menu&nbsp;
          <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 18 }}>
            ({filtered.length}{filtered.length !== foods.length ? ` of ${foods.length}` : ""} items)
          </span>
        </h2>
      </div>

      {/* ── Filter bar — matches Orders page style exactly ── */}
      {!loading && (
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16,
          padding: "18px 20px", marginBottom: 24 }}>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14, alignItems: "end" }}>

            {/* Search */}
            <div>
              <div style={labelStyle}>Search</div>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Name or category..."
                  style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 10,
                    border: "1px solid var(--border)", fontSize: 13, outline: "none",
                    fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <div style={labelStyle}>Category</div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={selectStyle}>
                <option value="all">All Categories</option>
                {allCategories.map(c => (
                  <option key={c} value={c}>
                    {c} ({foods.filter(f => f.category === c).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Price range placeholder — extensible */}
            <div>
              <div style={labelStyle}>Price Range</div>
              <select
                onChange={e => {
                  if (e.target.value === "all") { /* no price filter yet */ }
                }}
                style={selectStyle}
                defaultValue="all"
              >
                <option value="all">All Prices</option>
                <option value="under20">Under AED 20</option>
                <option value="20to50">AED 20 – 50</option>
                <option value="over50">Over AED 50</option>
              </select>
            </div>
          </div>

          {/* Sort + Clear row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Sort by:</span>
              {SORT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setSortBy(opt.value)} style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                  cursor: "pointer",
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

      {/* ── List ── */}
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
              style={{ background: "none", border: "none", color: "#ff4e2a",
                fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="list">
          {filtered.map(f => (
            <div key={f._id} className="list-row">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img
                  src={`${BASE_URL}/images/${f.image}`}
                  alt={f.name}
                  style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover",
                    border: "1px solid #e2e8f0" }}
                  onError={e => { e.target.style.display = "none"; }}
                />
                <div>
                  <div style={{ fontWeight: 700 }}>{f.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{f.category}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontWeight: 700 }}>AED {f.price}</div>
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
          ))}
        </div>
      )}
    </RestaurantLayout>
  );
}