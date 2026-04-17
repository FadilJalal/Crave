import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";

// ─── Load SheetJS from CDN (no npm install required) ─────────────────────────
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

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_COLS = [
  { key: "name",                label: "name",                required: true,  hint: "e.g. Margherita Pizza" },
  { key: "category",            label: "category",            required: true,  hint: "e.g. pizza, burger, pasta" },
  { key: "price",               label: "price",               required: true,  hint: "e.g. 12.99" },
  { key: "description",         label: "description",         required: true,  hint: "Detailed description" },
  { key: "image_filename",      label: "image_filename",      required: false, hint: "e.g. pizza.jpg" },
  { key: "customizations_json", label: "customizations_json", required: false, hint: "JSON array (optional)" },
  { key: "ingredients",         label: "ingredients",         required: false, hint: "e.g. Chicken:2, Oil:0.5" },
];

const CONCURRENCY = 3;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const parseSpreadsheet = async (file) => {
  const XLSX = await loadXLSX();
  const buf  = await file.arrayBuffer();
  const wb   = XLSX.read(buf, { type: "array" });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
};

const normaliseRow = (r) => ({
  id:                  uid(),
  name:                String(r.name        || r.Name        || r["Item Name"] || "").trim(),
  category:            String(r.category    || r.Category    || "").trim(),
  price:               String(r.price       || r.Price       || "").trim(),
  description:         String(r.description || r.Description || "").trim(),
  image_filename:      String(r.image_filename || r["Image Filename"] || r.image || "").trim(),
  customizations_json: String(r.customizations_json || r.customizations || "").trim(),
  ingredients:         String(r.ingredients || "").trim(),

  inventory_unit:       String(r.inventory_unit || r.unit || "").trim(),
  inventory_currentStock: String(r.inventory_currentStock || r.currentStock || "").trim(),
  inventory_minimumStock: String(r.inventory_minimumStock || r.minimumStock || "").trim(),
  inventory_maximumStock: String(r.inventory_maximumStock || r.maximumStock || "").trim(),
  inventory_unitCost:   String(r.inventory_unitCost || r.unitCost || "").trim(),
  inventory_supplier:   String(r.inventory_supplier || r.supplier || "").trim(),

  imageFile:      null,
  imagePreview:   null,
  customizations: [],
  warnings:    [],
  errors:      [],
  valid:       false,
  status:      "idle",
  uploadError: "",
});

const buildImageMap = (imageFiles) => {
  const map = {};
  for (const f of imageFiles) {
    const lower = f.name.toLowerCase();
    map[lower] = f;
    map[lower.replace(/\.[^.]+$/, "")] = f;
  }
  return map;
};

const enrichRows = (rows, imageMap) =>
  rows.map((row) => {
    const key  = row.image_filename.toLowerCase();
    const file = imageMap[key] || imageMap[key.replace(/\.[^.]+$/, "")] || null;
    const warnings = [...row.warnings];
    let customizations = row.customizations;
    if (!file && row.image_filename) warnings.push(`No image matched "${row.image_filename}"`);
    if (row.customizations_json) {
      try   { customizations = JSON.parse(row.customizations_json); }
      catch { warnings.push("Invalid customizations JSON — skipped"); }
    }
    return { ...row, imageFile: file, imagePreview: file ? URL.createObjectURL(file) : null, customizations, warnings };
  });

const validateRow = (row) => {
  const errors = [];
  if (!row.name)                              errors.push("Missing name");
  if (!row.price || isNaN(Number(row.price))) errors.push("Invalid price");
  if (!row.description)                       errors.push("Missing description");
  if (!row.imageFile)                         errors.push("No image matched");

  if (row.inventory_unit && !row.inventory_currentStock) errors.push("Missing current inventory stock");
  if (row.inventory_currentStock && isNaN(Number(row.inventory_currentStock))) errors.push("Invalid inventory currentStock");
  if (row.inventory_minimumStock && isNaN(Number(row.inventory_minimumStock))) errors.push("Invalid inventory minimumStock");
  if (row.inventory_maximumStock && isNaN(Number(row.inventory_maximumStock))) errors.push("Invalid inventory maximumStock");
  if (row.inventory_unitCost && isNaN(Number(row.inventory_unitCost))) errors.push("Invalid inventory unitCost");

  return errors;
};

const applyValidation = (rows) =>
  rows.map((r) => { const errors = validateRow(r); return { ...r, errors, valid: errors.length === 0 }; });

