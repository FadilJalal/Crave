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

  // ── Lightning Deal Management State ──
  const [managingItem, setManagingItem]       = useState(null);
  const [dealPrice, setDealPrice]             = useState("");
  const [dealPercentage, setDealPercentage]   = useState("");
  const [dealExpiresAt, setDealExpiresAt]     = useState("");
  const [dealStock, setDealStock]             = useState("");
  const [isDealActive, setIsDealActive]       = useState(false);
  const [savingDeal, setSavingDeal]           = useState(false);
  const [isBundle, setIsBundle]               = useState(false);
  const [selectedBundleItems, setSelectedBundleItems] = useState([]);

  const openDealManager = (item) => {
    setManagingItem(item);
    setDealPrice(item.salePrice || "");
    setDealPercentage(
      item.salePrice && item.price
        ? Math.round((1 - item.salePrice / item.price) * 100)
        : ""
    );
    const exp = item.flashDealExpiresAt ? new Date(item.flashDealExpiresAt) : null;
    if (exp) {
      exp.setMinutes(exp.getMinutes() - exp.getTimezoneOffset());
      setDealExpiresAt(exp.toISOString().slice(0, 16));
    } else {
      setDealExpiresAt("");
    }
    setDealStock(item.flashDealTotalStock || "");
    setIsDealActive(item.isFlashDeal || false);
    setIsBundle(item.isBundle || false);
    setSelectedBundleItems(item.bundledItems || []);
  };

  const saveFlashDeal = async () => {
    if (!managingItem) return;
    setSavingDeal(true);
    try {
      const form = new FormData();
      form.append("id", managingItem._id);
      form.append("isFlashDeal", String(isDealActive));
      form.append("salePrice", dealPrice ? String(dealPrice) : "");
      form.append("flashDealExpiresAt", dealExpiresAt ? new Date(dealExpiresAt).toISOString() : "");
      form.append("flashDealTotalStock", dealStock ? String(dealStock) : "");
      form.append("isBundle", String(isBundle));
      form.append("bundledItems", JSON.stringify(selectedBundleItems));
      const res = await api.post("/api/food/edit", form);
      if (res.data?.success) {
        setFoods(prev => prev.map(f =>
          f._id === managingItem._id
            ? { ...f, isFlashDeal: isDealActive, salePrice: dealPrice ? Number(dealPrice) : undefined,
                flashDealExpiresAt: dealExpiresAt ? new Date(dealExpiresAt).toISOString() : undefined,
                flashDealTotalStock: dealStock ? Number(dealStock) : undefined }
            : f
        ));
        setManagingItem(null);
      } else { alert(res.data?.message || "Failed to update deal"); }
    } catch { alert("Failed to update deal"); }
    finally { setSavingDeal(false); }
  };

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
  const panelBg = dark ? "var(--sidebar-bg)" : "#fff";
  const panelText = dark ? "var(--sidebar-text)" : "#1a1d23";
  const rowBg = dark ? "var(--sidebar-bg)" : "#fff";
  const rowText = dark ? "var(--sidebar-text)" : "#1a1d23";
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
        <div style={{ background: panelBg, color: panelText, border: rowBorder, borderRadius: 16,
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
              <div key={f._id} className="list-row" style={{ background: rowBg, color: rowText, border: rowBorder, boxShadow: rowShadow, gap: 12, flexWrap: "wrap" }}>
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

                  <button onClick={() => openDealManager(f)}
                    style={{
                      padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 800,
                      background: f.isFlashDeal ? "#FF3008" : (dark ? "rgba(255,48,8,0.15)" : "#fff3f0"),
                      color: f.isFlashDeal ? "#fff" : "#FF3008",
                      border: `1px solid ${f.isFlashDeal ? "#FF3008" : "rgba(255,48,8,0.3)"}`,
                      cursor: "pointer", whiteSpace: "nowrap",
                      boxShadow: f.isFlashDeal ? "0 4px 12px rgba(255,48,8,0.35)" : "none",
                    }}>
                    ⚡ {f.isFlashDeal ? "Active Deal" : "Lightning Deal"}
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
      {/* ⚡ Lightning Deal Manager Modal */}
      {managingItem && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div style={{
            background: dark ? "#111827" : "#fff",
            width: "100%", maxWidth: 480, borderRadius: 24, padding: 32,
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
            position: "relative", border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#eee"}`,
            maxHeight: "90vh", overflowY: "auto"
          }}>
            {/* Close */}
            <button onClick={() => setManagingItem(null)}
              style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none",
                fontSize: 22, cursor: "pointer", color: "var(--muted)", lineHeight: 1 }}>
              ✕
            </button>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,48,8,0.1)",
                display: "grid", placeItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 26 }}>⚡</span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "var(--text)" }}>Lightning Deal Manager</h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Configure time-limited promotions</p>
              </div>
            </div>

            {/* Product preview */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14,
              borderRadius: 14, background: dark ? "rgba(255,255,255,0.04)" : "#f9fafb",
              border: "1px solid var(--border)", marginBottom: 22 }}>
              <img src={`${BASE_URL}/images/${managingItem.image}`}
                style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover" }} />
              <div>
                <div style={{ fontWeight: 800, color: "var(--text)", fontSize: 15 }}>{managingItem.name}</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Regular price: AED {managingItem.price}</div>
              </div>
            </div>

            {/* Activate toggle */}
            <label style={{
              display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
              background: isDealActive ? "rgba(255,48,8,0.08)" : (dark ? "rgba(255,255,255,0.04)" : "#f9fafb"),
              padding: "14px 16px", borderRadius: 14,
              border: `2px solid ${isDealActive ? "#FF3008" : "var(--border)"}`,
              transition: "all 0.2s", marginBottom: 20
            }}>
              <input type="checkbox" checked={isDealActive}
                onChange={e => setIsDealActive(e.target.checked)}
                style={{ width: 22, height: 22, accentColor: "#FF3008", flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 800, color: isDealActive ? "#FF3008" : "var(--text)", fontSize: 15 }}>
                  {isDealActive ? "⚡ Deal is LIVE" : "Activate Lightning Deal"}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {isDealActive ? "Showing on customer homepage" : "Turn on to show in Lightning Deals"}
                </div>
              </div>
            </label>

            {/* Config fields — only show when active */}
            {isDealActive && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Price & Percentage */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>Sale Price (AED)</div>
                    <input type="number" value={dealPrice}
                      onChange={e => {
                        setDealPrice(e.target.value);
                        if (e.target.value && managingItem.price)
                          setDealPercentage(Math.round((1 - Number(e.target.value) / managingItem.price) * 100));
                        else setDealPercentage("");
                      }}
                      placeholder="e.g. 20.00"
                      style={{ width: "100%", padding: "12px 14px", borderRadius: 12,
                        border: "2px solid #FF3008", outline: "none", fontSize: 18,
                        fontWeight: 900, fontFamily: "inherit",
                        background: dark ? "#000" : "#fff", color: "var(--text)", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>Discount (%)</div>
                    <input type="number" value={dealPercentage}
                      onChange={e => {
                        setDealPercentage(e.target.value);
                        if (e.target.value && managingItem.price) {
                          const p = managingItem.price * (1 - Number(e.target.value) / 100);
                          setDealPrice(p > 0 ? p.toFixed(2) : "");
                        } else setDealPrice("");
                      }}
                      placeholder="e.g. 20"
                      style={{ width: "100%", padding: "12px 14px", borderRadius: 12,
                        border: "1px solid var(--border)", outline: "none", fontSize: 18,
                        fontWeight: 900, fontFamily: "inherit",
                        background: dark ? "rgba(255,255,255,0.05)" : "#f9fafb",
                        color: "var(--text)", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                {/* Savings feedback */}
                {dealPrice && managingItem.price && Number(dealPrice) > 0 && (
                  <div style={{ fontSize: 13, color: "#FF3008", fontWeight: 800, marginTop: -8,
                    background: "rgba(255,48,8,0.07)", padding: "8px 14px", borderRadius: 10 }}>
                    Customer saves AED {(Number(managingItem.price) - Number(dealPrice)).toFixed(2)} · {dealPercentage}% off
                  </div>
                )}

                {/* Timer & Stock */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>Deal Ends At</div>
                    <input type="datetime-local" value={dealExpiresAt}
                      onChange={e => setDealExpiresAt(e.target.value)}
                      style={{ width: "100%", padding: "12px 10px", borderRadius: 12,
                        border: "1px solid var(--border)", outline: "none", fontSize: 13,
                        fontWeight: 700, fontFamily: "inherit",
                        background: dark ? "rgba(255,255,255,0.05)" : "#f9fafb",
                        color: "var(--text)", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>Stock Limit</div>
                    <input type="number" value={dealStock}
                      onChange={e => setDealStock(e.target.value)}
                      placeholder="e.g. 10"
                      style={{ width: "100%", padding: "12px 14px", borderRadius: 12,
                        border: "1px solid var(--border)", outline: "none", fontSize: 18,
                        fontWeight: 900, fontFamily: "inherit",
                        background: dark ? "rgba(255,255,255,0.05)" : "#f9fafb",
                        color: "var(--text)", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                {/* 📦 Bundle Controls */}
                <div style={{ padding: "16px", borderRadius: 16, background: dark ? "rgba(255,255,255,0.03)" : "#f8fafc", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}` }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 12 }}>
                    <input type="checkbox" checked={isBundle} onChange={e => setIsBundle(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#FF3008" }} />
                    <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text)" }}>📦 Create a Bundle deal?</div>
                  </label>
                  
                  {isBundle && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase" }}>Merge with Other Items</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 120, overflowY: "auto", padding: 4 }}>
                        {foods.filter(f => f._id !== managingItem._id).map(f => {
                          const isSelected = selectedBundleItems.includes(f._id);
                          return (
                            <button
                              key={f._id}
                              onClick={() => {
                                setSelectedBundleItems(prev => 
                                  isSelected ? prev.filter(id => id !== f._id) : [...prev, f._id]
                                );
                              }}
                              style={{
                                padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
                                border: `1px solid ${isSelected ? "#FF3008" : "var(--border)"}`,
                                background: isSelected ? "rgba(255,48,8,0.1)" : "transparent",
                                color: isSelected ? "#FF3008" : "var(--muted)",
                                display: "flex", alignItems: "center", gap: 5
                              }}>
                              {f.name} {isSelected && "✓"}
                            </button>
                          );
                        })}
                      </div>
                      {selectedBundleItems.length > 0 && (
                        <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 700, marginTop: 10 }}>
                          ✓ {selectedBundleItems.length} items merged into deal
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
              {/* Quick Remove button — only show if the deal is currently active */}
              {managingItem.isFlashDeal && (
                <button
                  disabled={savingDeal}
                  onClick={async () => {
                    setSavingDeal(true);
                    try {
                      const form = new FormData();
                      form.append("id", managingItem._id);
                      form.append("isFlashDeal", "false");
                      form.append("salePrice", "");
                      form.append("flashDealExpiresAt", "");
                      form.append("flashDealTotalStock", "");
                      const res = await api.post("/api/food/edit", form);
                      if (res.data?.success) {
                        setFoods(prev => prev.map(f =>
                          f._id === managingItem._id
                            ? { ...f, isFlashDeal: false, salePrice: undefined, flashDealExpiresAt: undefined }
                            : f
                        ));
                        setManagingItem(null);
                      } else {
                        alert(res.data?.message || "Failed");
                      }
                    } catch { alert("Failed to remove deal"); }
                    finally { setSavingDeal(false); }
                  }}
                  style={{
                    width: "100%", padding: "13px",
                    background: dark ? "rgba(239,68,68,0.15)" : "#fff1f1",
                    color: "#dc2626", border: "1.5px solid #fca5a5", borderRadius: 14,
                    fontWeight: 900, fontSize: 14, cursor: savingDeal ? "not-allowed" : "pointer",
                    transition: "all 0.2s", letterSpacing: "0.3px"
                  }}>
                  🗑 Remove Deal (Turn Off)
                </button>
              )}

              <button onClick={saveFlashDeal} disabled={savingDeal}
                style={{
                  width: "100%", padding: "15px",
                  background: savingDeal ? "#9ca3af" : "linear-gradient(90deg, #FF3008, #ff6b4a)",
                  color: "#fff", border: "none", borderRadius: 14,
                  fontWeight: 900, fontSize: 16, cursor: savingDeal ? "not-allowed" : "pointer",
                  boxShadow: savingDeal ? "none" : "0 8px 20px rgba(255,48,8,0.35)",
                  transition: "all 0.2s", letterSpacing: "0.5px"
                }}>
                {savingDeal ? "Saving…" : isDealActive ? "⚡ Launch Deal" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}