import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import RestaurantLayout from "../components/RestaurantLayout";
import { api, BASE_URL } from "../utils/api";
import { useTheme } from "../ThemeContext";
import { toast } from "react-toastify";
import ConfirmationModal from "../components/ConfirmationModal";

const SORT_OPTIONS = [
  { label: "A → Z",         value: "az"      },
  { label: "Z → A",         value: "za"      },
  { label: "Highest price", value: "highest" },
  { label: "Lowest price",  value: "lowest"  },
];

export default function Menu() {
  const [foods,    setFoods]    = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [toggling, setToggling] = useState({});
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [sortBy, setSortBy] = useState("az");
  const [deletingCat, setDeletingCat] = useState(false);
  const { dark } = useTheme();

  const [confirm, setConfirm] = useState({ isOpen: false, title: "", message: "", onConfirm: () => {}, type: "danger" });

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
 
  // ── AI Menu Description Writer State ──
  const [descModal, setDescModal]         = useState(null);
  const [aiIngredients, setAiIngredients] = useState("");
  const [aiResult, setAiResult]           = useState("");
  const [aiLoading, setAiLoading]         = useState(false);
  const [savingDesc, setSavingDesc]       = useState(false);

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
      const [foodRes, invRes] = await Promise.all([
        api.get("/api/restaurantadmin/foods"),
        api.get("/api/inventory")
      ]);
      
      if (foodRes.data?.success) {
        setFoods(foodRes.data.data || []);
      }
      if (invRes.data?.success) {
        setInventory(invRes.data.data || []);
      }
    } catch (err) {
      toast.error("Failed to load data");
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
        setFoods(prev => prev.map(f => 
          f._id === id ? { ...f, inStock: newStatus } : f
        ));
        toast.success(`Item ${newStatus ? "enabled" : "disabled"}`);
      } else {
        toast.error(res.data?.message || "Failed to toggle availability");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Network error");
    } finally {
      setToggling(prev => ({ ...prev, [id]: false }));
    }
  };

  const removeFood = async (id) => {
    setConfirm({
      isOpen: true,
      title: "Remove from menu?",
      message: "This item will be permanently deleted from your restaurant menu.",
      type: "danger",
      onConfirm: async () => {
        try {
          const res = await api.post("/api/food/remove", { id });
          if (res.data?.success) {
            setFoods(prev => prev.filter(f => f._id !== id));
            toast.success("Item removed.");
          } else {
            toast.error(res.data?.message || "Failed to remove item");
          }
        } catch (err) {
          toast.error("Error removing item.");
        }
      }
    });
  };

  const deleteByCategory = async (category) => {
    const count = foods.filter(f => f.category === category).length;
    setConfirm({
      isOpen: true,
      title: "Delete Category Items?",
      message: `Are you sure you want to delete all ${count} items in "${category}"? This cannot be undone.`,
      type: "danger",
      onConfirm: async () => {
        setDeletingCat(true);
        try {
          const res = await api.post("/api/food/remove-by-category", { category });
          if (res.data?.success) {
            setFoods(prev => prev.filter(f => f.category !== category));
            setCatFilter("all");
            toast.success(res.data.message);
          } else {
            toast.error(res.data?.message || "Failed to delete category items");
          }
        } catch (err) {
          toast.error("Failed to delete category items");
        } finally {
          setDeletingCat(false);
        }
      }
    });
  };

  // --- REMOVED: Stock toggle functionality moved to Inventory section ---
 
  const generateDescription = async () => {
    if (!descModal) return;
    setAiLoading(true);
    setAiResult("");
    try {
      const res = await api.post("/api/ai/restaurant/generate-description", {
        name: descModal.name,
        category: descModal.category,
        price: descModal.price,
        ingredients: aiIngredients
      });
      if (res.data?.success) {
        setAiResult(res.data.description);
      } else {
        toast.error("AI failed to generate description.");
      }
    } catch {
      toast.error("AI Error.");
    } finally {
      setAiLoading(false);
    }
  };

  const saveGeneratedDescription = async () => {
    if (!descModal || !aiResult) return;
    setSavingDesc(true);
    try {
      const form = new FormData();
      form.append("id", descModal._id);
      form.append("description", aiResult);
      const res = await api.post("/api/food/edit", form);
      if (res.data?.success) {
        setFoods(prev => prev.map(f => f._id === descModal._id ? { ...f, description: aiResult } : f));
        setDescModal(null);
        toast.success("Menu updated!");
      } else {
        toast.error(res.data?.message || "Failed to save.");
      }
    } catch {
      toast.error("Save failed.");
    } finally {
      setSavingDesc(false);
    }
  };

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
  const softText = dark ? "rgba(255,255,255,0.65)" : "#64748b";
  const textPrimary = dark ? "#f8fafc" : "#0f172a";

  return (
    <RestaurantLayout>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
        <h2 style={{ margin: 0, minWidth: 0, fontWeight: 900, fontSize: 32 }}>
          Live Menu&nbsp;
          <span style={{ fontWeight: 600, color: softText, fontSize: 18 }}>
            ({filtered.length}{filtered.length !== foods.length ? ` of ${foods.length}` : ""} items)
          </span>
        </h2>
        <button onClick={() => navigate("/add-food")} style={{ 
          padding: "12px 24px", borderRadius: 16, border: "none", 
          background: "linear-gradient(90deg, #FF3008, #ff6b4a)", color: "white", 
          fontWeight: 900, fontSize: 14, cursor: "pointer",
          boxShadow: "0 8px 20px rgba(255,48,8,0.25)",
          display: "flex", alignItems: "center", gap: 8
        }}>
          <span style={{ fontSize: 18 }}>+</span> Add New Item
        </button>
      </div>

      {!loading && (
        <div style={{ 
          background: dark ? "rgba(15,23,42,0.6)" : "white", 
          backdropFilter: "blur(10px)",
          border: rowBorder, 
          borderRadius: 24,
          padding: "24px", 
          marginBottom: 32,
          boxShadow: rowShadow 
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, alignItems: "end" }}>
            <div>
              <label style={labelStyle}>Intelligent Search</label>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Dish or category..." style={{ ...selectStyle, paddingLeft: 40 }} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Category Filter</label>
              <div style={{ display: "flex", gap: 10 }}>
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={selectStyle}>
                  <option value="all">All Categories</option>
                  {allCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {catFilter !== "all" && (
                  <button onClick={() => deleteByCategory(catFilter)} style={{ padding: "0 14px", borderRadius: 12, border: "none", background: "#fee2e2", color: "#ef4444", cursor: "pointer" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                )}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Price Range</label>
              <select style={selectStyle} defaultValue="all">
                <option value="all">Any Price</option>
                <option value="low">Under AED 30</option>
                <option value="mid">AED 30 - 70</option>
                <option value="high">Above AED 70</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginTop: 24, paddingTop: 20, borderTop: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: softText, textTransform: "uppercase" }}>Sort Matrix:</span>
              <div style={{ display: "flex", background: dark ? "rgba(0,0,0,0.2)" : "#f1f5f9", padding: 4, borderRadius: 12 }}>
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setSortBy(opt.value)} style={{
                    padding: "6px 14px", borderRadius: 10, border: "none", fontSize: 12, fontWeight: 800, cursor: "pointer",
                    background: sortBy === opt.value ? (dark ? "#ff4e2a" : "#111827") : "transparent",
                    color: sortBy === opt.value ? "white" : softText,
                    transition: "all 0.2s"
                  }}>{opt.label}</button>
                ))}
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} style={{ background: "none", border: "none", color: "#ef4444", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>✕ Reset Filters</button>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {filtered.map(f => {
            const isOut = !(f.inStock ?? true);
            
            // Check linked ingredients status
            const linkedIngs = inventory.filter(i => 
              i.linkedMenuItems?.some(m => String(m.foodId) === String(f._id))
            );
            const isIngOut = linkedIngs.some(i => i.currentStock <= 0);
            const isIngLow = linkedIngs.some(i => i.currentStock <= i.minimumStock);
            const outIngCount = linkedIngs.filter(i => i.currentStock <= 0).length;

            return (
              <div key={f._id} style={{ 
                background: rowBg, 
                borderRadius: 28, 
                border: rowBorder, 
                boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
                overflow: "hidden",
                transition: "all 0.3s ease",
                display: "flex",
                flexDirection: "column",
                position: "relative"
              }}>
                {/* Visual Area */}
                <div style={{ height: 180, position: "relative", overflow: "hidden" }}>
                  <img src={`${BASE_URL}/images/${f.image}`} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: isOut ? 0.4 : 1 }} onError={e => { e.target.style.display = "none"; }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4))" }} />
                  
                  <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 8 }}>
                    <div style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: "white", padding: "6px 12px", borderRadius: 10, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
                      {f.category}
                    </div>
                    {isIngOut && (
                      <div style={{ background: "#ef4444", color: "white", padding: "6px 12px", borderRadius: 10, fontSize: 10, fontWeight: 900, boxShadow: "0 4px 12px rgba(239,68,68,0.3)" }}>
                        ⚠️ {outIngCount} ING OUT
                      </div>
                    )}
                    {!isIngOut && isIngLow && (
                      <div style={{ background: "#f59e0b", color: "white", padding: "6px 12px", borderRadius: 10, fontSize: 10, fontWeight: 900, boxShadow: "0 4px 12px rgba(245,158,11,0.3)" }}>
                        ⚠️ LOW STOCK
                      </div>
                    )}
                  </div>

                  <div style={{ position: "absolute", bottom: 12, right: 12 }}>
                    <div style={{ background: "rgba(255,255,255,0.9)", color: "#111827", padding: "6px 14px", borderRadius: 12, fontSize: 16, fontWeight: 1000, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.6 }}>AED</span> {f.price}
                    </div>
                  </div>
                </div>

                {/* Info Area */}
                <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, lineHeight: 1.2, color: textPrimary }}>{f.name}</h3>
                  </div>

                  <p style={{ 
                    fontSize: 13, 
                    color: softText, 
                    lineHeight: 1.5, 
                    margin: "0 0 20px",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    flex: 1
                  }}>
                    {f.description || "No description provided. Click AI to generate one."}
                  </p>

                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                     <button onClick={() => toggleItemAvailability(f._id, f.inStock ?? true)} style={{ 
                       flex: 1, height: 36, borderRadius: 10, border: "none", 
                       background: isOut ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", 
                       color: isOut ? "#ef4444" : "#22c55e", 
                       fontWeight: 900, fontSize: 11, cursor: "pointer" 
                     }}>
                       {isOut ? "✕ OUT" : "✓ IN STOCK"}
                     </button>
                     <button onClick={() => openDealManager(f)} style={{ 
                       flex: 1, height: 36, borderRadius: 10, border: "none", 
                       background: f.isFlashDeal ? "rgba(255,48,8,0.1)" : "rgba(148,163,184,0.1)", 
                       color: f.isFlashDeal ? "#FF3008" : softText, 
                       fontWeight: 900, fontSize: 11, cursor: "pointer" 
                     }}>
                       ⚡ {f.isFlashDeal ? "DEAL LIVE" : "DEAL"}
                     </button>
                  </div>

                  <div style={{ display: "flex", gap: 8, paddingTop: 16, borderTop: dark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9" }}>
                    <button onClick={() => { setDescModal(f); setAiIngredients(""); setAiResult(f.description || ""); }} 
                      style={{ height: 40, width: 40, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "white", cursor: "pointer", display: "grid", placeItems: "center" }}
                      title="AI Description"
                    >✨</button>
                    <button onClick={() => navigate(`/edit-food/${f._id}`)}
                      style={{ flex: 1, height: 40, borderRadius: 12, border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0", background: "transparent", color: textPrimary, cursor: "pointer", fontWeight: 800, fontSize: 13 }}
                    >Edit</button>
                    <button onClick={() => removeFood(f._id)}
                      style={{ height: 40, width: 40, borderRadius: 12, border: "none", background: dark ? "rgba(239,68,68,0.1)" : "#fef2f2", color: "#ef4444", cursor: "pointer", display: "grid", placeItems: "center" }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
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
      
      {/* ✨ AI Description Writer Modal */}
      {descModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: dark ? "#111827" : "#fff", width: "100%", maxWidth: 500, borderRadius: 24, padding: 32, boxShadow: "0 24px 80px rgba(0,0,0,0.35)", position: "relative", border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#eee"}` }}>
            <button onClick={() => setDescModal(null)} style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--muted)", lineHeight: 1 }}>✕</button>

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, #a855f7, #ec4899)", display: "grid", placeItems: "center", flexShrink: 0, color: "white", fontSize: 24 }}>✨</div>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "var(--text)" }}>AI Description Writer</h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{descModal.name} · AED {descModal.price}</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Ingredients & Notes (Optional)</label>
                <textarea 
                  value={aiIngredients} 
                  onChange={e => setAiIngredients(e.target.value)}
                  placeholder="e.g. Sourdough, rich tomato sauce, fresh basil, double cheese..."
                  style={{ width: "100%", padding: "14px", borderRadius: 12, border: "1px solid var(--border)", background: dark ? "rgba(255,255,255,0.04)" : "#f9fafb", color: "var(--text)", fontSize: 14, minHeight: 80, boxSizing: "border-box", outline: "none", resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={generateDescription}
                  disabled={aiLoading}
                  style={{ flex: 1, padding: "14px", background: aiLoading ? "#9ca3af" : "linear-gradient(90deg, #9333ea, #db2777)", color: "white", border: "none", borderRadius: 14, fontWeight: 900, fontSize: 14, cursor: aiLoading ? "not-allowed" : "pointer" }}
                >
                  {aiLoading ? "Generating..." : aiResult ? "Regenerate" : "Generate Description"}
                </button>
              </div>

              {aiResult && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: "#10b981", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Generated Result (Editable)</label>
                  <textarea 
                    value={aiResult} 
                    onChange={e => setAiResult(e.target.value)}
                    style={{ width: "100%", padding: "14px", borderRadius: 12, border: "2px solid #10b981", background: dark ? "rgba(16,185,129,0.1)" : "#ecfdf5", color: "var(--text)", fontSize: 14, minHeight: 100, boxSizing: "border-box", outline: "none", resize: "none" }}
                  />
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button onClick={() => { setDescModal(null); setAiResult(""); }} style={{ flex: 1, padding: "14px", background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 14, fontWeight: 800, cursor: "pointer" }}>Cancel</button>
                    <button 
                      onClick={saveGeneratedDescription} 
                      disabled={savingDesc}
                      style={{ flex: 1, padding: "14px", background: savingDesc ? "#9ca3af" : "#10b981", color: "white", border: "none", borderRadius: 14, fontWeight: 900, cursor: savingDesc ? "not-allowed" : "pointer" }}
                    >
                      {savingDesc ? "Saving..." : "Save to Menu"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={confirm.isOpen}
        onClose={() => setConfirm({ ...confirm, isOpen: false })}
        onConfirm={confirm.onConfirm}
        title={confirm.title}
        message={confirm.message}
        type={confirm.type}
      />
    </RestaurantLayout>
  );
}