const uploadRow = async (row) => {
  const form = new FormData();
  form.append("name",           row.name);
  form.append("category",       row.category);
  form.append("price",          row.price);
  form.append("description",    row.description);
  form.append("image",          row.imageFile);
  form.append("customizations", JSON.stringify(row.customizations));
  form.append("ingredients",    row.ingredients || "");

  const res = await api.post("/api/restaurantadmin/food/add", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  if (!res.data?.success) throw new Error(res.data?.message || "Failed");

  const inventoryPayload = {
    itemName: row.name,
    category: row.category || "food_ingredient",
    unit: row.inventory_unit || "pieces",
    currentStock: row.inventory_currentStock ? Number(row.inventory_currentStock) : 0,
    minimumStock: row.inventory_minimumStock ? Number(row.inventory_minimumStock) : 10,
    maximumStock: row.inventory_maximumStock ? Number(row.inventory_maximumStock) : 100,
    unitCost: row.inventory_unitCost ? Number(row.inventory_unitCost) : 0,
    supplier: row.inventory_supplier ? (row.inventory_supplier.startsWith("{") ? JSON.parse(row.inventory_supplier) : { name: row.inventory_supplier }) : {},
    expiryDate: row.expiryDate ? row.expiryDate : null,
    notes: row.notes || "",
  };

  // Always add inventory items for ingredients if specified
  if (row.inventory_unit || row.inventory_currentStock || row.inventory_minimumStock || row.inventory_maximumStock || row.inventory_unitCost || row.inventory_supplier) {
    try {
      await api.post("/api/inventory/add", inventoryPayload);
    } catch (invErr) {
      console.warn("Inventory add for row failed", invErr?.response?.data?.message || invErr.message);
    }
  }

  // Note: Ingredient linking is now handled in submitAll() via linkIngredientsForFood()
  // to avoid duplicate processing and linking

  return res.data;
};

const parseIngredientString = (str) => {
  if (!str || !str.trim()) return [];
  
  // Remove any surrounding container characters like ( ) [ ] { }
  const cleanStr = str.trim()
    .replace(/^[\(\{\[]+/, "")
    .replace(/[\)\}\]]+$/, "");

  return cleanStr.split(",").map(s => {
    const parts = s.trim().split(":");
    // Handle Case where name might have a colon itself (unlikely but safe)
    if (parts.length < 2) return null;
    
    const name = parts[0].trim().replace(/^[\(\{\[]+/, "").replace(/[\)\}\]]+$/, "");
    const qty = parseFloat(parts[1]) || 1;
    
    return { name, qty };
  }).filter(i => i && i.name);
};

const guessCategory = (name) => {
  const n = name.toLowerCase();
  const packaging = ["packaging", "box", "bag", "container", "cup", "lid", "wrap", "foil", "napkin", "straw", "spoon", "fork", "knife", "tray", "plate"];
  const beverage  = ["juice", "soda", "water", "milk", "syrup", "coffee", "tea", "drink"];
  const equipment = ["machine", "blender", "oven", "fryer", "grill", "mixer"];
  if (packaging.some(k => n.includes(k))) return "packaging";
  if (beverage.some(k => n.includes(k)))  return "beverage";
  if (equipment.some(k => n.includes(k))) return "equipment";
  return "food_ingredient";
};

const guessUnit = (name) => {
  const n = name.toLowerCase();
  if (["oil", "sauce", "syrup", "milk", "water", "juice", "broth"].some(k => n.includes(k))) return "l";
  if (["flour", "sugar", "salt", "cheese", "butter", "rice"].some(k => n.includes(k))) return "kg";
  return "pieces";
};

const linkIngredientsForFood = async (foodId, parsedIngredients, inventoryItems, createdCache, pendingCreations) => {
  for (const ing of parsedIngredients) {
    const itemNameRaw = ing.name.toLowerCase().trim();
    const normalizedSearch = itemNameRaw
      .replace(/potatoe|potos|potat/gi, "potato")
      .replace(/s\b|es\b/gi, "")
      .trim();

    let match = inventoryItems.find(inv => {
      const invName = inv.itemName.toLowerCase().trim();
      const normInv = invName.replace(/potatoe|potos|potat/gi, "potato").replace(/s\b|es\b/gi, "").trim();
      return invName === itemNameRaw || normInv === normalizedSearch || invName.includes(normalizedSearch);
    }) || createdCache.find(inv => {
      const invName = inv.itemName.toLowerCase().trim();
      const normInv = invName.replace(/potatoe|potos|potat/gi, "potato").replace(/s\b|es\b/gi, "").trim();
      return invName === itemNameRaw || normInv === normalizedSearch || invName.includes(normalizedSearch);
    });
    
    if (!match) {
      if (pendingCreations.has(normalizedSearch)) {
        match = await pendingCreations.get(normalizedSearch);
      } else {
        const createPromise = api.post("/api/inventory/add", {
          itemName: ing.name.trim(),
          category: guessCategory(ing.name),
          unit: guessUnit(ing.name) || "pieces",
          currentStock: 0, 
          minimumStock: 5, 
          maximumStock: 500, 
          unitCost: 0,
          notes: `Auto-created during menu import for "${ing.name}"`
        }).then(r => r.data?.success ? r.data.data : null).catch(() => null);
        
        pendingCreations.set(lowerName, createPromise);
        match = await createPromise;
        if (match) createdCache.push(match);
      }
    }

    if (match && match._id) {
      try {
        await api.post(`/api/inventory/${match._id}/link`, { 
          foodId, 
          quantityPerOrder: Number(ing.qty) || 1 
        });
        console.log(`Successfully linked ${match.itemName} to food ${foodId}`);
      } catch (err) {
        console.error("Link failed for:", match.itemName, err);
      }
    }
  }
};

const pLimit = (tasks, limit) => {
  const results = []; let i = 0;
  const run = async () => {
    while (i < tasks.length) {
      const idx = i++;
      try   { results[idx] = { ok: true,  value: await tasks[idx]() }; }
      catch { results[idx] = { ok: false, error: tasks[idx] }; }
    }
  };
  return Promise.all(Array.from({ length: limit }, run)).then(() => results);
};

const downloadTemplate = async () => {
  const XLSX = await loadXLSX();
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_COLS.map((c) => c.key),
    ["Margherita Pizza", "Pizza",   "12.99", "Classic tomato and mozzarella",   "margherita.jpg", "", "Cheese:0.2, Flour:0.3"],
    ["Spicy Ramen",      "Noodles", "14.50", "Rich broth with noodles and egg", "ramen.jpg",
      JSON.stringify([{ title: "Spice Level", required: true, multiSelect: false,
        options: [{ label: "Mild", extraPrice: 0 }, { label: "Hot", extraPrice: 0 }] }]),
      "Noodles:1, Broth:0.5, Egg:2"],
  ]);
  ws["!cols"] = [20, 14, 8, 36, 22, 60, 40].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Menu Items");
  XLSX.writeFile(wb, "crave_menu_template.xlsx");
};

