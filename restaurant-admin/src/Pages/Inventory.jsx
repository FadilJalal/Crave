import { useEffect, useState, useCallback, useMemo, useRef, memo } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { toast } from "react-toastify";
import { useTheme } from "../ThemeContext";

let _XLSX = null;
const loadXLSX = () =>
  new Promise((res, rej) => {
    if (_XLSX) return res(_XLSX);
    if (window.XLSX) { _XLSX = window.XLSX; return res(_XLSX); }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => { _XLSX = window.XLSX; res(_XLSX); };
    s.onerror = () => rej(new Error("Failed to load SheetJS"));
    document.head.appendChild(s);
  });

const CATEGORIES = [
  { value: "all", label: "Overview", emoji: "💎" },
  { value: "food_ingredient", label: "Ingredients", emoji: "🥦" },
  { value: "beverage", label: "Bar & Drinks", emoji: "🍹" },
  { value: "packaging", label: "Packaging", emoji: "🛍️" },
  { value: "equipment", label: "Kitchen Tools", emoji: "🔪" },
  { value: "other", label: "Misc", emoji: "🏷️" }
];

const UNITS = ["kg", "g", "l", "ml", "pcs", "box", "btl", "can", "pkt"];

// Reusable HeroChip component from Dashboard for theme consistency
function MetricChip({ icon, label, value, sub, dark, badge }) {
  return (
    <div style={{
      padding: "16px 20px", borderRadius: 24,
      background: dark ? "rgba(255,255,255,0.04)" : "#fff",
      border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid var(--border)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
      transition: "all .3s ease", position: "relative"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontSize: 10, fontWeight: 900, color: dark ? "rgba(255,255,255,0.5)" : "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</span>
        </div>
        {badge && (
          <span style={{ fontSize: 9, fontWeight: 900, padding: "3px 8px", borderRadius: 6, background: badge.positive ? "#10B981" : "#EF4444", color: "white" }}>
            {badge.text}
          </span>
        )}
      </div>
      <div style={{ fontSize: 24, fontWeight: 950, color: dark ? "#fff" : "#111827", letterSpacing: "-0.8px" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.4)" : "#94a3b8", fontWeight: 700, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function Inventory() {
  const { dark } = useTheme();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const fileRef = useRef();

  const [formData, setFormData] = useState({
    itemName: "", category: "food_ingredient", unit: "kg",
    currentStock: 0, minimumStock: 10, maximumStock: 100, unitCost: 0,
    supplier: { name: "", contact: "", email: "" }, expiryDate: "", notes: ""
  });

  const colors = {
    accent: "#ff4e2a",
    danger: "#ef4444",
    success: "#22c55e",
    warning: "#eab308",
    background: dark ? "#0a0a0c" : "#f8fafc",
    cardBg: dark ? "#111827" : "#ffffff",
    border: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"
  };

  useEffect(() => { loadInventory(); }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/inventory");
      if (res.data?.success) setInventory(res.data.data);
    } catch (err) { toast.error("Sync error"); }
    finally { setLoading(false); setSelectedIds([]); }
  };

  const handleBulkDelete = async (ids = selectedIds) => {
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} items permanently?`)) return;
    setSaving(true);
    try {
      await api.post("/api/inventory/bulk-delete", { ids });
      toast.success("Inventory Updated");
      setSelectMode(false);
      loadInventory();
    } catch (err) { toast.error("Action failed"); }
    finally { setSaving(false); }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const XLSX = await loadXLSX();
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws);
      if (!raw.length) return toast.info("Vault file empty");
      
      const findVal = (row, keys) => {
        const entry = Object.entries(row).find(([k]) => 
          keys.some(key => k.toLowerCase().replace(/ /g, '') === key.toLowerCase().replace(/ /g, ''))
        );
        return entry ? entry[1] : undefined;
      };

      const parsed = raw.map(row => {
        const itemName = String(findVal(row, ["itemName", "name", "item", "product"]) || "");
        return {
          itemName,
          category: String(findVal(row, ["category", "type"]) || "food_ingredient").toLowerCase().replace(/ /g, '_'),
          unit: String(findVal(row, ["unit", "measurement"]) || "kg"),
          currentStock: Number(findVal(row, ["currentStock", "stock", "qty", "quantity"]) || 0),
          minimumStock: Number(findVal(row, ["minimumStock", "min", "alert"]) || 10),
          maximumStock: Number(findVal(row, ["maximumStock", "max", "capacity"]) || 100),
          unitCost: Number(findVal(row, ["unitCost", "cost", "price"]) || 0),
          supplier: { name: String(findVal(row, ["supplier", "vendor"]) || "") },
          notes: String(findVal(row, ["notes", "remark"]) || "")
        };
      }).filter(x => x.itemName);
      
      if (parsed.length > 0) {
        await handleConfirmImport(parsed);
      }
    } catch (err) { toast.error("Instant sync failed"); }
    finally { if (fileRef.current) fileRef.current.value = ""; setSaving(false); }
  };

  const handleConfirmImport = async (dataToImport) => {
    try {
      let successCount = 0;
      let skippedCount = 0;
      const menuRes = await api.get("/api/restaurantadmin/foods");
      const menu = menuRes.data?.data || [];
      const existingNames = new Set(inventory.map(i => i.itemName.toLowerCase().trim()));

      for (const item of dataToImport) {
        const normalizedName = item.itemName.toLowerCase().trim();
        if (existingNames.has(normalizedName)) { skippedCount++; continue; }
        try {
          const res = await api.post("/api/inventory/add", { ...item, supplier: JSON.stringify(item.supplier) });
          if (res.data?.success) {
            successCount++;
            const newInvId = res.data.data?._id;
            const matchingFood = menu.find(f => {
              const menuName = f.name.toLowerCase().trim();
              const invName = item.itemName.toLowerCase().trim();
              return menuName === invName || menuName.includes(invName) || invName.includes(menuName);
            });
            if (matchingFood && newInvId) {
              await api.post(`/api/inventory/${newInvId}/link`, { foodId: matchingFood._id, quantityPerOrder: 1 });
            }
          }
        } catch (e) {}
      }
      toast.success(`Synced ${successCount} assets. ${skippedCount > 0 ? `Skipped ${skippedCount} repeats.` : ''}`);
      loadInventory();
    } catch (err) { toast.error("Sync failed"); }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) { setSelectedIds([]); }
    else { setSelectedIds(filtered.map(i => i._id)); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData, supplier: JSON.stringify(formData.supplier) };
      if (editingItem) await api.put(`/api/inventory/${editingItem._id}`, payload);
      else await api.post("/api/inventory/add", payload);
      setShowModal(false);
      loadInventory();
      toast.success("Inventory Vault Updated");
    } catch (err) { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const filtered = useMemo(() => {
    return inventory.filter(i => {
      const matchCat = catFilter === "all" || i.category === catFilter;
      const matchSearch = (i.itemName || "").toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [inventory, catFilter, search]);

  const stats = useMemo(() => {
    const totalValue = inventory.reduce((s, i) => s + (i.currentStock * (i.unitCost || 0)), 0);
    const lowStockCount = inventory.filter(i => i.currentStock <= i.minimumStock).length;
    const health = inventory.length ? Math.round(((inventory.length - lowStockCount) / inventory.length) * 100) : 100;
    return { totalValue, lowStockCount, total: inventory.length, health };
  }, [inventory]);

  if (loading) return <RestaurantLayout><div style={{ padding: 100, textAlign: "center", color: colors.accent, fontWeight: 950 }}>LOADING VAULT...</div></RestaurantLayout>;

  return (
    <RestaurantLayout>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", maxWidth: 1100, margin: "0 auto", padding: "24px 20px 60px", background: colors.background, minHeight: "100vh" }}>
        
        {/* Dashboard-Style Header Header */}
        <div style={{ position: "relative", borderRadius: 32, padding: "32px 40px", background: "linear-gradient(135deg, #111827 0%, #0f172a 100%)", boxShadow: "0 10px 30px rgba(0,0,0,0.04)", border: "1px solid rgba(255,255,255,0.05)", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.14)", fontSize: 11, fontWeight: 800, letterSpacing: "0.4px", marginBottom: 12 }}><span>📦</span> Stock Center</div>
              <h1 style={{ margin: 0, fontSize: 36, fontWeight: 900, letterSpacing: "-1.5px", color: "white" }}>Inventory Vault</h1>
              <p style={{ margin: "10px 0 0", fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>Managing {inventory.length} total SKUs across all categories</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
               <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={handleImport} />
               <button onClick={() => setSelectMode(!selectMode)} style={{ padding: "10px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: selectMode ? colors.danger : "rgba(255,255,255,0.05)", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {selectMode ? "Cancel Clear" : "Select & Wipe"}
               </button>
               {selectMode ? (
                 <>
                   <button onClick={toggleSelectAll} style={{ padding: "10px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                     {selectedIds.length === filtered.length ? "Deselect All" : "Select All"}
                   </button>
                   <button onClick={() => handleBulkDelete()} style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: colors.danger, color: "white", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "0 10px 25px rgba(239,68,68,0.3)" }}>
                      🗑️ Wipe {selectedIds.length} Items
                   </button>
                 </>
               ) : (
                 <>
                   <button onClick={() => fileRef.current?.click()} style={{ padding: "10px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Bulk Import</button>
                   <button onClick={() => { setEditingItem(null); setFormData({ itemName: "", category: "food_ingredient", unit: "kg", currentStock: 0, minimumStock: 10, maximumStock: 100, unitCost: 0, supplier: { name: "" } }); setShowModal(true); }} style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: colors.accent, color: "white", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: `0 10px 25px ${colors.accent}44` }}>+ Add Asset</button>
                 </>
               )}
            </div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 32 }}>
            <MetricChip icon="💎" label="VAULT HEALTH" value={`${stats.health}%`} sub="Overall performance" dark={true} badge={stats.health > 90 ? { text: "Peak", positive: true } : null} />
            <MetricChip icon="💰" label="ASSET VALUE" value={`AED ${stats.totalValue.toLocaleString()}`} sub="Capital in vault" dark={true} />
            <MetricChip icon="📉" label="LOW STOCK" value={`${stats.lowStockCount} Items`} sub="Pending restock" dark={true} badge={stats.lowStockCount > 0 ? { text: "Alert", positive: false } : null} />
            <MetricChip icon="📦" label="TOTAL SKUS" value={`${inventory.length}`} sub="Active signatures" dark={true} />
          </div>
        </div>

        {/* Filter Reel */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
             <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..." style={{ width: "100%", padding: "12px 16px 12px 40px", borderRadius: 14, border: "1px solid var(--border)", background: colors.cardBg, color: "inherit", fontWeight: 700, outline: "none" }} />
             <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }}>🔍</span>
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "4px 0" }}>
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setCatFilter(c.value)} style={{ padding: "10px 18px", borderRadius: 14, border: `1px solid ${catFilter === c.value ? colors.accent : "var(--border)"}`, background: catFilter === c.value ? colors.accent : colors.cardBg, color: catFilter === c.value ? "#fff" : "inherit", fontWeight: 800, fontSize: 11, textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Assets Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {filtered.map(item => (
            <AssetCard 
              key={item._id} 
              item={item} 
              dark={dark} 
              colors={colors}
              isSelected={selectedIds.includes(item._id)}
              selectMode={selectMode}
              onSelect={() => setSelectedIds(prev => prev.includes(item._id) ? prev.filter(id => id !== item._id) : [...prev, item._id])}
              onEdit={() => { setEditingItem(item); setFormData({ ...item, supplier: item.supplier || { name: "" } }); setShowModal(true); }} 
              onDelete={() => handleBulkDelete([item._id])} 
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1 / -1", padding: "100px 40px", textAlign: "center", background: colors.cardBg, borderRadius: 32, border: "1px dashed var(--border)" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <h3 style={{ margin: 0, fontWeight: 900 }}>No assets match.</h3>
              <p style={{ color: "var(--muted)", fontWeight: 500 }}>Adjust your filters or add a new item.</p>
            </div>
          )}
        </div>

        {/* Modals synced with Dashboard style */}
        {showModal && (
          <div style={s.overlay}>
            <div style={s.box(dark, colors)}>
              <h3 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 950, color: dark ? "#fff" : "#111827" }}>{editingItem ? "Refine Asset" : "Register New Asset"}</h3>
              <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                 <div style={{ gridColumn: "1 / -1" }}>
                   <label style={s.label}>Asset Identity</label>
                   <input style={s.input(dark, colors)} value={formData.itemName} onChange={e => setFormData({ ...formData, itemName: e.target.value })} required placeholder="e.g. Wagyu Beef" />
                 </div>
                 <div>
                   <label style={s.label}>Category</label>
                   <select style={s.input(dark, colors)} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                     {CATEGORIES.filter(c => c.value !== "all").map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                   </select>
                 </div>
                 <div>
                   <label style={s.label}>Metric</label>
                   <select style={s.input(dark, colors)} value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                     {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                   </select>
                 </div>
                 <div>
                   <label style={s.label}>Cost/Unit (AED)</label>
                   <input type="number" step="0.01" style={s.input(dark, colors)} value={formData.unitCost} onChange={e => setFormData({ ...formData, unitCost: Number(e.target.value) })} />
                 </div>
                 <div>
                   <label style={s.label}>Live Stock</label>
                   <input type="number" style={s.input(dark, colors)} value={formData.currentStock} onChange={e => setFormData({ ...formData, currentStock: Number(e.target.value) })} />
                 </div>
                 <div>
                   <label style={s.label}>Alert Threshold</label>
                   <input type="number" style={s.input(dark, colors)} value={formData.minimumStock} onChange={e => setFormData({ ...formData, minimumStock: Number(e.target.value) })} />
                 </div>
                 <div>
                   <label style={s.label}>Max Capacity</label>
                   <input type="number" style={s.input(dark, colors)} value={formData.maximumStock} onChange={e => setFormData({ ...formData, maximumStock: Number(e.target.value) })} />
                 </div>
                 <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, marginTop: 12 }}>
                   <button type="submit" disabled={saving} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "none", background: colors.accent, color: "white", fontWeight: 900, cursor: "pointer" }}>{saving ? "Saving..." : "Verify & Save"}</button>
                   <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontWeight: 800, cursor: "pointer" }}>Discard</button>
                 </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </RestaurantLayout>
  );
}

function AssetCard({ item, dark, colors, selectMode, isSelected, onSelect, onEdit, onDelete }) {
  const stockPct = Math.min(100, (item.currentStock / (item.maximumStock || 1)) * 100);
  const isCritical = item.currentStock <= item.minimumStock;
  const isOver = item.currentStock >= item.maximumStock && item.maximumStock > 0;
  const statusColor = isCritical ? colors.danger : isOver ? colors.accent : colors.success;

  return (
    <div 
      style={{ 
        background: colors.cardBg, borderRadius: 24, padding: "20px", border: `1.5px solid ${isSelected ? colors.danger : "var(--border)"}`,
        boxShadow: isSelected ? `0 8px 24px rgba(239, 68, 68, 0.1)` : "0 4px 12px rgba(0,0,0,0.01)",
        display: "flex", flexDirection: "column", minHeight: 280, transition: "all 0.2s", cursor: selectMode ? "pointer" : "default" 
      }}
      onClick={() => selectMode && onSelect()}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12 }}>
           {selectMode ? (
             <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${isSelected ? colors.danger : "var(--border)"}`, background: isSelected ? colors.danger : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>
               {isSelected && <span style={{ color: "white", fontSize: 13 }}>✓</span>}
             </div>
           ) : (
             <div style={{ width: 44, height: 44, borderRadius: 14, background: dark ? "rgba(255,255,255,0.03)" : "#f8fafc", display: "grid", placeItems: "center", fontSize: 20 }}>
               {CATEGORIES.find(c => c.value === item.category)?.emoji || "📦"}
             </div>
           )}
           <div>
             <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", padding: "3px 8px", borderRadius: 6, background: isCritical ? "rgba(239,68,68,0.1)" : "rgba(0,0,0,0.05)", color: isCritical ? colors.danger : "var(--muted)", letterSpacing: 0.5 }}>{item.category.replace('_',' ')}</span>
             <h4 style={{ fontSize: 16, fontWeight: 900, margin: "6px 0 2px", color: dark ? "#fff" : "#111827" }}>{item.itemName}</h4>
             <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>AED {item.unitCost} / {item.unit}</div>
           </div>
        </div>
        {!selectMode && (
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} style={{ width: 32, height: 32, borderRadius: 10, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 14 }}>✏️</button>
        )}
      </div>

      <div style={{ marginTop: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
           <span style={{ fontSize: 12, fontWeight: 900, color: statusColor }}>{item.currentStock} {item.unit.toUpperCase()}</span>
           <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", opacity: 0.6 }}>LIMIT {item.maximumStock}</span>
        </div>
        <div style={{ height: 6, background: dark ? "rgba(255,255,255,0.05)" : "#f1f5f9", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${stockPct}%`, background: statusColor, transition: "width 0.8s" }} />
        </div>
      </div>

      <div style={{ marginTop: 16, padding: "12px", background: dark ? "rgba(255,255,255,0.02)" : "#f8fafc", borderRadius: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 950, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>Recipe Connections</div>
          {!selectMode && (item.category === 'packaging' || item.category === 'beverage' || item.category === 'other') && (
            <button 
              onClick={async (e) => {
                e.stopPropagation();
                if (!window.confirm(`Auto-Connect '${item.itemName}' to ALL menu items?`)) return;
                try {
                  const menuRes = await api.get("/api/restaurantadmin/foods");
                  const menu = menuRes.data?.data || [];
                  for (const f of menu) {
                    await api.post(`/api/inventory/${item._id}/link`, { foodId: f._id, quantityPerOrder: 1 });
                  }
                  toast.success(`Connected to ${menu.length} items!`);
                  loadInventory();
                } catch (err) { toast.error("Global Link failed"); }
              }}
              style={{ padding: "2px 8px", borderRadius: 6, border: "none", background: colors.success, color: "white", fontSize: 8, fontWeight: 900, cursor: "pointer" }}
            >
              Link to All
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {item.linkedMenuItems?.length > 0 ? (
            item.linkedMenuItems.map((l, i) => <span key={i} style={{ padding: "3px 8px", fontSize: 10, fontWeight: 800, background: dark ? "#111827" : "#fff", border: "1px solid var(--border)", borderRadius: 6 }}>{l.resolvedFoodName || l.foodId?.name || "Dish"}</span>)
          ) : (
            <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.4 }}>No active menu links</span>
          )}
        </div>
      </div>

      {!selectMode && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ marginTop: 12, width: "100%", padding: "8px", borderRadius: 10, border: "none", background: "rgba(239,68,68,0.08)", color: colors.danger, fontWeight: 800, fontSize: 11, cursor: "pointer" }}>
          Remove from Vault
        </button>
      )}
    </div>
  );
}

const s = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  box: (dark, colors) => ({ background: colors.cardBg, borderRadius: 32, padding: 32, width: "100%", maxWidth: 540, border: "1px solid var(--border)", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }),
  label: { fontSize: 10, fontWeight: 950, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 },
  input: (dark, colors) => ({ width: "100%", padding: "12px 16px", borderRadius: 14, border: "1.5px solid var(--border)", background: dark ? "#0a0a0c" : "#f9fafb", color: "inherit", fontWeight: 700, outline: "none" })
};