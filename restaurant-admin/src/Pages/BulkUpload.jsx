import { useCallback, useEffect, useRef, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";

// ── Load SheetJS from CDN ──────────────────────────────────────
let XLSX = null;
const loadXLSX = () =>
  new Promise((res, rej) => {
    if (XLSX) return res(XLSX);
    if (window.XLSX) { XLSX = window.XLSX; return res(XLSX); }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => { XLSX = window.XLSX; res(XLSX); };
    s.onerror = rej;
    document.head.appendChild(s);
  });

const uid = () => Math.random().toString(36).slice(2, 9);

// ── Template download ──────────────────────────────────────────
const downloadTemplate = async () => {
  const xl = await loadXLSX();
  const ws = xl.utils.aoa_to_sheet([
    ["name", "category", "price", "description", "image_filename", "customizations_json"],
    ["Margherita Pizza", "Pizza", "12.99", "Classic tomato and mozzarella", "margherita.jpg", ""],
    ["Spicy Ramen", "Noodles", "14.50", "Rich broth with noodles and egg", "ramen.jpg",
      JSON.stringify([{ title: "Spice Level", required: true, multiSelect: false, options: [{ label: "Mild", extraPrice: 0 }, { label: "Hot", extraPrice: 0 }] }])],
  ]);
  ws["!cols"] = [20, 14, 8, 36, 22, 60].map(w => ({ wch: w }));
  const wb = xl.utils.book_new();
  xl.utils.book_append_sheet(wb, ws, "Menu Items");
  xl.writeFile(wb, "crave_menu_template.xlsx");
};

// ── Parse CSV or XLSX ──────────────────────────────────────────
const parseFile = async (file) => {
  const xl = await loadXLSX();
  const buf = await file.arrayBuffer();
  const wb  = xl.read(buf, { type: "array" });
  const ws  = wb.Sheets[wb.SheetNames[0]];
  const rows = xl.utils.sheet_to_json(ws, { defval: "" });
  return rows.map(r => ({
    id: uid(),
    name:            String(r.name || r.Name || r["Item Name"] || "").trim(),
    category:        String(r.category || r.Category || "").trim(),
    price:           String(r.price || r.Price || "").trim(),
    description:     String(r.description || r.Description || "").trim(),
    image_filename:  String(r.image_filename || r["Image Filename"] || r.image || "").trim(),
    customizations_json: String(r.customizations_json || r.customizations || "").trim(),
    // Runtime state
    imageFile: null,
    imagePreview: null,
    customizations: [],
    status: "idle",
    error: "",
    warnings: [],
  }));
};

// ── Match images to rows ───────────────────────────────────────
const matchImages = (rows, imageFiles) => {
  const imgMap = {};
  imageFiles.forEach(f => {
    imgMap[f.name.toLowerCase()] = f;
    imgMap[f.name.toLowerCase().replace(/\.[^.]+$/, "")] = f;
  });
  return rows.map(row => {
    const key = row.image_filename.toLowerCase();
    const keyNoExt = key.replace(/\.[^.]+$/, "");
    const matched = imgMap[key] || imgMap[keyNoExt];
    const warnings = [...row.warnings];
    if (!matched) warnings.push(`No image matched for "${row.image_filename || row.name}"`);
    let customizations = row.customizations;
    if (row.customizations_json) {
      try { customizations = JSON.parse(row.customizations_json); }
      catch { warnings.push("Invalid customizations JSON — skipped"); }
    }
    return {
      ...row,
      imageFile: matched || null,
      imagePreview: matched ? URL.createObjectURL(matched) : null,
      customizations,
      warnings,
    };
  });
};

// ── Validate rows ──────────────────────────────────────────────
const validate = (rows) =>
  rows.map(row => {
    const errors = [];
    if (!row.name) errors.push("Missing name");
    if (!row.price || isNaN(Number(row.price))) errors.push("Invalid price");
    if (!row.description) errors.push("Missing description");
    if (!row.imageFile) errors.push("No image matched");
    return { ...row, valid: errors.length === 0, errors };
  });

// ── Status dot colour ──────────────────────────────────────────
const statusStyle = (row) => {
  if (row.status === "success")   return { dot: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" };
  if (row.status === "error")     return { dot: "#ef4444", bg: "#fef2f2", border: "#fecaca" };
  if (row.status === "uploading") return { dot: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" };
  if (!row.valid)                 return { dot: "#f59e0b", bg: "#fffbeb", border: "#fde68a" };
  return { dot: "#d1d5db", bg: "#fff", border: "#e5e7eb" };
};

// ── Pill badge ─────────────────────────────────────────────────
const Pill = ({ children, color, bg, border }) => (
  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999, color, background: bg, border: `1px solid ${border}`, whiteSpace: "nowrap" }}>
    {children}
  </span>
);

// ── Main component ─────────────────────────────────────────────
export default function BulkUpload() {
  const [xlsxReady, setXlsxReady] = useState(false);
  const [step, setStep]           = useState(0); // 0=upload, 1=match, 2=review, 3=done
  const [rows, setRows]           = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [editRow, setEditRow]     = useState(null); // id of row being edited inline

  const sheetRef = useRef();
  const imgRef   = useRef();

  useEffect(() => { loadXLSX().then(() => setXlsxReady(true)).catch(() => {}); }, []);

  // ── Step 0: upload spreadsheet ──────────────────────────────
  const onSheetDrop = useCallback(async (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseFile(file);
      setRows(parsed);
      setStep(1);
    } catch (err) {
      alert("Could not parse file: " + err.message);
    }
  }, []);

  // ── Step 1: upload images ────────────────────────────────────
  const onImagesDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || e.target?.files || [])
      .filter(f => f.type.startsWith("image/"));
    const matched = matchImages(rows, files);
    const validated = validate(matched);
    setRows(validated);
    setStep(2);
  }, [rows]);

  // ── Step 2: inline edit ──────────────────────────────────────
  const updateRow = (id, key, val) =>
    setRows(prev => validate(prev.map(r => r.id === id ? { ...r, [key]: val } : r)));

  const removeRow = (id) => setRows(prev => validate(prev.filter(r => r.id !== id)));

  // Manual image attach per row
  const attachImage = (id, file) => {
    const preview = URL.createObjectURL(file);
    setRows(prev => validate(prev.map(r =>
      r.id === id ? { ...r, imageFile: file, imagePreview: preview, image_filename: file.name } : r
    )));
  };

  // ── Step 3: submit ───────────────────────────────────────────
  const submitAll = async () => {
    const pending = rows.filter(r => r.valid && r.status !== "success");
    if (!pending.length) return;
    setSubmitting(true);
    setProgress(0);
    let done = 0;
    for (const row of pending) {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: "uploading" } : r));
      try {
        const form = new FormData();
        form.append("name", row.name);
        form.append("category", row.category);
        form.append("price", row.price);
        form.append("description", row.description);
        form.append("image", row.imageFile);
        form.append("customizations", JSON.stringify(row.customizations));
        const res = await api.post("/api/restaurantadmin/food/add", form, { headers: { "Content-Type": "multipart/form-data" } });
        const ok = res.data?.success;
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: ok ? "success" : "error", error: ok ? "" : (res.data?.message || "Failed") } : r));
      } catch (err) {
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: "error", error: err?.response?.data?.message || "Network error" } : r));
      }
      done++;
      setProgress(Math.round((done / pending.length) * 100));
    }
    setSubmitting(false);
    setStep(3);
  };

  // ── Counts ───────────────────────────────────────────────────
  const validCount   = rows.filter(r => r.valid).length;
  const invalidCount = rows.filter(r => !r.valid).length;
  const successCount = rows.filter(r => r.status === "success").length;
  const errorCount   = rows.filter(r => r.status === "error").length;

  // ── Step indicator ───────────────────────────────────────────
  const STEPS = ["Upload Spreadsheet", "Match Images", "Review & Fix", "Upload"];
  const stepBar = (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 13,
              background: i < step ? "#111" : i === step ? "linear-gradient(135deg,#ff4e2a,#ff6a3d)" : "#f3f4f6",
              color: i <= step ? "#fff" : "#9ca3af",
              boxShadow: i === step ? "0 4px 14px rgba(255,78,42,0.35)" : "none",
            }}>
              {i < step ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: i === step ? "#111" : i < step ? "#374151" : "#9ca3af" }}>{s}</span>
          </div>
          {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? "#111" : "#e5e7eb", margin: "0 12px", borderRadius: 999 }} />}
        </div>
      ))}
    </div>
  );

  // ── Drag-over helper ─────────────────────────────────────────
  const onDragOver = (e) => e.preventDefault();

  const dropZone = ({ label, sub, icon, onDrop, onBrowse, accept, browseLabel }) => (
    <div
      onDrop={onDrop} onDragOver={onDragOver}
      style={{ border: "2px dashed #d1d5db", borderRadius: 20, padding: "52px 32px", textAlign: "center", cursor: "pointer", background: "#fafafa", transition: "border-color 0.2s" }}
      onDragEnter={e => e.currentTarget.style.borderColor = "#ff4e2a"}
      onDragLeave={e => e.currentTarget.style.borderColor = "#d1d5db"}
      onClick={onBrowse}
    >
      <div style={{ fontSize: 52, marginBottom: 16 }}>{icon}</div>
      <p style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{label}</p>
      <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 20 }}>{sub}</p>
      <button type="button" onClick={e => { e.stopPropagation(); onBrowse(); }}
        style={{ padding: "11px 28px", borderRadius: 50, background: "#111", color: "#fff", border: "none", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
        {browseLabel}
      </button>
    </div>
  );

  return (
    <RestaurantLayout>
      <div style={{ marginBottom: 6, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 900, letterSpacing: "-0.5px" }}>📦 Bulk Menu Upload</h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Upload your whole menu from a spreadsheet + images in minutes</p>
        </div>
        {xlsxReady && (
          <button onClick={downloadTemplate} style={{ padding: "9px 20px", borderRadius: 50, border: "1.5px solid #e5e7eb", background: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
            ⬇️ Download Template
          </button>
        )}
      </div>

      <div style={{ marginTop: 28 }}>
        {stepBar}

        {/* ── Step 0: Upload spreadsheet ── */}
        {step === 0 && (
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid var(--border)", padding: 28 }}>
            <input ref={sheetRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={onSheetDrop} />
            {dropZone({
              label: "Drop your spreadsheet here",
              sub: "Supports .xlsx, .xls, .csv — download the template to get started",
              icon: "📊",
              onDrop: onSheetDrop,
              onBrowse: () => sheetRef.current?.click(),
              browseLabel: "Browse File",
            })}

            <div style={{ marginTop: 24, background: "#f8f9fa", borderRadius: 14, padding: "18px 22px" }}>
              <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>📋 Expected columns:</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
                {[
                  { col: "name", req: true, desc: "Item name" },
                  { col: "category", req: false, desc: "e.g. Pizza, Burgers" },
                  { col: "price", req: true, desc: "Numeric price" },
                  { col: "description", req: true, desc: "Item description" },
                  { col: "image_filename", req: false, desc: "e.g. pizza.jpg" },
                  { col: "customizations_json", req: false, desc: "JSON array (optional)" },
                ].map(c => (
                  <div key={c.col} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px" }}>
                    <code style={{ fontSize: 12, fontWeight: 800, color: c.req ? "#dc2626" : "#374151" }}>{c.col}{c.req ? " *" : ""}</code>
                    <p style={{ fontSize: 11.5, color: "#6b7280", margin: "3px 0 0" }}>{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Upload images ── */}
        {step === 1 && (
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid var(--border)", padding: 28 }}>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "12px 16px", marginBottom: 24, fontSize: 13 }}>
              ✅ Parsed <strong>{rows.length} items</strong> from your spreadsheet.
              Now upload all your food images — they'll be matched by filename automatically.
            </div>
            <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: "none" }}
              onChange={e => onImagesDrop({ preventDefault: () => {}, dataTransfer: { files: e.target.files } })} />
            {dropZone({
              label: "Drop all your food images here",
              sub: "Select multiple images at once — matched by filename to your spreadsheet",
              icon: "🖼️",
              onDrop: onImagesDrop,
              onBrowse: () => imgRef.current?.click(),
              browseLabel: "Browse Images",
            })}

            {/* Preview which images we're looking for */}
            <div style={{ marginTop: 20 }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: "#6b7280", marginBottom: 10 }}>Images expected from your spreadsheet:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {rows.filter(r => r.image_filename).map(r => (
                  <Pill key={r.id} color="#374151" bg="#f3f4f6" border="#e5e7eb">{r.image_filename}</Pill>
                ))}
                {rows.filter(r => !r.image_filename).length > 0 && (
                  <Pill color="#9ca3af" bg="#fafafa" border="#e5e7eb">{rows.filter(r => !r.image_filename).length} items without filename</Pill>
                )}
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(0)} style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 700, cursor: "pointer" }}>← Back</button>
              <button onClick={() => { const validated = validate(rows); setRows(validated); setStep(2); }}
                style={{ padding: "10px 22px", borderRadius: 12, border: "none", background: "#6b7280", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                Skip images, continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Review table ── */}
        {step === 2 && (
          <div>
            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "✅ Ready", value: validCount, color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
                { label: "⚠️ Needs fixing", value: invalidCount, color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
                { label: "📦 Total rows", value: rows.length, color: "#374151", bg: "#f9fafb", border: "#e5e7eb" },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: "16px 20px" }}>
                  <div style={{ fontSize: 30, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: s.color, opacity: 0.85, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div style={{ background: "#fff", borderRadius: 20, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>Review Items</span>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>Click a row to edit inline</span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      {["", "Image", "Name", "Category", "Price", "Description", "Errors / Warnings", ""].map((h, i) => (
                        <th key={i} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#6b7280", fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const sc = statusStyle(row);
                      const isEdit = editRow === row.id;
                      return (
                        <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6", background: sc.bg, cursor: "pointer" }}
                          onClick={() => setEditRow(isEdit ? null : row.id)}>
                          {/* Status dot */}
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ width: 9, height: 9, borderRadius: "50%", background: sc.dot }} />
                          </td>

                          {/* Image */}
                          <td style={{ padding: "8px 12px" }}>
                            <label onClick={e => e.stopPropagation()} style={{ cursor: "pointer" }}>
                              <div style={{ width: 44, height: 40, borderRadius: 8, overflow: "hidden", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e5e7eb" }}>
                                {row.imagePreview
                                  ? <img src={row.imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  : <span style={{ fontSize: 18 }}>📷</span>}
                              </div>
                              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) attachImage(row.id, e.target.files[0]); }} onClick={e => e.stopPropagation()} />
                            </label>
                          </td>

                          {/* Editable fields */}
                          {isEdit ? (
                            <>
                              <td style={{ padding: "8px 6px" }} onClick={e => e.stopPropagation()}>
                                <input value={row.name} onChange={e => updateRow(row.id, "name", e.target.value)}
                                  style={{ width: "100%", border: "1.5px solid #ff4e2a", borderRadius: 8, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                              </td>
                              <td style={{ padding: "8px 6px" }} onClick={e => e.stopPropagation()}>
                                <input value={row.category} onChange={e => updateRow(row.id, "category", e.target.value)}
                                  style={{ width: "100%", border: "1.5px solid #ff4e2a", borderRadius: 8, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                              </td>
                              <td style={{ padding: "8px 6px" }} onClick={e => e.stopPropagation()}>
                                <input type="number" value={row.price} onChange={e => updateRow(row.id, "price", e.target.value)}
                                  style={{ width: 80, border: "1.5px solid #ff4e2a", borderRadius: 8, padding: "6px 8px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                              </td>
                              <td style={{ padding: "8px 6px" }} onClick={e => e.stopPropagation()}>
                                <input value={row.description} onChange={e => updateRow(row.id, "description", e.target.value)}
                                  style={{ width: "100%", border: "1.5px solid #ff4e2a", borderRadius: 8, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: "10px 12px", fontWeight: 700 }}>{row.name || <span style={{ color: "#ef4444" }}>Missing</span>}</td>
                              <td style={{ padding: "10px 12px", color: "#6b7280" }}>{row.category || "—"}</td>
                              <td style={{ padding: "10px 12px", fontWeight: 700 }}>{row.price ? `AED ${row.price}` : <span style={{ color: "#ef4444" }}>Missing</span>}</td>
                              <td style={{ padding: "10px 12px", color: "#6b7280", maxWidth: 200 }}>
                                <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{row.description || <span style={{ color: "#ef4444" }}>Missing</span>}</span>
                              </td>
                            </>
                          )}

                          {/* Errors / warnings */}
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {(row.errors || []).map((e, i) => <Pill key={i} color="#dc2626" bg="#fef2f2" border="#fecaca">✗ {e}</Pill>)}
                              {(row.warnings || []).map((w, i) => <Pill key={i} color="#92400e" bg="#fffbeb" border="#fde68a">⚠ {w}</Pill>)}
                              {row.valid && !row.errors?.length && !row.warnings?.length && <Pill color="#15803d" bg="#f0fdf4" border="#bbf7d0">✓ Ready</Pill>}
                            </div>
                          </td>

                          {/* Remove */}
                          <td style={{ padding: "10px 10px" }}>
                            <button onClick={e => { e.stopPropagation(); removeRow(row.id); }}
                              style={{ background: "none", border: "none", color: "#d1d5db", cursor: "pointer", fontSize: 17, lineHeight: 1, padding: "2px 4px" }}>✕</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, flexWrap: "wrap", gap: 12 }}>
              <button onClick={() => setStep(1)} style={{ padding: "11px 20px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>← Back</button>
              <button onClick={submitAll} disabled={validCount === 0 || submitting}
                style={{ padding: "12px 32px", borderRadius: 12, border: "none", background: validCount > 0 ? "linear-gradient(135deg,#ff4e2a,#ff6a3d)" : "#e5e7eb", color: validCount > 0 ? "#fff" : "#9ca3af", fontWeight: 900, fontSize: 15, cursor: validCount > 0 ? "pointer" : "not-allowed", boxShadow: validCount > 0 ? "0 4px 14px rgba(255,78,42,0.35)" : "none" }}>
                🚀 Upload {validCount} valid item{validCount !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid var(--border)", padding: 36, textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>{errorCount === 0 ? "🎉" : "⚠️"}</div>
            <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
              {errorCount === 0 ? "All done!" : `${successCount} uploaded, ${errorCount} failed`}
            </h3>
            <p style={{ color: "#6b7280", fontSize: 15, marginBottom: 28 }}>
              {successCount} item{successCount !== 1 ? "s" : ""} added to your menu successfully.
              {errorCount > 0 && ` ${errorCount} item${errorCount !== 1 ? "s" : ""} failed — you can retry below.`}
            </p>

            {/* Progress bar */}
            <div style={{ width: "100%", maxWidth: 360, margin: "0 auto 28px", background: "#f3f4f6", borderRadius: 999, height: 8 }}>
              <div style={{ width: `${(successCount / rows.length) * 100}%`, height: "100%", background: "linear-gradient(90deg,#ff4e2a,#ff6a3d)", borderRadius: 999, transition: "width 0.5s" }} />
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {errorCount > 0 && (
                <button onClick={submitAll} style={{ padding: "11px 24px", borderRadius: 50, border: "none", background: "#ff4e2a", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>
                  Retry {errorCount} failed
                </button>
              )}
              <button onClick={() => { setStep(0); setRows([]); }}
                style={{ padding: "11px 24px", borderRadius: 50, border: "1.5px solid #e5e7eb", background: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Upload another batch
              </button>
              <a href="/menu" style={{ padding: "11px 24px", borderRadius: 50, background: "#111", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                View Menu →
              </a>
            </div>
          </div>
        )}

        {/* ── Uploading progress overlay ── */}
        {submitting && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: 24, padding: "40px 48px", textAlign: "center", minWidth: 320 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📤</div>
              <p style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Uploading your menu...</p>
              <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24 }}>{progress}% complete</p>
              <div style={{ width: "100%", background: "#f3f4f6", borderRadius: 999, height: 8 }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#ff4e2a,#ff6a3d)", borderRadius: 999, transition: "width 0.3s" }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}