// ─── Rows reducer ─────────────────────────────────────────────────────────────

const rowsReducer = (state, action) => {
  switch (action.type) {
    case "SET":                return applyValidation(action.rows);
    case "UPDATE_FIELD":       return applyValidation(state.map((r) => r.id === action.id ? { ...r, [action.key]: action.value } : r));
    case "SET_CUSTOMIZATIONS": return applyValidation(state.map((r) => r.id === action.id ? { ...r, customizations: action.customizations } : r));
    case "ATTACH_IMAGE": {
      const preview = URL.createObjectURL(action.file);
      return applyValidation(state.map((r) => r.id === action.id ? { ...r, imageFile: action.file, imagePreview: preview, image_filename: action.file.name } : r));
    }
    case "REMOVE":      return applyValidation(state.filter((r) => r.id !== action.id));
    case "SET_STATUS":  return state.map((r) => r.id === action.id ? { ...r, status: action.status, uploadError: action.error ?? "" } : r);
    default:            return state;
  }
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const getStatusStyle = (dark) => ({
  success:   { dot: "#22c55e", bg: dark ? "#052e16" : "#f0fdf4", border: dark ? "#166534" : "#bbf7d0" },
  error:     { dot: "#ef4444", bg: dark ? "#3b0d0c" : "#fef2f2", border: dark ? "#b91c1c" : "#fecaca" },
  uploading: { dot: "#3b82f6", bg: dark ? "#1e293b" : "#eff6ff", border: dark ? "#2563eb" : "#bfdbfe" },
  invalid:   { dot: "#f59e0b", bg: dark ? "#78350f" : "#fffbeb", border: dark ? "#f59e0b" : "#fde68a" },
  idle:      { dot: "#d1d5db", bg: dark ? "#1e293b" : "#fff",    border: dark ? "#334155" : "#e5e7eb" },
});

const rowStyle = (row, dark) => {
  const STATUS_STYLE = getStatusStyle(dark);
  return row.status !== "idle" ? STATUS_STYLE[row.status] : row.valid ? STATUS_STYLE.idle : STATUS_STYLE.invalid;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Pill = ({ children, color, bg, border, dark }) => (
  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999,
    color: color || (dark ? "#f8fafc" : "#1a1d23"), background: bg || (dark ? "#1e293b" : "#fff"), border: `1px solid ${border || (dark ? "#334155" : "#e5e7eb")}`, whiteSpace: "nowrap" }}>
    {children}
  </span>
);

