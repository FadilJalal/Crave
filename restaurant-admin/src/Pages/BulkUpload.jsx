import { useCallback, useReducer, useRef, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";

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

const COLUMNS = [
  { key: "name",                label: "name *",              required: true,  hint: "Item name" },
  { key: "category",            label: "category",            required: false, hint: "e.g. Pizza, Burgers" },
  { key: "price",               label: "price *",             required: true,  hint: "Numeric price" },
  { key: "description",         label: "description *",       required: true,  hint: "Item description" },
  { key: "image_filename",      label: "image_filename",      required: false, hint: "e.g. pizza.jpg" },
  { key: "customizations_json", label: "customizations_json", required: false, hint: "JSON array (optional)" },
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
  const res = await api.post("/api/restaurantadmin/food/add", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  if (!res.data?.success) throw new Error(res.data?.message || "Failed");
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
    COLUMNS.map((c) => c.key),
    ["Margherita Pizza", "Pizza",   "12.99", "Classic tomato and mozzarella",   "margherita.jpg", ""],
    ["Spicy Ramen",      "Noodles", "14.50", "Rich broth with noodles and egg", "ramen.jpg",
      JSON.stringify([{ title: "Spice Level", required: true, multiSelect: false,
        options: [{ label: "Mild", extraPrice: 0 }, { label: "Hot", extraPrice: 0 }] }])],
  ]);
  ws["!cols"] = [20, 14, 8, 36, 22, 60].map((w) => ({ wch: w }));
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

const STATUS_STYLE = {
  success:   { dot: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" },
  error:     { dot: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
  uploading: { dot: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  invalid:   { dot: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  idle:      { dot: "#d1d5db", bg: "#fff",    border: "#e5e7eb" },
};

const rowStyle = (row) =>
  row.status !== "idle" ? STATUS_STYLE[row.status] : row.valid ? STATUS_STYLE.idle : STATUS_STYLE.invalid;

// ─── Sub-components ───────────────────────────────────────────────────────────

const Pill = ({ children, color, bg, border }) => (
  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999,
    color, background: bg, border: `1px solid ${border}`, whiteSpace: "nowrap" }}>
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
  const [hover, setHover] = useState(false);
  return (
    <div onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onClick={onBrowse}
      style={{ border: `2px dashed ${hover ? "#ff4e2a" : "#d1d5db"}`, borderRadius: 20,
        padding: "52px 32px", textAlign: "center", cursor: "pointer",
        background: hover ? "#fff5f3" : "#fafafa", transition: "all 0.2s" }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>{icon}</div>
      <p style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{label}</p>
      <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 20 }}>{sub}</p>
      <button type="button" onClick={(e) => { e.stopPropagation(); onBrowse(); }}
        style={{ padding: "11px 28px", borderRadius: 50, background: "#111", color: "#fff",
          border: "none", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
        {browseLabel}
      </button>
    </div>
  );
};

const StepBar = ({ current }) => {
  const STEPS = ["Upload Files", "Review & Fix", "Done"];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13,
              background: i < current ? "#111" : i === current ? "linear-gradient(135deg,#ff4e2a,#ff6a3d)" : "#f3f4f6",
              color: i <= current ? "#fff" : "#9ca3af",
              boxShadow: i === current ? "0 4px 14px rgba(255,78,42,.35)" : "none" }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700,
              color: i === current ? "#111" : i < current ? "#374151" : "#9ca3af" }}>{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < current ? "#111" : "#e5e7eb",
              margin: "0 12px", borderRadius: 999 }} />
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Customization Builder Modal ──────────────────────────────────────────────

const emptyGroup  = () => ({ id: uid(), title: "", required: false, multiSelect: false, options: [] });
const emptyOption = () => ({ id: uid(), label: "", extraPrice: 0 });

function CustomizationModal({ rowName, initial, onSave, onClose }) {
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

  const inp = { border: "1px solid #e5e7eb", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff" };
  const lbl = { fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 4, display: "block" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 620,
        maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6",
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>⚙️ Customizations</h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>{rowName}</p>
          </div>
          <button onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {groups.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🍽️</div>
              <p style={{ fontSize: 14, margin: 0 }}>No customization groups yet.</p>
              <p style={{ fontSize: 13, margin: "4px 0 0" }}>Add a group like "Size" or "Toppings" below.</p>
            </div>
          )}

          {groups.map((group) => (
            <div key={group.id} style={{ border: "1px solid #e5e7eb", borderRadius: 16,
              padding: "16px 18px", marginBottom: 14, background: "#fafafa" }}>

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
                          background: group.multiSelect === val ? "#111" : "#fff",
                          color: group.multiSelect === val ? "#fff" : "#374151" }}>
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
                      background: group.required ? "#ff4e2a" : "#fff",
                      color: group.required ? "#fff" : "#374151" }}>
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
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 8px" }}>No options yet — add at least one.</p>
                )}

                {group.options.map((opt, oi) => (
                  <div key={opt.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    {/* Visual checkbox / radio preview */}
                    <div style={{ width: 18, height: 18, borderRadius: group.multiSelect ? 4 : "50%",
                      border: "2px solid #d1d5db", flexShrink: 0, background: "#fff" }} />

                    <input value={opt.label} placeholder={`Option ${oi + 1} label`}
                      onChange={e => updateOption(group.id, opt.id, "label", e.target.value)}
                      style={{ ...inp, flex: 1 }} />

                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>+ AED</span>
                      <input type="number" min="0" step="0.5" value={opt.extraPrice}
                        onChange={e => updateOption(group.id, opt.id, "extraPrice", parseFloat(e.target.value) || 0)}
                        style={{ ...inp, width: 70 }} />
                    </div>

                    <button type="button" onClick={() => removeOption(group.id, opt.id)}
                      style={{ background: "none", border: "none", color: "#d1d5db",
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
              background: "#fafafa", fontWeight: 800, fontSize: 14, cursor: "pointer", color: "#374151" }}>
            + Add Customization Group
          </button>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            {groups.length} group{groups.length !== 1 ? "s" : ""} · {groups.reduce((a, g) => a + g.options.length, 0)} total options
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose}
              style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e5e7eb",
                background: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
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
  const [step, setStep]         = useState(0);
  const [rows, dispatch]        = useReducer(rowsReducer, []);
  const [editId, setEditId]     = useState(null);
  const [submitting, setSubmit] = useState(false);
  const [progress, setProgress] = useState(0);
  const [custModal, setCustModal] = useState(null); // { rowId, rowName, customizations }

  const sheetRef = useRef();
  const imgRef   = useRef();

  const [parsedRows, setParsedRows] = useState([]);
  const [imageMap,   setImageMap]   = useState({});

  const handleSheetFiles = useCallback(async (files) => {
    const sheetFile = Array.from(files).find(f => /\.(xlsx|xls|csv)$/i.test(f.name));
    if (!sheetFile) return alert("Please upload a .xlsx, .xls, or .csv file.");
    try {
      const raw = await parseSpreadsheet(sheetFile);
      setParsedRows(raw.map(normaliseRow));
    } catch (err) { alert("Could not parse spreadsheet: " + err.message); }
  }, []);

  const handleImageFiles = useCallback((files) => {
    setImageMap(buildImageMap(Array.from(files).filter(f => f.type.startsWith("image/"))));
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
    const tasks = pending.map(row => async () => {
      dispatch({ type: "SET_STATUS", id: row.id, status: "uploading" });
      try {
        await uploadRow(row);
        dispatch({ type: "SET_STATUS", id: row.id, status: "success" });
      } catch (err) {
        dispatch({ type: "SET_STATUS", id: row.id, status: "error", error: err.message || "Network error" });
      }
      done++;
      setProgress(Math.round((done / pending.length) * 100));
    });
    await pLimit(tasks, CONCURRENCY);
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
            background: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 7 }}>
          ⬇️ Download Template
        </button>
      </div>

      <div style={{ marginTop: 28 }}>
        <StepBar current={step} />

        {/* ── STEP 0: Upload files ── */}
        {step === 0 && (
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid var(--border)", padding: 28 }}>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12,
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
                    <span style={{ color: "#16a34a" }}>✓ {Object.keys(imageMap).length / 2} images loaded</span>}
                </p>
                <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: "none" }}
                  onChange={e => handleImageFiles(e.target.files)} />
                <DropZone label="Drop food images" sub="Select multiple at once" icon="🖼️"
                  onDrop={(e) => { e.preventDefault(); handleImageFiles(e.dataTransfer.files); }}
                  onBrowse={() => imgRef.current?.click()} browseLabel="Browse Images" />
              </div>
            </div>

            <div style={{ background: "#f8f9fa", borderRadius: 14, padding: "18px 22px", marginBottom: 24 }}>
              <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>📋 Expected columns:</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
                {COLUMNS.map(c => (
                  <div key={c.key} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px" }}>
                    <code style={{ fontSize: 12, fontWeight: 800, color: c.required ? "#dc2626" : "#374151" }}>{c.label}</code>
                    <p style={{ fontSize: 11.5, color: "#6b7280", margin: "3px 0 0" }}>{c.hint}</p>
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
                    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      {["", "Image", "Name", "Category", "Price", "Description", "Customizations", "Status", ""].map((h, i) => (
                        <th key={i} style={{ padding: "10px 12px", textAlign: "left",
                          fontWeight: 700, color: "#6b7280", fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const sc        = rowStyle(row);
                      const isEdit    = editId === row.id;
                      const custCount = row.customizations?.length || 0;
                      return (
                        <tr key={row.id}
                          style={{ borderBottom: "1px solid #f3f4f6", background: sc.bg, cursor: "pointer" }}
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

                          {/* Status / errors */}
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {row.errors.map((e, i)   => <Pill key={i} color="#dc2626" bg="#fef2f2" border="#fecaca">✗ {e}</Pill>)}
                              {row.warnings.map((w, i) => <Pill key={i} color="#92400e" bg="#fffbeb" border="#fde68a">⚠ {w}</Pill>)}
                              {row.status === "success" && <Pill color="#15803d" bg="#f0fdf4" border="#bbf7d0">✓ Uploaded</Pill>}
                              {row.status === "error"   && <Pill color="#dc2626" bg="#fef2f2" border="#fecaca">✗ {row.uploadError}</Pill>}
                              {row.valid && !row.errors.length && !row.warnings.length && row.status === "idle" &&
                                <Pill color="#15803d" bg="#f0fdf4" border="#bbf7d0">✓ Ready</Pill>}
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
                  background: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
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
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {errorCount > 0 && (
                <button onClick={submitAll}
                  style={{ padding: "11px 24px", borderRadius: 50, border: "none",
                    background: "#ff4e2a", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>
                  Retry {errorCount} failed
                </button>
              )}
              <button onClick={() => { setStep(0); setParsedRows([]); setImageMap({}); }}
                style={{ padding: "11px 24px", borderRadius: 50, border: "1.5px solid #e5e7eb",
                  background: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Upload another batch
              </button>
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