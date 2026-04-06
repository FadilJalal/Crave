import { useEffect, useState, useCallback, useMemo, useRef, memo } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { toast } from "react-toastify";
import { useTheme } from "../ThemeContext";

const CATEGORIES = [
  { value: "all", label: "All", emoji: "📋" },
  { value: "food_ingredient", label: "Ingredients", emoji: "🍎" },
  { value: "beverage", label: "Beverages", emoji: "🥤" },
  { value: "packaging", label: "Packaging", emoji: "📦" },
  { value: "equipment", label: "Equipment", emoji: "🔧" },
  { value: "other", label: "Other", emoji: "📝" }
];

const UNITS = ["kg", "g", "l", "ml", "pieces", "boxes", "bottles", "cans", "packets"];

const SORT_OPTIONS = [
  { value: "urgency", label: "Urgency" },
  { value: "name", label: "Name" },
  { value: "stock_low", label: "Stock: Low → High" },
  { value: "stock_high", label: "Stock: High → Low" },
  { value: "value", label: "Value" },
  { value: "expiry", label: "Expiry Date" },
];

// ── Stock bar color helper ──
function stockColor(current, min, max) {
  if (current <= 0) return "#dc2626";
  if (current <= min * 0.5) return "#dc2626";
  if (current <= min) return "#f59e0b";
  if (current >= max) return "#3b82f6";
  return "#16a34a";
}

function stockPct(current, max) {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((current / max) * 100));
}