const EditCell = ({ value, onChange, type = "text", width = "100%" }) => (
  <td style={{ padding: "8px 6px" }} onClick={(e) => e.stopPropagation()}>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      style={{ width, border: "1.5px solid #ff4e2a", borderRadius: 8,
        padding: "6px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
  </td>
);

const DropZone = ({ label, sub, icon, onDrop, onBrowse, browseLabel }) => {
  const { dark } = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <div onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onClick={onBrowse}
      style={{ border: `2px dashed ${hover ? "#ff4e2a" : "#d1d5db"}`, borderRadius: 16,
        padding: "28px 24px", textAlign: "center", cursor: "pointer",
        background: hover ? (dark ? "rgba(255,78,42,0.12)" : "#fff5f3") : (dark ? "#0f172a" : "#fafafa"),
        transition: "all 0.2s" }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{label}</p>
      <p style={{ color: dark ? "rgba(249,250,251,0.72)" : "#9ca3af", fontSize: 13, marginBottom: 14 }}>{sub}</p>
      <button type="button" onClick={(e) => { e.stopPropagation(); onBrowse(); }}
        style={{ padding: "9px 22px", borderRadius: 50, background: dark ? "#111827" : "#111", color: "#fff",
          border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
        {browseLabel}
      </button>
    </div>
  );
};

const StepBar = ({ current }) => {
  const { dark } = useTheme();
  const STEPS = ["Upload Files", "Review & Fix", "Done"];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13,
              background: i < current ? (dark ? "#1f2937" : "#111") : i === current ? "linear-gradient(135deg,#ff4e2a,#ff6a3d)" : (dark ? "#1e293b" : "#f3f4f6"),
              color: i <= current ? "#fff" : (dark ? "rgba(249,250,251,0.6)" : "#9ca3af"),
              boxShadow: i === current ? "0 4px 14px rgba(255,78,42,.35)" : "none" }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700,
              color: i === current ? "var(--text)" : i < current ? (dark ? "rgba(249,250,251,0.85)" : "#374151") : (dark ? "rgba(249,250,251,0.55)" : "#9ca3af") }}>{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < current ? (dark ? "rgba(249,250,251,0.8)" : "#111") : (dark ? "rgba(255,255,255,0.2)" : "#e5e7eb"),
              margin: "0 12px", borderRadius: 999 }} />
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Customization Builder Modal ──────────────────────────────────────────────

const emptyGroup  = () => ({ id: uid(), title: "", required: false, multiSelect: false, options: [] });
const emptyOption= () => ({ id: uid(), label: "", extraPrice: 0 });

function CustomizationModal({ rowName, initial, onSave, onClose }) {
  const { dark } = useTheme();
  const [groups, setGroups] = useState(() =>
    initial.length > 0
      ? initial.map(g => ({ ...g, id: g.id || uid(), options: (g.options || []).map(o => ({ ...o, id: o.id || uid() })) }))
      : []
  );

  const addGroup    = () => setGroups(prev => [...prev, emptyGroup()]);
  const removeGroup = (gid) => setGroups(prev => prev.filter(g => g.id !== gid));
  const updateGroup = (gid, key, val) => setGroups(prev => prev.map(g => g.id === gid ? { ...g, [key]: val } : g));

  const addOption    = (gid) => setGroups(prev => prev.map(g => g.id === gid ? { ...g, options: [...g.options, emptyOption()] } : g));
  const removeOption = (gid, oid) => setGroups(prev => prev.map(g => g.id === gid ? { ...g, options: g.options.filter(o => o.id !== oid) } : g));
  const updateOption = (gid, oid, key, val) =>
    setGroups(prev => prev.map(g => g.id === gid
      ? { ...g, options: g.options.map(o => o.id === oid ? { ...o, [key]: val } : o) } : g));

  const handleSave = () => {
    // Strip internal ids before saving to keep backend payload clean
    const clean = groups.map(({ id: _gid, ...g }) => ({
      ...g,
      options: g.options.map(({ id: _oid, ...o }) => o),
    }));
    onSave(clean);
    onClose();
  };

  const inp = {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    background: dark ? "#0f172a" : "#fff",
    color: "var(--text)",
  };
  const lbl = { fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4, display: "block" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: dark ? "#111827" : "#fff", borderRadius: 24, width: "100%", maxWidth: 620,
        maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "#f3f4f6"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>⚙️ Customizations</h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>{rowName}</p>
          </div>
          <button onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-secondary)", lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {groups.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-secondary)" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🍽️</div>
              <p style={{ fontSize: 14, margin: 0 }}>No customization groups yet.</p>
              <p style={{ fontSize: 13, margin: "4px 0 0" }}>Add a group like "Size" or "Toppings" below.</p>
            </div>
          )}

          {groups.map((group) => (
            <div key={group.id} style={{ border: "1px solid #e5e7eb", borderRadius: 16,
              padding: "16px 18px", marginBottom: 14, background: dark ? "#0f172a" : "#fafafa" }}>

              {/* Group header */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Group Title *</label>
                  <input value={group.title} placeholder='e.g. "Size" or "Toppings"'
                    onChange={e => updateGroup(group.id, "title", e.target.value)}
                    style={{ ...inp, width: "100%" }} />
                </div>

                {/* Single / Multi toggle */}
                <div>
                  <label style={lbl}>Type</label>
                  <div style={{ display: "flex", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                    {[["Single", false], ["Multi", true]].map(([lbl2, val]) => (
                      <button key={lbl2} type="button"
                        onClick={() => updateGroup(group.id, "multiSelect", val)}
                        style={{ padding: "7px 14px", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
                          background: group.multiSelect === val ? (dark ? "#1f2937" : "#111") : (dark ? "#0b1220" : "#fff"),
                          color: group.multiSelect === val ? "#fff" : "var(--text-secondary)" }}>
                        {lbl2}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Required toggle */}
                <div>
                  <label style={lbl}>Required</label>
                  <button type="button" onClick={() => updateGroup(group.id, "required", !group.required)}
                    style={{ padding: "7px 14px", fontSize: 12, fontWeight: 700, borderRadius: 8,
                      border: "1px solid #e5e7eb", cursor: "pointer",
                      background: group.required ? "#ff4e2a" : (dark ? "#0b1220" : "#fff"),
                      color: group.required ? "#fff" : "var(--text-secondary)" }}>
                    {group.required ? "Yes" : "No"}
                  </button>
                </div>

                {/* Remove group */}
                <button type="button" onClick={() => removeGroup(group.id)}
                  style={{ padding: "7px 10px", border: "1px solid #fecaca", borderRadius: 8,
                    background: "#fef2f2", color: "#ef4444", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                  ✕
                </button>
              </div>

              {/* Options list */}
              <div>
                <label style={{ ...lbl, marginBottom: 8 }}>
                  Options — {group.multiSelect ? "customer picks one or more" : "customer picks one"}
                </label>

                {group.options.length === 0 && (
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 8px" }}>No options yet — add at least one.</p>
                )}

                {group.options.map((opt, oi) => (
                  <div key={opt.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    {/* Visual checkbox / radio preview */}
                    <div style={{ width: 18, height: 18, borderRadius: group.multiSelect ? 4 : "50%",
                      border: "2px solid #d1d5db", flexShrink: 0, background: dark ? "#0f172a" : "#fff" }} />

                    <input value={opt.label} placeholder={`Option ${oi + 1} label`}
                      onChange={e => updateOption(group.id, opt.id, "label", e.target.value)}
                      style={{ ...inp, flex: 1 }} />

                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>+ AED</span>
                      <input type="number" min="0" step="0.5" value={opt.extraPrice}
                        onChange={e => updateOption(group.id, opt.id, "extraPrice", parseFloat(e.target.value) || 0)}
                        style={{ ...inp, width: 70 }} />
                    </div>

                    <button type="button" onClick={() => removeOption(group.id, opt.id)}
                      style={{ background: "none", border: "none", color: "#ef4444",
                        cursor: "pointer", fontSize: 16, padding: "2px 4px" }}>✕</button>
                  </div>
                ))}

                <button type="button" onClick={() => addOption(group.id)}
                  style={{ fontSize: 12, fontWeight: 700, color: "#ff4e2a", background: "none",
                    border: "1px dashed #fca89a", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>
                  + Add Option
                </button>
              </div>
            </div>
          ))}

          <button type="button" onClick={addGroup}
            style={{ width: "100%", padding: "12px", border: "2px dashed #d1d5db", borderRadius: 14,
              background: dark ? "#0f172a" : "#fafafa", fontWeight: 800, fontSize: 14, cursor: "pointer", color: "var(--text)" }}>
            + Add Customization Group
          </button>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "#f3f4f6"}`,
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {groups.length} group{groups.length !== 1 ? "s" : ""} · {groups.reduce((a, g) => a + g.options.length, 0)} total options
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose}
              style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e5e7eb",
                background: dark ? "#0f172a" : "#fff", color: "var(--text)", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              Cancel
            </button>
            <button onClick={handleSave}
              style={{ padding: "10px 24px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg,#ff4e2a,#ff6a3d)", color: "#fff",
                fontWeight: 900, cursor: "pointer", fontSize: 14,
                boxShadow: "0 4px 14px rgba(255,78,42,.3)" }}>
              Save Customizations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BulkUpload() {
  const { dark } = useTheme();
  const [step, setStep]         = useState(0);
  const [rows, dispatch]        = useReducer(rowsReducer, []);
  const [editId, setEditId]     = useState(null);
  const [submitting, setSubmit] = useState(false);
  const [progress, setProgress] = useState(0);
  const [custModal, setCustModal] = useState(null); // { rowId, rowName, customizations }
  const [inventoryItems, setInventoryItems] = useState([]);
  const [createdInvItems, setCreatedInvItems] = useState([]);

  const sheetRef = useRef();
  const imgRef   = useRef();

  const [parsedRows, setParsedRows] = useState([]);
  const [imageMap,   setImageMap]   = useState({});

  useEffect(() => {
    const loadInv = async () => {
      try {
        const res = await api.get("/api/inventory");
        if (res.data?.success) setInventoryItems(res.data.data);
      } catch { }
    };
    loadInv();
  }, []);

  // Reload inventory items when entering review step to show updated matches
  useEffect(() => {
    if (step === 1) {
      const reloadInv = async () => {
        try {
          const res = await api.get("/api/inventory");
          if (res.data?.success) setInventoryItems(res.data.data);
        } catch { }
      };
      reloadInv();
    }
  }, [step]);

  const handleSheetFiles = useCallback(async (files) => {
    const sheetFile = Array.from(files).find(f => /\.(xlsx|xls|csv)$/i.test(f.name));
    if (!sheetFile) return alert("Please upload a .xlsx, .xls, or .csv file.");
    try {
      const raw = await parseSpreadsheet(sheetFile);
      setParsedRows(raw.map(normaliseRow));
    } catch (err) { alert("Could not parse spreadsheet: " + err.message); }
  }, []);

  const handleImageFiles = useCallback((files) => {
    const newMap = buildImageMap(Array.from(files).filter(f => f.type.startsWith("image/")));
    setImageMap(prev => ({ ...prev, ...newMap }));
  }, []);

  const proceed = useCallback(() => {
    if (!parsedRows.length) return alert("Please upload a spreadsheet first.");
    dispatch({ type: "SET", rows: enrichRows(parsedRows, imageMap) });
    setStep(1);
  }, [parsedRows, imageMap]);

  const updateField = (id, key, value) => dispatch({ type: "UPDATE_FIELD", id, key, value });
  const attachImage = (id, file)       => dispatch({ type: "ATTACH_IMAGE", id, file });
  const removeRow   = (id)             => dispatch({ type: "REMOVE", id });

  const openCustModal = (row) => setCustModal({ rowId: row.id, rowName: row.name || "Untitled", customizations: row.customizations });
  const saveCust = (rowId, customizations) => dispatch({ type: "SET_CUSTOMIZATIONS", id: rowId, customizations });

  const submitAll = async () => {
    const pending = rows.filter(r => r.valid && r.status !== "success");
    if (!pending.length) return;
    setSubmit(true); setProgress(0);
    let done = 0;
    
    // Load fresh inventory items before uploading
    let freshInventoryItems = inventoryItems;
    try {
      const res = await api.get("/api/inventory");
      if (res.data?.success) {
        freshInventoryItems = res.data.data;
        setInventoryItems(res.data.data);
      }
    } catch (err) {
      console.error("[BulkUpload] Failed to load inventory items:", err);
    }
    
    const createdCache = []; // shared cache so common ingredients aren't duplicated
    const pendingCreations = new Map(); // prevents concurrent duplicate creates
    
    // Use fresh inventory items directly, not stale state
    const currentInventoryItems = [...freshInventoryItems];
    
    const tasks = pending.map(row => async () => {
      dispatch({ type: "SET_STATUS", id: row.id, status: "uploading" });
      try {
        const data = await uploadRow(row);
        const foodId = data.data?._id;
        // Link inventory ingredients if specified
        if (foodId && row.ingredients) {
          const parsed = parseIngredientString(row.ingredients);
          await linkIngredientsForFood(foodId, parsed, currentInventoryItems, createdCache, pendingCreations);
        }
        dispatch({ type: "SET_STATUS", id: row.id, status: "success" });
      } catch (err) {
        dispatch({ type: "SET_STATUS", id: row.id, status: "error", error: err.message || "Network error" });
      }
      done++;
      setProgress(Math.round((done / pending.length) * 100));
    });
    await pLimit(tasks, CONCURRENCY);
    
    // Deduplicate createdCache by itemName to avoid showing the same ingredient multiple times
    const uniqueCreatedItems = Array.from(
      new Map(createdCache.map(item => [item.itemName?.toLowerCase(), item])).values()
    );
    
    setCreatedInvItems(uniqueCreatedItems);
    setSubmit(false); setStep(2);
  };

  const validCount   = rows.filter(r => r.valid).length;
  const invalidCount = rows.filter(r => !r.valid).length;
  const successCount = rows.filter(r => r.status === "success").length;
  const errorCount   = rows.filter(r => r.status === "error").length;

  return (
    <RestaurantLayout>
      {custModal && (
        <CustomizationModal
          rowName={custModal.rowName}
          initial={custModal.customizations}
          onSave={(c) => saveCust(custModal.rowId, c)}
          onClose={() => setCustModal(null)}
        />
      )}

      <div style={{ marginBottom: 6, display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 900, letterSpacing: "-0.5px" }}>
            📦 Bulk Menu Upload
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
            Upload your whole menu from a spreadsheet + images in minutes
          </p>
        </div>
        <button onClick={downloadTemplate}
          style={{ padding: "9px 20px", borderRadius: 50, border: "1.5px solid #e5e7eb",
            background: dark ? "#0f172a" : "#fff", color: dark ? "var(--text)" : "#111827", fontWeight: 700, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 7 }}>
          ⬇️ Download Template
        </button>
      </div>

      <div style={{ marginTop: 28 }}>
        <StepBar current={step} />

        {/* ── STEP 0: Upload files ── */}
        {step === 0 && (
          <div style={{ background: "var(--card)", borderRadius: 20, border: "1px solid var(--border)", padding: 28 }}>
            <div style={{ background: dark ? "rgba(22,163,74,0.14)" : "#f0fdf4", border: `1px solid ${dark ? "rgba(134,239,172,0.35)" : "#bbf7d0"}`, borderRadius: 12,
              padding: "12px 16px", marginBottom: 24, fontSize: 13 }}>
              💡 <strong>Tip:</strong> Drop your spreadsheet and images below then click <strong>Continue</strong> — images are matched by filename automatically. You can also add or edit customizations per item in the next step.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                  1. Spreadsheet {parsedRows.length > 0 && <span style={{ color: "#16a34a" }}>✓ {parsedRows.length} rows loaded</span>}
                </p>
                <input ref={sheetRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
                  onChange={e => handleSheetFiles(e.target.files)} />
                <DropZone label="Drop spreadsheet" sub=".xlsx, .xls, .csv" icon="📊"
                  onDrop={(e) => { e.preventDefault(); handleSheetFiles(e.dataTransfer.files); }}
                  onBrowse={() => sheetRef.current?.click()} browseLabel="Browse File" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                  2. Food Images (optional) {Object.keys(imageMap).length > 0 &&
                    <span style={{ color: "#16a34a" }}>✓ {new Set(Object.values(imageMap)).size} images loaded</span>}
                </p>
                <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: "none" }}
                  onChange={e => handleImageFiles(e.target.files)} />
                <DropZone label="Drop food images" sub="Select multiple at once" icon="🖼️"
                  onDrop={(e) => { e.preventDefault(); handleImageFiles(e.dataTransfer.files); }}
                  onBrowse={() => imgRef.current?.click()} browseLabel="Browse Images" />
              </div>
            </div>

            <div style={{ background: dark ? "#0f172a" : "#f8f9fa", borderRadius: 14, padding: "18px 22px", marginBottom: 24 }}>
              <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>📋 Expected columns:</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
                {TEMPLATE_COLS.map(c => (
                  <div key={c.key} style={{ background: dark ? "#111827" : "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px" }}>
                    <code style={{ fontSize: 12, fontWeight: 800, color: c.required ? "#dc2626" : "var(--text)" }}>{c.label}</code>
                    <p style={{ fontSize: 11.5, color: "var(--text-secondary)", margin: "3px 0 0" }}>{c.hint}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={proceed} disabled={parsedRows.length === 0}
                style={{ padding: "12px 32px", borderRadius: 12, border: "none", fontWeight: 900, fontSize: 15,
                  cursor: parsedRows.length > 0 ? "pointer" : "not-allowed",
                  background: parsedRows.length > 0 ? "linear-gradient(135deg,#ff4e2a,#ff6a3d)" : "#e5e7eb",
                  color: parsedRows.length > 0 ? "#fff" : "#9ca3af",
                  boxShadow: parsedRows.length > 0 ? "0 4px 14px rgba(255,78,42,.35)" : "none" }}>
                Continue → Review {parsedRows.length > 0 ? `(${parsedRows.length} items)` : ""}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 1: Review table ── */}
        {step === 1 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "✅ Ready to upload", value: validCount,   color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
                { label: "⚠️ Needs fixing",    value: invalidCount, color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
                { label: "📦 Total rows",       value: rows.length,  color: "#374151", bg: "#f9fafb", border: "#e5e7eb" },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: "16px 20px" }}>
                  <div style={{ fontSize: 30, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: s.color, opacity: 0.85, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "#fff", borderRadius: 20, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6",
                display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>Review Items</span>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>Click a row to edit · ⚙️ to add customizations</span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: dark ? "#1e293b" : "#f9fafb", borderBottom: dark ? "1px solid #334155" : "1px solid #e5e7eb" }}>
                      {["", "Image", "Name", "Category", "Price", "Description", "Customizations", "Ingredients", "Status", ""].map((h, i) => (
                        <th key={i} style={{ padding: "10px 12px", textAlign: "left",
                          fontWeight: 700, color: dark ? "#cbd5e1" : "#6b7280", fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const sc        = rowStyle(row, dark);
                      const isEdit    = editId === row.id;
                      const custCount = row.customizations?.length || 0;
                      return (
                        <tr key={row.id}
                          style={{ borderBottom: dark ? "1px solid #334155" : "1px solid #f3f4f6", background: sc.bg, cursor: "pointer" }}
                          onClick={() => setEditId(isEdit ? null : row.id)}>

                          {/* Status dot */}
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ width: 9, height: 9, borderRadius: "50%", background: sc.dot }} />
                          </td>

                          {/* Image */}
                          <td style={{ padding: "8px 12px" }}>
                            <label onClick={e => e.stopPropagation()} style={{ cursor: "pointer" }}>
                              <div style={{ width: 44, height: 40, borderRadius: 8, overflow: "hidden",
                                background: "#f3f4f6", display: "flex", alignItems: "center",
                                justifyContent: "center", border: "1px solid #e5e7eb" }}>
                                {row.imagePreview
                                  ? <img src={row.imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  : <span style={{ fontSize: 18 }}>📷</span>}
                              </div>
                              <input type="file" accept="image/*" style={{ display: "none" }}
                                onClick={e => e.stopPropagation()}
                                onChange={e => { if (e.target.files?.[0]) attachImage(row.id, e.target.files[0]); }} />
                            </label>
                          </td>

                          {/* Editable fields */}
                          {isEdit ? (
                            <>
                              <EditCell value={row.name}        onChange={v => updateField(row.id, "name", v)} />
                              <EditCell value={row.category}    onChange={v => updateField(row.id, "category", v)} />
                              <EditCell value={row.price}       onChange={v => updateField(row.id, "price", v)} type="number" width={80} />
                              <EditCell value={row.description} onChange={v => updateField(row.id, "description", v)} />
                            </>
                          ) : (
                            <>
                              <td style={{ padding: "10px 12px", fontWeight: 700 }}>
                                {row.name || <span style={{ color: "#ef4444" }}>Missing</span>}
                              </td>
                              <td style={{ padding: "10px 12px", color: "#6b7280" }}>{row.category || "—"}</td>
                              <td style={{ padding: "10px 12px", fontWeight: 700 }}>
                                {row.price ? `AED ${row.price}` : <span style={{ color: "#ef4444" }}>Missing</span>}
                              </td>
                              <td style={{ padding: "10px 12px", color: "#6b7280", maxWidth: 160 }}>
                                <span style={{ display: "-webkit-box", WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                  {row.description || <span style={{ color: "#ef4444" }}>Missing</span>}
                                </span>
                              </td>
                            </>
                          )}

                          {/* ── Customizations button ── */}
                          <td style={{ padding: "10px 12px" }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => openCustModal(row)}
                              style={{ display: "flex", alignItems: "center", gap: 6,
                                padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                                fontSize: 12, fontWeight: 700, border: "1px solid", whiteSpace: "nowrap",
                                borderColor: custCount > 0 ? "#fca89a" : "#e5e7eb",
                                background:  custCount > 0 ? "#fff5f3" : "#f9fafb",
                                color:       custCount > 0 ? "#ff4e2a" : "#6b7280" }}>
                              ⚙️ {custCount > 0 ? `${custCount} group${custCount !== 1 ? "s" : ""}` : "Add"}
                            </button>
                          </td>

                          {/* ── Ingredients cell ── */}
                          <td style={{ padding: "10px 12px" }} onClick={e => e.stopPropagation()}>
                            {(() => {
                              const parsed = parseIngredientString(row.ingredients);
                              const ingCount = parsed.length;
                              const hasInv = inventoryItems.length > 0;
                              return (
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  {ingCount > 0 && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                                      {parsed.map((ing, pi) => {
                                        const matched = inventoryItems.find(iv => iv.itemName.toLowerCase() === ing.name.toLowerCase());
                                        return (
                                          <Pill key={pi}
                                            color={matched ? "#166534" : "#1d4ed8"}
                                            bg={matched ? "#f0fdf4" : "#eff6ff"}
                                            border={matched ? "#bbf7d0" : "#bfdbfe"}
                                            dark={dark}>
                                            {matched ? "📦" : "✚"} {ing.name}:{ing.qty}{!matched ? " (new)" : ""}
                                          </Pill>
                                        );
                                      })}
                                    </div>
                                  )}
                                  <input
                                    value={row.ingredients}
                                    onChange={e => updateField(row.id, "ingredients", e.target.value)}
                                    placeholder={hasInv ? "e.g. Chicken:2, Oil:0.5" : "No inventory items"}
                                    style={{ fontSize: 11, padding: "4px 8px", border: "1px solid #e5e7eb",
                                      borderRadius: 6, width: 140, fontFamily: "inherit", outline: "none" }}
                                  />
                                </div>
                              );
                            })()}
                          </td>

                          {/* Status / errors */}
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {row.errors.map((e, i)   => <Pill key={i} color="#dc2626" bg="#fef2f2" border="#fecaca" dark={dark}>✗ {e}</Pill>)}
                              {row.warnings.map((w, i) => <Pill key={i} color="#92400e" bg="#fffbeb" border="#fde68a" dark={dark}>⚠ {w}</Pill>)}
                              {row.status === "success" && <Pill color="#15803d" bg="#f0fdf4" border="#bbf7d0" dark={dark}>✓ Uploaded</Pill>}
                              {row.status === "error"   && <Pill color="#dc2626" bg="#fef2f2" border="#fecaca" dark={dark}>✗ {row.uploadError}</Pill>}
                              {row.valid && !row.errors.length && !row.warnings.length && row.status === "idle" &&
                                <Pill color="#15803d" bg="#f0fdf4" border="#bbf7d0" dark={dark}>✓ Ready</Pill>}
                            </div>
                          </td>

                          {/* Remove */}
                          <td style={{ padding: "10px 10px" }}>
                            <button onClick={e => { e.stopPropagation(); removeRow(row.id); }}
                              style={{ background: "none", border: "none", color: "#d1d5db",
                                cursor: "pointer", fontSize: 17, lineHeight: 1, padding: "2px 4px" }}>✕</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, flexWrap: "wrap", gap: 12 }}>
              <button onClick={() => setStep(0)}
                style={{ padding: "11px 20px", borderRadius: 12, border: "1px solid #e5e7eb",
                  background: dark ? "#0f172a" : "#fff", color: "var(--text)", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                ← Back
              </button>
              <button onClick={submitAll} disabled={validCount === 0 || submitting}
                style={{ padding: "12px 32px", borderRadius: 12, border: "none", fontWeight: 900, fontSize: 15,
                  cursor: validCount > 0 ? "pointer" : "not-allowed",
                  background: validCount > 0 ? "linear-gradient(135deg,#ff4e2a,#ff6a3d)" : "#e5e7eb",
                  color: validCount > 0 ? "#fff" : "#9ca3af",
                  boxShadow: validCount > 0 ? "0 4px 14px rgba(255,78,42,.35)" : "none" }}>
                🚀 Upload {validCount} valid item{validCount !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Done ── */}
        {step === 2 && (
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid var(--border)",
            padding: 36, textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>{errorCount === 0 ? "🎉" : "⚠️"}</div>
            <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
              {errorCount === 0 ? "All done!" : `${successCount} uploaded, ${errorCount} failed`}
            </h3>
            <p style={{ color: "#6b7280", fontSize: 15, marginBottom: 28 }}>
              {successCount} item{successCount !== 1 ? "s" : ""} added to your menu successfully.
              {errorCount > 0 && ` ${errorCount} failed — click "Retry" to try again.`}
            </p>
            <div style={{ width: "100%", maxWidth: 360, margin: "0 auto 28px",
              background: "#f3f4f6", borderRadius: 999, height: 8 }}>
              <div style={{ width: `${(successCount / rows.length) * 100}%`, height: "100%",
                background: "linear-gradient(90deg,#ff4e2a,#ff6a3d)", borderRadius: 999, transition: "width 0.5s" }} />
            </div>
            {createdInvItems.length > 0 && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14,
                padding: "16px 20px", marginBottom: 24, textAlign: "left", maxWidth: 480, margin: "0 auto 24px" }}>
                <p style={{ fontWeight: 800, fontSize: 13, color: "#15803d", marginBottom: 10 }}>
                  📦 {createdInvItems.length} inventory item{createdInvItems.length !== 1 ? "s" : ""} created
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {createdInvItems.map((item, i) => (
                    <Pill key={i} color="#166534" bg="#f0fdf4" border="#bbf7d0" dark={dark}>
                      ✚ {item.itemName}
                    </Pill>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "#6b7280", marginTop: 8, marginBottom: 0 }}>
                  These have been added to your Inventory with stock at 0 — head to Inventory to restock.
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {errorCount > 0 && (
                <button onClick={submitAll}
                  style={{ padding: "11px 24px", borderRadius: 50, border: "none",
                    background: "#ff4e2a", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>
                  Retry {errorCount} failed
                </button>
              )}
              <button onClick={() => { setStep(0); setParsedRows([]); setImageMap({}); setCreatedInvItems([]); }}
                style={{ padding: "11px 24px", borderRadius: 50, border: "1.5px solid #e5e7eb",
                  background: dark ? "#0f172a" : "#fff", color: "var(--text)", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Upload another batch
              </button>
              <a href="/inventory" style={{ padding: "11px 24px", borderRadius: 50,
                border: "1.5px solid #bbf7d0", background: "#f0fdf4",
                color: "#15803d", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                View Inventory →
              </a>
              <a href="/menu" style={{ padding: "11px 24px", borderRadius: 50, background: "#111",
                color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                View Menu →
              </a>
            </div>
          </div>
        )}

        {/* Progress overlay */}
        {submitting && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: 24, padding: "40px 48px",
              textAlign: "center", minWidth: 320 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📤</div>
              <p style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Uploading your menu...</p>
              <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24 }}>{progress}% complete</p>
              <div style={{ width: "100%", background: "#f3f4f6", borderRadius: 999, height: 8 }}>
                <div style={{ width: `${progress}%`, height: "100%",
                  background: "linear-gradient(90deg,#ff4e2a,#ff6a3d)", borderRadius: 999, transition: "width 0.3s" }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}