function timeAgo(date) {
  if (!date) return "Never";
  const d = (Date.now() - new Date(date).getTime()) / 864e5;
  if (d < 1) return "Today";
  if (d < 2) return "Yesterday";
  if (d < 7) return `${Math.floor(d)}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function resolveLinkedMenuItem(link) {
  const food = link?.foodId && typeof link.foodId === "object" ? link.foodId : null;
  const resolvedFoodId = link?.resolvedFoodId || (food?._id ? String(food._id) : (link?.foodId ? String(link.foodId) : ""));
  const resolvedFoodName = link?.resolvedFoodName || food?.name || (link?.isMissingFood ? "Deleted menu item" : "Unknown menu item");

  return {
    ...link,
    resolvedFoodId,
    resolvedFoodName,
    isMissingFood: Boolean(link?.isMissingFood || !food),
  };
}

const getInventoryThemeVars = (dark) => ({
  "--inv-panel": dark ? "#0f172a" : "#ffffff",
  "--inv-soft": dark ? "#111827" : "#f9fafb",
  "--inv-soft-2": dark ? "#1f2937" : "#f3f4f6",
  "--inv-border": dark ? "#334155" : "var(--border)",
  "--inv-muted": dark ? "#cbd5e1" : "var(--muted)",
  "--inv-text": dark ? "#f3f4f6" : "var(--text)",
  "--inv-link-bg": dark ? "rgba(16,185,129,0.16)" : "#f0fdf4",
  "--inv-link-border": dark ? "rgba(110,231,183,0.35)" : "#bbf7d0",
  "--inv-link-text": dark ? "#a7f3d0" : "#166534",
  "--inv-warn-bg": dark ? "rgba(245,158,11,0.18)" : "#fffbeb",
  "--inv-warn-border": dark ? "rgba(245,158,11,0.35)" : "#fde68a",
  "--inv-warn-text": dark ? "#fcd34d" : "#92400e",
  "--inv-danger-bg": dark ? "rgba(239,68,68,0.18)" : "#fef2f2",
  "--inv-danger-border": dark ? "rgba(239,68,68,0.35)" : "#fecaca",
  "--inv-danger-text": dark ? "#fca5a5" : "#dc2626",
  "--inv-info-bg": dark ? "rgba(59,130,246,0.18)" : "#eff6ff",
  "--inv-info-border": dark ? "rgba(96,165,250,0.35)" : "#bfdbfe",
  "--inv-info-text": dark ? "#93c5fd" : "#1e40af",
  "--inv-modal-shadow": dark ? "0 24px 60px rgba(0,0,0,0.45)" : "0 24px 60px rgba(0,0,0,0.2)",
});

const InventoryCard = memo(({ item, ai, isSelected, catEmoji, onToggleSelect, onQuickAdjust, onStockUpdate, onEdit, onDelete, onLink }) => {
  const urgency = ai?.urgency || 0;
  const pct = stockPct(item.currentStock, item.maximumStock);
  const color = stockColor(item.currentStock, item.minimumStock, item.maximumStock);

  return (
    <div key={item._id} style={{ ...s.card(urgency), outline: isSelected ? "2px solid #dc2626" : "none", outlineOffset: -1 }}>
      <div style={s.cardTop}>
        <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(item._id)}
          style={{ width: 16, height: 16, accentColor: "#dc2626", cursor: "pointer", flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={s.cardName}>{item.itemName}</p>
          <p style={s.cardMeta}>{item.unit} · {item.supplier?.name || "No supplier"} · Restocked {timeAgo(item.lastRestocked)}</p>
        </div>
        <span style={s.catBadge}>{catEmoji(item.category)} {CATEGORIES.find(c => c.value === item.category)?.label || item.category}</span>
      </div>

      <div>
        <div style={s.barWrap}><div style={s.bar(pct, color)} /></div>
        <div style={s.barLabel}><span>{item.currentStock} {item.unit}</span><span>Min {item.minimumStock} · Max {item.maximumStock}</span></div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={s.adjRow}>
          <button style={s.adjBtn} onClick={() => onQuickAdjust(item._id, -5)} title="-5">−5</button>
          <button style={s.adjBtn} onClick={() => onQuickAdjust(item._id, -1)} title="-1">−</button>
          <input
            style={s.adjInput}
            type="number" min="0" step="0.1"
            value={item.currentStock}
            onChange={e => onStockUpdate(item._id, e.target.value)}
          />
          <button style={s.adjBtn} onClick={() => onQuickAdjust(item._id, 1)} title="+1">+</button>
          <button style={s.adjBtn} onClick={() => onQuickAdjust(item._id, 5)} title="+5">+5</button>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--inv-text)" }}>AED {(item.currentStock * item.unitCost).toFixed(2)}</div>
          <div style={{ fontSize: 10, color: "var(--inv-muted)", fontWeight: 600 }}>@ AED {item.unitCost.toFixed(2)}/{item.unit}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {item.status === "low" && <span style={s.statusChip("warn")}>📉 Low Stock</span>}
        {item.status === "high" && <span style={s.statusChip("info")}>📈 Overstock</span>}
        {item.expiryStatus === "expired" && <span style={s.statusChip("danger")}>⏰ Expired</span>}
        {item.expiryStatus === "expiring_soon" && <span style={s.statusChip("warn")}>⏰ Expires Soon</span>}
        {item.expiryDate && item.expiryStatus !== "expired" && item.expiryStatus !== "expiring_soon" && (
          <span style={{ fontSize: 10, color: "var(--inv-muted)", fontWeight: 600 }}>Exp: {new Date(item.expiryDate).toLocaleDateString()}</span>
        )}
      </div>

      <div style={s.cardActions}>
        {item.linkedMenuItems?.length > 0 && (
          <div style={{ fontSize: 10, color: "#16a34a", fontWeight: 700, marginBottom: 8, width: "100%" }}>
            <div>🔗 {item.linkedMenuItems.length} menu item{item.linkedMenuItems.length !== 1 ? "s" : ""} linked</div>
          </div>
        )}
        <button style={s.actBtn(false)} onClick={() => onEdit(item)}>✏️ Edit</button>
        <button style={s.actBtn(false)} onClick={() => onLink(item)}>🔗 Link</button>
        <button style={s.actBtn(true)} onClick={() => onDelete(item._id)}>🗑️ Remove</button>
      </div>
    </div>
  );
});

// ── Styles ─────────────────────────────────────────────────────
const s = {
  wrap: { maxWidth: 1100 },
  hdr: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 20 },
  hdrLeft: { flex: 1 },
  title: { fontSize: 28, fontWeight: 900, letterSpacing: -0.6, margin: 0, display: "flex", alignItems: "center", gap: 10 },
  sub: { fontSize: 13, color: "var(--inv-muted)", margin: "4px 0 0", fontWeight: 500 },
  hdrBtns: { display: "flex", gap: 8, flexWrap: "wrap" },

  // Health score ring
  ring: (score) => ({
    width: 52, height: 52, borderRadius: "50%",
    background: `conic-gradient(${score >= 70 ? "#16a34a" : score >= 40 ? "#f59e0b" : "#dc2626"} ${score * 3.6}deg, #f3f4f6 0deg)`,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  }),
  ringInner: { width: 40, height: 40, borderRadius: "50%", background: "var(--inv-panel)", color: "var(--inv-text)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900 },

  // Stats row
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 },
  stat: (accent) => ({
    padding: "14px 16px", borderRadius: 14, background: "var(--inv-panel)", border: "1px solid var(--inv-border)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
  }),
  statVal: (color) => ({ fontSize: 24, fontWeight: 900, color: color || "var(--inv-text)", letterSpacing: -0.5, margin: 0 }),
  statLbl: { fontSize: 11, fontWeight: 700, color: "var(--inv-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: 0.4 },

  // Tips
  tipWrap: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 },
  tip: (type) => {
    const m = { danger: { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", icon: "🚨" }, warning: { bg: "#fffbeb", border: "#fde68a", color: "#92400e", icon: "⚠️" }, success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", icon: "✅" }, info: { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", icon: "💡" } };
    const c = m[type] || m.info;
    return { padding: "10px 14px", borderRadius: 12, background: c.bg, border: `1px solid ${c.border}`, color: c.color, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, icon: c.icon };
  },

  // Toolbar
  toolbar: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 },
  search: { flex: "1 1 220px", padding: "9px 14px 9px 36px", borderRadius: 10, border: "1px solid var(--inv-border)", background: "var(--inv-soft)", color: "var(--inv-text)", fontSize: 13, fontFamily: "inherit", outline: "none", minWidth: 180 },
  searchWrap: { position: "relative", flex: "1 1 220px" },
  searchIcon: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--inv-muted)", pointerEvents: "none" },
  select: { padding: "9px 12px", borderRadius: 10, border: "1px solid var(--inv-border)", background: "var(--inv-soft)", color: "var(--inv-text)", fontSize: 13, fontFamily: "inherit", cursor: "pointer" },

  // Category pills
  pills: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 },
  pill: (active) => ({
    padding: "7px 14px", borderRadius: 50, border: active ? "2px solid var(--orange)" : "1.5px solid var(--border)",
    background: active ? "var(--orangeSoft)" : "var(--inv-panel)", fontWeight: 700, fontSize: 12,
    color: active ? "var(--orange)" : "var(--inv-muted)", cursor: "pointer", fontFamily: "inherit",
    display: "inline-flex", alignItems: "center", gap: 5, transition: "all .15s",
  }),

  // Cards grid
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 14 },

  // Individual card
  card: (urgency) => ({
    background: "var(--inv-panel)", borderRadius: 16, border: `1px solid ${urgency >= 70 ? "#fecaca" : urgency >= 50 ? "#fde68a" : "var(--inv-border)"}`,
    boxShadow: urgency >= 70 ? "0 4px 18px rgba(220,38,38,0.08)" : "0 2px 10px rgba(0,0,0,0.04)",
    padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, transition: "all .15s",
  }),
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  cardName: { fontSize: 15, fontWeight: 800, margin: 0, color: "var(--inv-text)", lineHeight: 1.3 },
  cardMeta: { fontSize: 11, color: "var(--inv-muted)", fontWeight: 600, margin: "2px 0 0" },
  catBadge: { fontSize: 11, padding: "3px 8px", borderRadius: 50, background: "var(--inv-soft-2)", fontWeight: 700, color: "var(--inv-muted)", whiteSpace: "nowrap" },

  // Stock bar
  barWrap: { height: 8, borderRadius: 50, background: "var(--inv-soft-2)", overflow: "hidden", position: "relative" },
  bar: (pct, color) => ({ height: "100%", width: `${Math.min(100, pct)}%`, borderRadius: 50, background: color, transition: "width .4s ease" }),
  barLabel: { display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "var(--inv-muted)", margin: "4px 0 0" },

  // Quick adjust
  adjRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 2 },
  adjBtn: { width: 28, height: 28, borderRadius: 8, border: "1px solid var(--inv-border)", background: "var(--inv-soft)", color: "var(--inv-text)", cursor: "pointer", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", transition: "all .12s" },
  adjInput: { width: 56, textAlign: "center", padding: "4px 6px", borderRadius: 8, border: "1px solid var(--inv-border)", background: "var(--inv-panel)", color: "var(--inv-text)", fontSize: 13, fontWeight: 700, fontFamily: "inherit" },

  // AI insight row
  aiRow: { padding: "8px 10px", borderRadius: 10, background: "#faf5ff", border: "1px solid #e9d5ff", fontSize: 11, fontWeight: 600, color: "#6b21a8", display: "flex", alignItems: "flex-start", gap: 6 },

  // Card actions
  cardActions: { display: "flex", gap: 6, marginTop: "auto", paddingTop: 4 },
  statusChip: (tone) => {
    const map = {
      warn: { bg: "var(--inv-warn-bg)", border: "var(--inv-warn-border)", color: "var(--inv-warn-text)" },
      danger: { bg: "var(--inv-danger-bg)", border: "var(--inv-danger-border)", color: "var(--inv-danger-text)" },
      info: { bg: "var(--inv-info-bg)", border: "var(--inv-info-border)", color: "var(--inv-info-text)" },
    };
    const t = map[tone] || map.info;
    return { fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: t.bg, border: `1px solid ${t.border}`, color: t.color, display: "inline-flex", alignItems: "center", gap: 4 };
  },
  actBtn: (danger) => ({
    flex: 1, minHeight: 34, padding: "7px 10px", borderRadius: 8, border: `1px solid ${danger ? "var(--inv-danger-border)" : "var(--inv-border)"}`,
    background: danger ? "var(--inv-danger-bg)" : "var(--inv-panel)", cursor: "pointer", fontWeight: 700, fontSize: 11,
    color: danger ? "var(--inv-danger-text)" : "var(--inv-text)", fontFamily: "inherit", textAlign: "center", transition: "all .12s",
    display: "inline-flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap",
  }),

  // Modal overlay
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { background: "var(--inv-panel)", borderRadius: 20, padding: "24px 28px", maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--inv-modal-shadow)", color: "var(--inv-text)" },
  modalTitle: { fontSize: 20, fontWeight: 900, margin: "0 0 16px", color: "var(--inv-text)" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, fontWeight: 700, color: "var(--inv-muted)" },
  input: { padding: "9px 12px", borderRadius: 10, border: "1px solid var(--inv-border)", background: "var(--inv-soft)", color: "var(--inv-text)", fontSize: 13, fontFamily: "inherit", outline: "none", transition: "border .15s" },
  formBtns: { display: "flex", gap: 10, marginTop: 16 },

  // Empty state
  empty: { textAlign: "center", padding: "60px 20px", color: "var(--inv-muted)" },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 800, color: "var(--inv-text)", margin: "0 0 6px" },
  emptyDesc: { fontSize: 13, maxWidth: 360, margin: "0 auto" },

  // AI panel
  aiPanel: { background: "linear-gradient(135deg, #faf5ff, #eff6ff)", borderRadius: 16, border: "1px solid #e9d5ff", padding: "18px 20px", marginBottom: 18 },
  aiPanelHdr: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  aiPanelTitle: { fontSize: 16, fontWeight: 900, margin: 0, color: "#6b21a8" },
  aiPanelSub: { fontSize: 11, color: "#7c3aed", fontWeight: 600, margin: "2px 0 0" },
  aiLoadBtn: { padding: "7px 14px", borderRadius: 10, border: "1.5px solid #c4b5fd", background: "white", cursor: "pointer", fontWeight: 700, fontSize: 12, color: "#7c3aed", fontFamily: "inherit", marginLeft: "auto" },
};

export default function Inventory() {
  const { dark } = useTheme();
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState({});
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkUpdateField, setBulkUpdateField] = useState("");
  const [bulkUpdateValue, setBulkUpdateValue] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [sortBy, setSortBy] = useState("urgency");
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [linkingItem, setLinkingItem] = useState(null);
  const [menuFoods, setMenuFoods] = useState([]);
  const [linkQty, setLinkQty] = useState(1);
  const [linkFoodId, setLinkFoodId] = useState("");
  const [logItem, setLogItem] = useState(null);
  const [logData, setLogData] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const importRef = useRef(null);

  const [formData, setFormData] = useState({
    itemName: "", category: "food_ingredient", unit: "kg",
    currentStock: 0, minimumStock: 10, maximumStock: 100, unitCost: 0,
    supplier: { name: "", contact: "", email: "" }, expiryDate: "", notes: ""
  });

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      const [invRes, alertsRes] = await Promise.all([
        api.get("/api/inventory?t=" + timestamp),
        api.get("/api/inventory/alerts?t=" + timestamp)
      ]);
      console.log("[Inventory] Raw inventory response:", invRes.data?.data);
      if (invRes.data?.success) { 
        console.log("[Inventory] Setting inventory with linked items:", invRes.data.data.map(item => ({
          name: item.itemName,
          linkedMenuItems: item.linkedMenuItems,
          linkedCount: item.linkedMenuItems?.length || 0
        })));
        setInventory(invRes.data.data); 
        setSummary(invRes.data.summary); 
      }
      if (alertsRes.data?.success) setAlerts(alertsRes.data.data);
    } catch (err) {
      console.error("Failed to load inventory", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const loadAI = async () => {
    setAiLoading(true);
    try {
      const res = await api.get("/api/inventory/ai-insights");
      if (res.data?.success) setAiData(res.data.data);
    } catch { /* silent */ }
    setAiLoading(false);
  };

  const downloadInventoryTemplate = () => {
    const rows = [
      ["Item Name","Category","Unit","Current Stock","Unit Cost (AED)","Minimum Stock","Maximum Stock","Expiry Date","Supplier Name","Supplier Contact","Notes"],
      ["Coleslaw Small","food_ingredient","pieces","0","0","10","100","mm/dd/yyyy","Name","Phone",""],
      ["Cooking Oil","food_ingredient","liters","50","15","5","100","12/31/2026","Oil Supplier","123-456-7890","Vegetable oil"],
      ["Cheese","food_ingredient","kg","25","30","10","50","01/15/2027","Dairy Farm","987-654-3210","Fresh cheese"],
      ["Flour","food_ingredient","kg","100","2","20","200","06/30/2026","Flour Mill","555-123-4567","All-purpose flour"]
    ];

    const csvContent = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadXLSX = async () => {
    if (window.XLSX) return window.XLSX;
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      script.onload = () => resolve(window.XLSX);
      script.onerror = () => reject(new Error("Failed to load XLSX"));
      document.head.appendChild(script);
    });
  };

  const parseInventorySpreadsheet = async (file) => {
    const XLSX = await loadXLSX();
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  };

  const mapCategoryValue = (categoryInput) => {
    if (!categoryInput) return "food_ingredient";
    const input = String(categoryInput).toLowerCase().trim();
    
    // Map both labels and values to correct enum values
    const categoryMap = {
      "ingredients": "food_ingredient",
      "food_ingredient": "food_ingredient",
      "food ingredient": "food_ingredient",
      "beverages": "beverage",
      "beverage": "beverage",
      "packaging": "packaging",
      "equipment": "equipment",
      "other": "other"
    };
    
    return categoryMap[input] || "food_ingredient";
  };

  const handleImportInventory = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStatus("Parsing spreadsheet...");

    try {
      const rows = await parseInventorySpreadsheet(file);
      console.log("[Import] Parsed rows:", rows);
      const previewItems = [];

      rows.forEach(row => {
        console.log("[Import] Processing row:", row);
        const name = String(row["Item Name"] || row.itemName || row.name || "").trim();
        if (!name) return;

        const match = inventory.find(item => item.itemName.toLowerCase() === name.toLowerCase());
        
        if (match) {
          // Preview update
          const updatePreview = {
            type: "update",
            itemName: name,
            existingItem: match,
            changes: {}
          };
          
          if (row["Current Stock"] !== undefined && row["Current Stock"] !== "") updatePreview.changes.currentStock = Number(row["Current Stock"]);
          if (row["Minimum Stock"] !== undefined && row["Minimum Stock"] !== "") updatePreview.changes.minimumStock = Number(row["Minimum Stock"]);
          if (row["Maximum Stock"] !== undefined && row["Maximum Stock"] !== "") updatePreview.changes.maximumStock = Number(row["Maximum Stock"]);
          if (row["Unit Cost (AED)"] !== undefined && row["Unit Cost (AED)"] !== "") updatePreview.changes.unitCost = Number(row["Unit Cost (AED)"]);
          if (row["Unit"] !== undefined && row["Unit"] !== "") updatePreview.changes.unit = String(row["Unit"]).trim();
          if (row["Category"] !== undefined && row["Category"] !== "") updatePreview.changes.category = mapCategoryValue(row["Category"]);
          if (row["Expiry Date"] !== undefined && row["Expiry Date"] !== "") updatePreview.changes.expiryDate = String(row["Expiry Date"]).trim();
          if (row["Notes"] !== undefined && row["Notes"] !== "") updatePreview.changes.notes = String(row["Notes"]).trim();
          if (row["Supplier Name"] || row["Supplier Contact"]) {
            const supplierName = String(row["Supplier Name"] || "").trim();
            const supplierContact = String(row["Supplier Contact"] || "").trim();
            updatePreview.changes.supplier = { name: supplierName, contact: supplierContact, email: "" };
          }

          if (Object.keys(updatePreview.changes).length > 0) previewItems.push(updatePreview);
        } else {
          // Preview create
          const createPreview = {
            type: "create",
            itemName: name,
            newItem: {
              category: mapCategoryValue(row["Category"]),
              unit: row["Unit"] || "pieces",
              currentStock: row["Current Stock"] ? Number(row["Current Stock"]) : 0,
              minimumStock: row["Minimum Stock"] ? Number(row["Minimum Stock"]) : 10,
              maximumStock: row["Maximum Stock"] ? Number(row["Maximum Stock"]) : 100,
              unitCost: row["Unit Cost (AED)"] ? Number(row["Unit Cost (AED)"]) : 0,
              supplier: row["Supplier Name"] || row["Supplier Contact"] ? 
                { 
                  name: String(row["Supplier Name"] || "").trim(), 
                  contact: String(row["Supplier Contact"] || "").trim(), 
                  email: "" 
                } 
                : { name: "", contact: "", email: "" },
              expiryDate: row["Expiry Date"] || "",
              notes: row["Notes"] || ""
            }
          };
          previewItems.push(createPreview);
        }
      });

      if (previewItems.length === 0) {
        setImportStatus("No inventory items found to update or create.");
        setImporting(false);
        return;
      }

      // Show preview modal
      console.log("[Import] Preview items:", previewItems);
      setPreviewData(previewItems);
      setShowImportPreview(true);
      setImportStatus("");
    } catch (error) {
      console.error(error);
      setImportStatus("Import failed: " + (error.message || "Unknown error"));
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const confirmImport = async () => {
    setImporting(true);
    setImportStatus("Processing import...");

    try {
      const toUpdate = [];
      const toCreate = [];

      previewData.forEach(item => {
        if (item.type === "update") {
          const updates = { id: item.existingItem._id, ...item.changes };
          toUpdate.push(updates);
        } else {
          const newItem = { itemName: item.itemName, ...item.newItem };
          toCreate.push(newItem);
        }
      });

      // Update existing items
      if (toUpdate.length > 0) {
        setImportStatus(`Updating ${toUpdate.length} existing items...`);
        try {
          const res = await api.post("/api/inventory/bulk-update", { updates: toUpdate });
          console.log("[Import] Bulk update response:", res.data);
        } catch (err) {
          console.error("[Import] Bulk update failed:", err.response?.data || err);
          throw new Error(`Update failed: ${err.response?.data?.message || err.message}`);
        }
      }

      // Create new items
      let createdCount = 0;
      if (toCreate.length > 0) {
        setImportStatus(`Creating ${toCreate.length} new items...`);
        for (const item of toCreate) {
          try {
            const payload = { ...item, supplier: JSON.stringify(item.supplier) };
            console.log("[Import] Creating item payload:", JSON.stringify(payload));
            const res = await api.post("/api/inventory/add", payload);
            console.log("[Import] Item created:", res.data);
            createdCount++;
          } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || "Unknown error";
            console.error("[Import] Failed to create item:", item.itemName);
            console.error("[Import] Error details:", errorMsg);
            console.error("[Import] Full error:", err.response?.data);
          }
        }
        if (createdCount === 0 && toCreate.length > 0) {
          throw new Error(`Failed to create any items. Check console for details.`);
        }
      }

      await loadInventory();
      setImportStatus(`✅ Updated ${toUpdate.length} items and created ${createdCount} new items successfully.`);
      setShowImportPreview(false);
      setPreviewData([]);
    } catch (error) {
      console.error("[Import] Error:", error);
      setImportStatus("❌ " + (error.message || "Unknown error"));
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setFormData({ itemName: "", category: "food_ingredient", unit: "kg", currentStock: 0, minimumStock: 10, maximumStock: 100, unitCost: 0, supplier: { name: "", contact: "", email: "" }, expiryDate: "", notes: "" });
    setEditingItem(null);
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData, supplier: JSON.stringify(formData.supplier) };
      if (editingItem) {
        const res = await api.put(`/api/inventory/${editingItem._id}`, payload);
        if (res.data?.success) {
          setInventory(prev => prev.map(item => item._id === editingItem._id ? res.data.data : item));
        }
      } else {
        const res = await api.post("/api/inventory/add", payload);
        if (res.data?.success) {
          setInventory(prev => [res.data.data, ...prev]);
        }
      }
      resetForm();
    } catch (err) { alert(err?.response?.data?.message || "Failed to save"); }
    setSaving(false);
  };

  const handleEdit = useCallback((item) => {
    setFormData({
      itemName: item.itemName, category: item.category, unit: item.unit,
      currentStock: item.currentStock, minimumStock: item.minimumStock, maximumStock: item.maximumStock,
      unitCost: item.unitCost, supplier: item.supplier || { name: "", contact: "", email: "" },
      expiryDate: item.expiryDate ? item.expiryDate.split("T")[0] : "", notes: item.notes || ""
    });
    setEditingItem(item);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm("Remove this item from inventory?")) return;
    try {
      console.log("[Inventory] Deleting item:", id);
      const res = await api.delete(`/api/inventory/${id}`);
      console.log("[Inventory] Delete response:", res.data);
      
      if (res.data?.success) {
        toast.success(res.data?.message || "Item removed successfully");
        await loadInventory();
      } else {
        toast.error(res.data?.message || "Failed to remove item");
      }
    } catch (err) { 
      console.error("[Inventory] Delete error:", err);
      toast.error(err?.response?.data?.message || "Failed to remove item"); 
    }
  }, [loadInventory]);

  const toggleSelect = useCallback((id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  }), []);

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0 || !bulkUpdateField) return;
    if (!window.confirm(`Update ${bulkUpdateField} for ${selectedIds.size} selected item${selectedIds.size !== 1 ? "s" : ""}?`)) return;

    const updates = [...selectedIds].map(id => ({
      id,
      [bulkUpdateField]: bulkUpdateValue
    }));

    try {
      const res = await api.post("/api/inventory/bulk-update", { updates });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setInventory(prev => prev.map(item => {
          const changed = res.data.data.find(u => u._id === item._id);
          return changed ? changed : item;
        }));
      } else {
        setInventory(prev => prev.map(item => selectedIds.has(item._id) ? { ...item, [bulkUpdateField]: bulkUpdateField === 'supplier' ? JSON.parse(bulkUpdateValue || '{}') : bulkUpdateField === 'currentStock' || bulkUpdateField === 'minimumStock' || bulkUpdateField === 'maximumStock' || bulkUpdateField === 'unitCost' ? Number(bulkUpdateValue) : bulkUpdateValue } : item));
      }

      setSelectedIds(new Set());
      setShowBulkUpdateModal(false);
      setBulkUpdateField("");
      setBulkUpdateValue("");
    } catch (err) { alert(err?.response?.data?.message || "Failed to update"); }
  };

  const handleQuickAdjust = useCallback(async (id, adjustment) => {
    try {
      // Optimistic update - update local state immediately
      setInventory(prev => prev.map(item => 
        item._id === id 
          ? { ...item, currentStock: Math.max(0, item.currentStock + adjustment) }
          : item
      ));
      
      // Make API call in background
      await api.patch(`/api/inventory/${id}/stock`, { adjustment });
      
      // Silently reload in background without showing loading state
      const timestamp = new Date().getTime();
      const [invRes, alertsRes] = await Promise.all([
        api.get("/api/inventory?t=" + timestamp),
        api.get("/api/inventory/alerts?t=" + timestamp)
      ]);
      if (invRes.data?.success) { 
        setInventory(invRes.data.data); 
        setSummary(invRes.data.summary); 
      }
      if (alertsRes.data?.success) setAlerts(alertsRes.data.data);
    } catch (err) { 
      // Reload on error to sync state
      await loadInventory();
      alert(err?.response?.data?.message || "Failed to adjust stock"); 
    }
  }, [loadInventory]);

  const handleStockUpdate = useCallback(async (id, newStock) => {
    const numStock = Number(newStock);
    if (isNaN(numStock) || numStock < 0) return;
    
    try {
      // Optimistic update - update local state immediately
      setInventory(prev => prev.map(item => 
        item._id === id 
          ? { ...item, currentStock: numStock }
          : item
      ));
      
      // Make API call in background
      await api.patch(`/api/inventory/${id}/stock`, { newStock: numStock });
      
      // Silently reload in background without showing loading state
      const timestamp = new Date().getTime();
      const [invRes, alertsRes] = await Promise.all([
        api.get("/api/inventory?t=" + timestamp),
        api.get("/api/inventory/alerts?t=" + timestamp)
      ]);
      if (invRes.data?.success) { 
        setInventory(invRes.data.data); 
        setSummary(invRes.data.summary); 
      }
      if (alertsRes.data?.success) setAlerts(alertsRes.data.data);
    } catch (err) { 
      // Reload on error to sync state
      await loadInventory();
      alert(err?.response?.data?.message || "Failed to update"); 
    }
  }, [loadInventory]);

  const openLinkModal = useCallback(async (item) => {
    setLinkingItem(item);
    setLinkFoodId("");
    setLinkQty(1);
    if (menuFoods.length === 0) {
      try {
        const res = await api.get("/api/inventory/foods");
        if (res.data?.success) setMenuFoods(res.data.data);
      } catch { /* silent */ }
    }
  }, [menuFoods]);

  const handleLink = async () => {
    if (!linkFoodId || linkQty <= 0) return;
    try {
      const res = await api.post(`/api/inventory/${linkingItem._id}/link`, { foodId: linkFoodId, quantityPerOrder: Number(linkQty) });
      if (res.data?.success) {
        // Update linkingItem with fresh data so modal stays in sync
        setLinkingItem(res.data.data);
        setLinkFoodId("");
        setLinkQty(1);
        loadInventory();
      }
    } catch (err) { alert(err?.response?.data?.message || "Failed to link"); }
  };

  const handleUnlink = async (inventoryId, foodId) => {
    try {
      await api.post(`/api/inventory/${inventoryId}/unlink`, { foodId });
      loadInventory();
    } catch (err) { alert(err?.response?.data?.message || "Failed to unlink"); }
  };

  const openLog = async (item) => {
    setLogItem(item);
    setLogData([]);
    try {
      const res = await api.get(`/api/inventory/${item._id}/log`);
      if (res.data?.success) setLogData(res.data.data.log || []);
    } catch { /* silent */ }
  };


  const aiMap = useMemo(() => {
    const map = new Map();
    (aiData?.items || []).forEach(i => { if (i?._id) map.set(i._id, i); });
    return map;
  }, [aiData?.items]);

  const filtered = useMemo(() => {
    const filteredItems = inventory
      .filter(item => {
        if (catFilter !== "all" && item.category !== catFilter) return false;
        if (search && !item.itemName.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });

    return [...filteredItems].sort((a, b) => {
      const aiA = aiMap.get(a._id);
      const aiB = aiMap.get(b._id);
      switch (sortBy) {
        case "urgency": return (aiB?.urgency || 0) - (aiA?.urgency || 0);
        case "name": return a.itemName.localeCompare(b.itemName);
        case "stock_low": return a.currentStock - b.currentStock;
        case "stock_high": return b.currentStock - a.currentStock;
        case "value": return (b.currentStock * b.unitCost) - (a.currentStock * a.unitCost);
        case "expiry": {
          const ea = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
          const eb = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
          return ea - eb;
        }
        default: return 0;
      }
    });
  }, [inventory, catFilter, search, sortBy, aiMap]);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(prevSelected => {
      const allFilteredIds = new Set(filtered.map(i => i._id));
      // If all are selected, deselect all; otherwise select all filtered
      const shouldSelectAll = prevSelected.size !== allFilteredIds.size;
      console.log("[Inventory] selectAllFiltered called. shouldSelectAll:", shouldSelectAll, "filtered.length:", filtered.length);
      return shouldSelectAll ? allFilteredIds : new Set();
    });
  }, [filtered]);

  const handleBulkDelete = useCallback(async () => {
    console.log("[Inventory] handleBulkDelete called. selectedIds.size:", selectedIds.size, "selectedIds:", [...selectedIds]);
    
    if (selectedIds.size === 0) {
      console.log("[Inventory] No items selected, returning");
      toast.warning("Please select items to delete");
      return;
    }
    
    const confirmMsg = `Remove ${selectedIds.size} selected item${selectedIds.size !== 1 ? "s" : ""} from inventory?`;
    console.log("[Inventory] Showing confirmation:", confirmMsg);
    
    if (!window.confirm(confirmMsg)) {
      console.log("[Inventory] User canceled deletion");
      return;
    }
    
    try {
      console.log("[Inventory] Bulk deleting items:", [...selectedIds]);
      const res = await api.post("/api/inventory/bulk-delete", { ids: [...selectedIds] });
      console.log("[Inventory] Bulk delete response:", res.data);
      
      if (res.data?.success) {
        console.log("[Inventory] Deletion successful, reloading inventory");
        setSelectedIds(new Set());
        toast.success(res.data?.message || `${res.data?.count || 0} items removed successfully`);
        await loadInventory();
      } else {
        console.log("[Inventory] API returned unsuccessful response:", res.data);
        toast.error(res.data?.message || "Failed to delete items");
      }
    } catch (err) { 
      console.error("[Inventory] Bulk delete error:", err?.response?.data || err.message);
      toast.error(err?.response?.data?.message || "Failed to delete items"); 
    }
  }, [selectedIds, loadInventory]);

  const categoryCounts = useMemo(() => {
    const counts = { all: inventory.length, food_ingredient: 0, beverage: 0, packaging: 0, equipment: 0, other: 0 };
    inventory.forEach(item => {
      if (counts[item.category] !== undefined) counts[item.category]++;
    });
    return counts;
  }, [inventory]);

  const healthScore = aiData?.summary?.healthScore ?? 100;
  const catEmoji = useCallback((cat) => CATEGORIES.find(c => c.value === cat)?.emoji || "📝", []);

  const renderedCards = useMemo(() => {
    return filtered.map(item => {
      const ai = aiMap.get(item._id);
      return (
        <InventoryCard
          key={item._id}
          item={item}
          ai={ai}
          isSelected={selectedIds.has(item._id)}
          catEmoji={catEmoji}
          onToggleSelect={toggleSelect}
          onQuickAdjust={handleQuickAdjust}
          onStockUpdate={handleStockUpdate}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onLink={openLinkModal}
        />
      );
    });
  }, [filtered, aiMap, selectedIds, handleQuickAdjust, handleStockUpdate, handleEdit, handleDelete, openLinkModal]);

  if (loading) {
    return (
      <RestaurantLayout>
        <div style={{ ...s.wrap, ...getInventoryThemeVars(dark) }}>
          <div style={s.hdr}><h1 style={s.title}>📦 Inventory</h1></div>
          <div style={s.statsRow}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 76, borderRadius: 14 }} />)}
          </div>
          <div style={s.grid}>
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />)}
          </div>
        </div>
      </RestaurantLayout>
    );
  }

  return (
    <RestaurantLayout>
      <div style={getInventoryThemeVars(dark)}>
      <div style={{ ...s.wrap }}>
        {/* ── Header ── */}
        <div style={s.hdr}>
          <div style={s.hdrLeft}>
            <h1 style={s.title}>
              📦 Inventory
              {aiData && (
                <div style={s.ring(healthScore)} title={`Health: ${healthScore}%`}>
                  <div style={s.ringInner}>{healthScore}</div>
                </div>
              )}
            </h1>
            <p style={s.sub}>
              {summary.totalItems || 0} items tracked
              {aiData?.summary?.ordersLast30 ? ` · ${aiData.summary.ordersLast30} orders last 30d` : ""}
            </p>
            {importStatus && <p style={{ ...s.sub, fontSize: 12, color: importing ? "#1d4ed8" : "#16a34a", marginTop: 4 }}>{importStatus}</p>}
          </div>
          <div style={s.hdrBtns}>
            <button className="btn btn-outline" onClick={() => window.location.href = '/inventory/analytics'} style={{ fontSize: 13, padding: "9px 14px" }}>
              📊 View Analytics
            </button>
            <button className="btn btn-outline" onClick={loadAI} disabled={aiLoading} style={{ fontSize: 13, padding: "9px 14px" }}>
              {aiLoading ? "Analyzing..." : "🤖 Refresh AI"}
            </button>
            <button className="btn btn-outline" onClick={downloadInventoryTemplate} style={{ fontSize: 13, padding: "9px 14px" }}>
              ⬇️ Download Template
            </button>
            <input type="file" accept=".xlsx,.xls,.csv" ref={importRef} style={{ display: "none" }} onChange={handleImportInventory} />
            <button className="btn btn-outline" onClick={() => importRef.current?.click()} disabled={importing} style={{ fontSize: 13, padding: "9px 14px" }}>
              {importing ? "Importing..." : "📥 Import Stock"}
            </button>
            <button className="btn" onClick={() => { resetForm(); setShowModal(true); }} style={{ fontSize: 13, padding: "9px 16px" }}>
              + Add Item
            </button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div style={s.statsRow}>
          <div style={s.stat()}>
            <p style={s.statVal()}>{summary.totalItems || 0}</p>
            <p style={s.statLbl}>Total Items</p>
          </div>
          <div style={s.stat()}>
            <p style={s.statVal("#dc2626")}>{alerts.lowStock?.length || 0}</p>
            <p style={s.statLbl}>Low Stock</p>
          </div>
          <div style={s.stat()}>
            <p style={s.statVal("#f59e0b")}>{alerts.expiringSoon?.length || 0}</p>
            <p style={s.statLbl}>Expiring Soon</p>
          </div>
          <div style={s.stat()}>
            <p style={s.statVal("#dc2626")}>{alerts.expired?.length || 0}</p>
            <p style={s.statLbl}>Expired</p>
          </div>
          <div style={s.stat()}>
            <p style={s.statVal("#2563eb")}>AED {(summary.totalValue || 0).toFixed(0)}</p>
            <p style={s.statLbl}>Total Value</p>
          </div>
          {aiData?.summary?.totalReorderCost > 0 && (
            <div style={s.stat()}>
              <p style={s.statVal("#7c3aed")}>AED {aiData.summary.totalReorderCost.toFixed(0)}</p>
              <p style={s.statLbl}>Reorder Cost</p>
            </div>
          )}
        </div>

        {/* ── AI Tips ── */}
        {aiData?.tips?.length > 0 && (
          <div style={s.tipWrap}>
            {aiData.tips.map((tip, i) => {
              const ts = s.tip(tip.type);
              return (
                <div key={i} style={ts}>
                  <span>{ts.icon}</span>
                  <span>{tip.text}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Category Tabs ── */}
        <div style={s.pills}>
          {CATEGORIES.map(cat => (
            <button key={cat.value} style={s.pill(catFilter === cat.value)} onClick={() => setCatFilter(cat.value)}>
              <span>{cat.emoji}</span> {cat.label}
              {cat.value !== "all" && (
                <span style={{ marginLeft: 2, opacity: 0.5 }}>
                  ({categoryCounts[cat.value] || 0})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div style={s.toolbar}>
          <div style={s.searchWrap}>
            <span style={s.searchIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input style={s.search} placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={s.select} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "var(--inv-muted)", fontWeight: 600 }}>
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </span>
          {filtered.length > 0 && (
            <button onClick={selectAllFiltered}
              style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--inv-border)", background: selectedIds.size === filtered.length ? "#111" : "var(--inv-soft)", color: selectedIds.size === filtered.length ? "#fff" : "var(--inv-text)", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              {selectedIds.size === filtered.length ? "Deselect All" : "Select All"}
            </button>
          )}
          {selectedIds.size > 0 && (
            <>
              <button onClick={() => setShowBulkUpdateModal(true)}
                style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e40af", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                ✏️ Update {selectedIds.size} selected
              </button>
              <button onClick={handleBulkDelete}
                style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                🗑️ Delete {selectedIds.size} selected
              </button>
            </>
          )}
        </div>

        {/* ── Cards Grid ── */}
        {filtered.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>📦</div>
            <p style={s.emptyTitle}>{inventory.length === 0 ? "No inventory yet" : "No items match"}</p>
            <p style={s.emptyDesc}>
              {inventory.length === 0
                ? "Add your first inventory item to start tracking stock levels, costs, and get AI-powered insights."
                : "Try adjusting your search or category filter."}
            </p>
            {inventory.length === 0 && (
              <button className="btn" onClick={() => { resetForm(); setShowModal(true); }} style={{ marginTop: 16, fontSize: 13 }}>
                + Add First Item
              </button>
            )}
          </div>
        ) : (
          <div style={s.grid}>
            {renderedCards}
          </div>
        )}
      </div>

      {showModal && (
        <div style={s.overlay} onClick={() => resetForm()}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{editingItem ? "✏️ Edit Item" : "📦 Add Item"}</h2>
            <form onSubmit={handleSubmit}>
              <div style={s.formGrid}>
                <div style={{ ...s.field, gridColumn: "1 / -1" }}>
                  <label style={s.label}>Item Name *</label>
                  <input style={s.input} type="text" value={formData.itemName} onChange={e => setFormData({ ...formData, itemName: e.target.value })} required placeholder="e.g. Chicken Breast" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Category *</label>
                  <select style={s.input} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                    {CATEGORIES.filter(c => c.value !== "all").map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Unit *</label>
                  <select style={s.input} value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Current Stock *</label>
                  <input style={s.input} type="number" min="0" step="0.1" value={formData.currentStock} onChange={e => setFormData({ ...formData, currentStock: e.target.value })} required />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Unit Cost (AED)</label>
                  <input style={s.input} type="number" min="0" step="0.01" value={formData.unitCost} onChange={e => setFormData({ ...formData, unitCost: e.target.value })} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Minimum Stock</label>
                  <input style={s.input} type="number" min="0" step="0.1" value={formData.minimumStock} onChange={e => setFormData({ ...formData, minimumStock: e.target.value })} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Maximum Stock</label>
                  <input style={s.input} type="number" min="0" step="0.1" value={formData.maximumStock} onChange={e => setFormData({ ...formData, maximumStock: e.target.value })} />
                </div>
                <div style={{ ...s.field, gridColumn: "1 / -1" }}>
                  <label style={s.label}>Expiry Date</label>
                  <input style={s.input} type="date" value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Supplier Name</label>
                  <input style={s.input} type="text" placeholder="Name" value={formData.supplier.name} onChange={e => setFormData({ ...formData, supplier: { ...formData.supplier, name: e.target.value } })} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Supplier Contact</label>
                  <input style={s.input} type="text" placeholder="Phone" value={formData.supplier.contact} onChange={e => setFormData({ ...formData, supplier: { ...formData.supplier, contact: e.target.value } })} />
                </div>
                <div style={{ ...s.field, gridColumn: "1 / -1" }}>
                  <label style={s.label}>Notes</label>
                  <textarea style={{ ...s.input, minHeight: 60, resize: "vertical" }} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Optional notes..." />
                </div>
              </div>
              <div style={s.formBtns}>
                <button type="submit" className="btn" disabled={saving} style={{ flex: 1 }}>
                  {saving ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
                </button>
                <button type="button" className="btn btn-outline" onClick={resetForm} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Link Menu Items ── */}
      {linkingItem && (
        <div style={s.overlay} onClick={() => setLinkingItem(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>🔗 Link Menu Items to "{linkingItem.itemName}"</h2>
            <p style={{ fontSize: 12, color: "var(--inv-muted)", margin: "0 0 14px", fontWeight: 500 }}>
              When a customer orders a linked menu item, <strong>{linkingItem.itemName}</strong> stock will automatically decrease by the quantity you set.
            </p>

            {/* Already linked */}
            {linkingItem.linkedMenuItems?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--inv-text)", margin: "0 0 8px" }}>Currently Linked Menu Items</p>
                {linkingItem.linkedMenuItems.map((rawLink, li) => {
                  const link = resolveLinkedMenuItem(rawLink);
                  const foodId = link.resolvedFoodId;
                  return (
                    <div key={`${foodId || "missing"}-${li}`} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "10px 12px", background: link.isMissingFood ? "var(--inv-warn-bg)" : "var(--inv-link-bg)", borderRadius: 10, marginBottom: 6, border: `1px solid ${link.isMissingFood ? "var(--inv-warn-border)" : "var(--inv-link-border)"}` }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: link.isMissingFood ? "var(--inv-warn-text)" : "var(--inv-text)", overflowWrap: "anywhere" }}>
                          {link.resolvedFoodName}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: link.isMissingFood ? "var(--inv-warn-text)" : "var(--inv-muted)", marginTop: 3 }}>
                          Deducts {link.quantityPerOrder} {linkingItem.unit} each time this menu item is ordered.
                        </div>
                        {link.isMissingFood && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--inv-warn-text)", marginTop: 5 }}>
                            This menu item no longer exists. Remove this broken link.
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (!foodId) return;
                          handleUnlink(linkingItem._id, foodId);
                          setLinkingItem(prev => ({
                            ...prev,
                            linkedMenuItems: prev.linkedMenuItems.filter(l => resolveLinkedMenuItem(l).resolvedFoodId !== foodId)
                          }));
                        }}
                        disabled={!foodId}
                        style={{ background: "none", border: "none", color: "#dc2626", cursor: foodId ? "pointer" : "not-allowed", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", opacity: foodId ? 1 : 0.5 }}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new link */}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ ...s.field, flex: "2 1 180px" }}>
                <label style={s.label}>Menu Item</label>
                <select style={s.input} value={linkFoodId} onChange={e => setLinkFoodId(e.target.value)}>
                  <option value="">Select a menu item...</option>
                  {menuFoods
                    .filter(f => !linkingItem.linkedMenuItems?.some(l => resolveLinkedMenuItem(l).resolvedFoodId === f._id))
                    .map(f => <option key={f._id} value={f._id}>{f.name} ({f.category}) — AED {f.price}</option>)}
                </select>
              </div>
              <div style={{ ...s.field, flex: "0 0 100px" }}>
                <label style={s.label}>Qty per order ({linkingItem.unit})</label>
                <input style={s.input} type="number" min="0.01" step="0.01" value={linkQty} onChange={e => setLinkQty(e.target.value)} />
              </div>
              <button className="btn" onClick={handleLink} disabled={!linkFoodId || linkQty <= 0} style={{ fontSize: 12, padding: "9px 16px", height: "fit-content" }}>
                + Link
              </button>
            </div>

            {menuFoods.length === 0 && (
              <p style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, marginTop: 10 }}>No menu items found for this restaurant. Add food items first.</p>
            )}

            <div style={{ ...s.formBtns, marginTop: 18 }}>
              <button type="button" className="btn btn-outline" onClick={() => setLinkingItem(null)} style={{ flex: 1 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Deduction Log ── */}
      {logItem && (
        <div style={s.overlay} onClick={() => setLogItem(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>📋 Deduction Log — {logItem.itemName}</h2>
            <p style={{ fontSize: 12, color: "var(--inv-muted)", margin: "0 0 14px", fontWeight: 500 }}>
              Shows automatic stock deductions from customer orders (most recent first).
            </p>

            {logData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--muted)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>No deductions yet</p>
                <p style={{ fontSize: 12, margin: "4px 0 0" }}>Stock will be automatically deducted when linked menu items are ordered.</p>
              </div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "6px 8px", fontWeight: 800, color: "var(--inv-text)" }}>Date</th>
                      <th style={{ padding: "6px 8px", fontWeight: 800, color: "var(--inv-text)" }}>Menu Item</th>
                      <th style={{ padding: "6px 8px", fontWeight: 800, color: "var(--inv-text)", textAlign: "right" }}>Ordered</th>
                      <th style={{ padding: "6px 8px", fontWeight: 800, color: "var(--inv-text)", textAlign: "right" }}>Deducted</th>
                      <th style={{ padding: "6px 8px", fontWeight: 800, color: "var(--inv-text)", textAlign: "right" }}>Stock After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logData.map((entry, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--inv-border)" }}>
                        <td style={{ padding: "6px 8px", color: "var(--inv-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td style={{ padding: "6px 8px", fontWeight: 600 }}>{entry.foodName || "—"}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{entry.qtyOrdered}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "#dc2626" }}>-{entry.qtyDeducted} {logItem.unit}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>{entry.stockAfter} {logItem.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ ...s.formBtns, marginTop: 14 }}>
              <button type="button" className="btn btn-outline" onClick={() => setLogItem(null)} style={{ flex: 1 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Bulk Update ── */}
      {showBulkUpdateModal && (
        <div style={s.overlay} onClick={() => setShowBulkUpdateModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>✏️ Bulk Update {selectedIds.size} Items</h2>
            <p style={{ fontSize: 12, color: "var(--inv-muted)", margin: "0 0 14px", fontWeight: 500 }}>
              Apply the same change to all selected inventory items.
            </p>

            <div style={s.formGrid}>
              <div style={s.field}>
                <label style={s.label}>Field to Update</label>
                <select style={s.input} value={bulkUpdateField} onChange={e => setBulkUpdateField(e.target.value)}>
                  <option value="">Select field...</option>
                  <option value="category">Category</option>
                  <option value="unit">Unit</option>
                  <option value="currentStock">Current Stock</option>
                  <option value="minimumStock">Minimum Stock</option>
                  <option value="maximumStock">Maximum Stock</option>
                  <option value="unitCost">Unit Cost (AED)</option>
                  <option value="supplier">Supplier (JSON)</option>
                  <option value="notes">Notes</option>
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>New Value</label>
                {bulkUpdateField === 'category' ? (
                  <select style={s.input} value={bulkUpdateValue} onChange={e => setBulkUpdateValue(e.target.value)}>
                    <option value="">Select category...</option>
                    {CATEGORIES.filter(c => c.value !== "all").map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
                  </select>
                ) : bulkUpdateField === 'unit' ? (
                  <select style={s.input} value={bulkUpdateValue} onChange={e => setBulkUpdateValue(e.target.value)}>
                    <option value="">Select unit...</option>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                ) : bulkUpdateField === 'supplier' ? (
                  <textarea style={{ ...s.input, minHeight: 60 }} value={bulkUpdateValue} onChange={e => setBulkUpdateValue(e.target.value)} placeholder='{"name": "Supplier Name", "contact": "Phone", "email": "email@example.com"}' />
                ) : (
                  <input style={s.input} type={['currentStock', 'minimumStock', 'maximumStock', 'unitCost'].includes(bulkUpdateField) ? 'number' : 'text'} value={bulkUpdateValue} onChange={e => setBulkUpdateValue(e.target.value)} />
                )}
              </div>
            </div>

            <div style={s.formBtns}>
              <button type="button" className="btn" onClick={handleBulkUpdate} disabled={!bulkUpdateField || !bulkUpdateValue} style={{ flex: 1 }}>
                Update {selectedIds.size} Items
              </button>
              <button type="button" className="btn btn-outline" onClick={() => { setShowBulkUpdateModal(false); setBulkUpdateField(""); setBulkUpdateValue(""); }} style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Import Preview ── */}
      {showImportPreview && (
        <div style={s.overlay} onClick={() => setShowImportPreview(false)}>
          <div style={{ ...s.modal, maxWidth: 800, maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>📋 Import Preview - {previewData.length} Items</h2>
            <p style={{ fontSize: 12, color: "var(--inv-muted)", margin: "0 0 14px", fontWeight: 500 }}>
              Review the changes before confirming. Items will be updated or created as shown below.
            </p>

            <div style={{ maxHeight: 400, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 16 }}>
              {previewData.map((item, idx) => (
                <div key={idx} style={{ 
                  padding: "12px 14px", 
                  borderBottom: idx < previewData.length - 1 ? "1px solid var(--inv-border)" : "none",
                  background: item.type === "create" ? "#f0fdf4" : "#eff6ff"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ 
                      fontSize: 11, 
                      padding: "2px 6px", 
                      borderRadius: 4, 
                      background: item.type === "create" ? "#16a34a" : "#2563eb", 
                      color: "white", 
                      fontWeight: 700 
                    }}>
                      {item.type === "create" ? "CREATE" : "UPDATE"}
                    </span>
                    <strong style={{ fontSize: 14, color: "var(--inv-text)" }}>{item.itemName}</strong>
                  </div>

                  {item.type === "update" ? (
                    <div style={{ fontSize: 12, color: "var(--inv-text)" }}>
                      <div style={{ marginBottom: 4 }}>
                        <span style={{ color: "var(--inv-muted)", fontWeight: 600 }}>Current:</span> {item.existingItem.currentStock} {item.existingItem.unit} @ AED {item.existingItem.unitCost}
                      </div>
                      {Object.keys(item.changes).length > 0 && (
                        <div>
                          <span style={{ color: "var(--inv-muted)", fontWeight: 600 }}>Changes:</span>
                          <ul style={{ margin: "4px 0 0 16px", padding: 0, listStyle: "none" }}>
                            {item.changes.currentStock !== undefined && (
                              <li>Stock: {item.existingItem.currentStock} → {item.changes.currentStock}</li>
                            )}
                            {item.changes.unitCost !== undefined && (
                              <li>Cost: AED {item.existingItem.unitCost} → AED {item.changes.unitCost}</li>
                            )}
                            {item.changes.unit && (
                              <li>Unit: {item.existingItem.unit} → {item.changes.unit}</li>
                            )}
                            {item.changes.category && (
                              <li>Category: {item.existingItem.category} → {item.changes.category}</li>
                            )}
                            {item.changes.minimumStock !== undefined && (
                              <li>Min Stock: {item.existingItem.minimumStock} → {item.changes.minimumStock}</li>
                            )}
                            {item.changes.maximumStock !== undefined && (
                              <li>Max Stock: {item.existingItem.maximumStock} → {item.changes.maximumStock}</li>
                            )}
                            {item.changes.expiryDate && (
                              <li>Expiry: {item.existingItem.expiryDate || "none"} → {item.changes.expiryDate}</li>
                            )}
                            {item.changes.supplier && (
                              <li>Supplier: {item.changes.supplier.name || "none"} ({item.changes.supplier.contact || "no contact"})</li>
                            )}
                            {item.changes.notes && (
                              <li>Notes: {item.changes.notes}</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--inv-text)" }}>
                      <div style={{ marginBottom: 4 }}>
                        <span style={{ color: "var(--inv-muted)", fontWeight: 600 }}>New Item:</span>
                      </div>
                      <ul style={{ margin: "4px 0 0 16px", padding: 0, listStyle: "none" }}>
                        <li>Category: {item.newItem.category}</li>
                        <li>Stock: {item.newItem.currentStock} {item.newItem.unit}</li>
                        <li>Cost: AED {item.newItem.unitCost}</li>
                        <li>Min/Max: {item.newItem.minimumStock}/{item.newItem.maximumStock}</li>
                        {item.newItem.expiryDate && <li>Expiry: {item.newItem.expiryDate}</li>}
                        {item.newItem.supplier.name && (
                          <li>Supplier: {item.newItem.supplier.name} ({item.newItem.supplier.contact})</li>
                        )}
                        {item.newItem.notes && <li>Notes: {item.newItem.notes}</li>}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {importStatus && (
              <div style={{ 
                padding: "8px 12px", 
                borderRadius: 8, 
                background: "var(--inv-soft-2)", 
                fontSize: 12, 
                fontWeight: 600, 
                color: "var(--inv-text)",
                marginBottom: 16 
              }}>
                {importStatus}
              </div>
            )}

            <div style={s.formBtns}>
              <button 
                type="button" 
                className="btn" 
                onClick={confirmImport} 
                disabled={importing}
                style={{ flex: 1 }}
              >
                {importing ? "Processing..." : `Confirm Import (${previewData.length} items)`}
              </button>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setShowImportPreview(false)} 
                disabled={importing}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </RestaurantLayout>
  );
}