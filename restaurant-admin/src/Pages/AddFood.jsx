import { useEffect, useMemo, useRef, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";

// ─── helpers ────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);

const EMPTY_ITEM = (category = "", customizations = []) => ({
  id: uid(), name: "", category, price: "", description: "",
  image: null, customizations: JSON.parse(JSON.stringify(customizations)),
  status: "idle", error: "",
});

const EMPTY_GROUP = () => ({ id: uid(), title: "", required: false, multiSelect: false, options: [{ id: uid(), label: "", extraPrice: 0 }] });

// ─── Step indicator ─────────────────────────────────────────────
function Steps({ current }) {
  const steps = ["Setup", "Add Items", "Review & Submit"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 13,
              background: i < current ? "#111827" : i === current ? "linear-gradient(135deg,#ff4e2a,#ff6a3d)" : "#f3f4f6",
              color: i <= current ? "white" : "#9ca3af",
              boxShadow: i === current ? "0 4px 14px rgba(255,78,42,0.35)" : "none",
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: i === current ? "#111827" : i < current ? "#374151" : "#9ca3af" }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < current ? "#111827" : "#e5e7eb", margin: "0 12px", borderRadius: 999 }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Setup categories + customization templates ─────────
function StepSetup({ categories, setCategories, templates, setTemplates, onNext }) {
  const addCat = () => setCategories(p => [...p, { id: uid(), name: "" }]);
  const updCat = (id, v) => setCategories(p => p.map(c => c.id === id ? { ...c, name: v } : c));
  const remCat = (id) => setCategories(p => p.filter(c => c.id !== id));

  const addTemplate = () => setTemplates(p => [...p, { id: uid(), name: "", groups: [EMPTY_GROUP()] }]);
  const updTpl = (id, k, v) => setTemplates(p => p.map(t => t.id === id ? { ...t, [k]: v } : t));
  const remTpl = (id) => setTemplates(p => p.filter(t => t.id !== id));

  const addGroup = (tid) => setTemplates(p => p.map(t => t.id === tid ? { ...t, groups: [...t.groups, EMPTY_GROUP()] } : t));
  const updGroup = (tid, gid, k, v) => setTemplates(p => p.map(t => t.id === tid ? { ...t, groups: t.groups.map(g => g.id === gid ? { ...g, [k]: v } : g) } : t));
  const remGroup = (tid, gid) => setTemplates(p => p.map(t => t.id === tid ? { ...t, groups: t.groups.filter(g => g.id !== gid) } : t));
  const addOpt = (tid, gid) => setTemplates(p => p.map(t => t.id === tid ? { ...t, groups: t.groups.map(g => g.id === gid ? { ...g, options: [...g.options, { id: uid(), label: "", extraPrice: 0 }] } : g) } : t));
  const updOpt = (tid, gid, oid, k, v) => setTemplates(p => p.map(t => t.id === tid ? { ...t, groups: t.groups.map(g => g.id === gid ? { ...g, options: g.options.map(o => o.id === oid ? { ...o, [k]: v } : o) } : g) } : t));
  const remOpt = (tid, gid, oid) => setTemplates(p => p.map(t => t.id === tid ? { ...t, groups: t.groups.map(g => g.id === gid ? { ...g, options: g.options.filter(o => o.id !== oid) } : g) } : t));

  const canNext = categories.some(c => c.name.trim());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Categories */}
      <div style={{ background: "white", borderRadius: 20, border: "1px solid var(--border)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>📂 Menu Categories</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Define the categories your menu items belong to</div>
          </div>
          <button type="button" onClick={addCat} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ Add Category</button>
        </div>
        <div style={{ padding: "16px 22px", display: "flex", flexWrap: "wrap", gap: 10 }}>
          {categories.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "6px 10px" }}>
              <input value={c.name} onChange={e => updCat(c.id, e.target.value)} placeholder="e.g. Burgers" style={{ border: "none", background: "transparent", outline: "none", fontWeight: 700, fontSize: 14, width: 120, fontFamily: "inherit" }} />
              <button type="button" onClick={() => remCat(c.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>
            </div>
          ))}
          {categories.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>No categories yet — click "+ Add Category"</p>}
        </div>
      </div>

      {/* Customization templates */}
      <div style={{ background: "white", borderRadius: 20, border: "1px solid var(--border)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>🎛️ Customization Templates</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Build reusable option sets — assign them to any item in the next step</div>
          </div>
          <button type="button" onClick={addTemplate} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ New Template</button>
        </div>
        <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {templates.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎛️</div>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>No templates yet. Create one to reuse customizations across items.</p>
              <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>Examples: "Drink Choice", "Spice Level", "Size", "Add-ons"</p>
            </div>
          )}
          {templates.map(tpl => (
            <div key={tpl.id} style={{ border: "1.5px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", background: "#f9fafb", display: "flex", alignItems: "center", gap: 10 }}>
                <input value={tpl.name} onChange={e => updTpl(tpl.id, "name", e.target.value)} placeholder='Template name e.g. "Drink Choice"'
                  style={{ flex: 1, border: "none", background: "transparent", fontWeight: 800, fontSize: 15, outline: "none", fontFamily: "inherit" }} />
                <button type="button" onClick={() => remTpl(tpl.id)} style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Remove</button>
              </div>
              <div style={{ padding: "12px 16px" }}>
                {tpl.groups.map(g => (
                  <div key={g.id} style={{ background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input value={g.title} onChange={e => updGroup(tpl.id, g.id, "title", e.target.value)} placeholder='Group title e.g. "Size"'
                        className="input" style={{ flex: 1, minWidth: 130 }} />
                      <label style={{ fontSize: 12, fontWeight: 600, display: "flex", gap: 5, alignItems: "center", cursor: "pointer", whiteSpace: "nowrap" }}>
                        <input type="checkbox" checked={g.required} onChange={e => updGroup(tpl.id, g.id, "required", e.target.checked)} /> Required
                      </label>
                      <label style={{ fontSize: 12, fontWeight: 600, display: "flex", gap: 5, alignItems: "center", cursor: "pointer", whiteSpace: "nowrap" }}>
                        <input type="checkbox" checked={g.multiSelect} onChange={e => updGroup(tpl.id, g.id, "multiSelect", e.target.checked)} /> Multi-select
                      </label>
                      <button type="button" onClick={() => remGroup(tpl.id, g.id)} style={{ background: "#fff1f1", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 7, padding: "4px 8px", cursor: "pointer", fontSize: 12 }}>✕</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {g.options.map(opt => (
                        <div key={opt.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input className="input" placeholder='Option e.g. "Large"' value={opt.label} onChange={e => updOpt(tpl.id, g.id, opt.id, "label", e.target.value)} style={{ flex: 1 }} />
                          <div style={{ position: "relative", width: 100, flexShrink: 0 }}>
                            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#9ca3af" }}>+AED</span>
                            <input className="input" type="number" min="0" placeholder="0" value={opt.extraPrice || ""} onChange={e => updOpt(tpl.id, g.id, opt.id, "extraPrice", Number(e.target.value) || 0)} style={{ paddingLeft: 38, width: "100%" }} />
                          </div>
                          <button type="button" onClick={() => remOpt(tpl.id, g.id, opt.id)} disabled={g.options.length === 1} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 7, color: "#ef4444", cursor: "pointer", padding: "5px 9px", fontSize: 14, opacity: g.options.length === 1 ? 0.3 : 1 }}>✕</button>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => addOpt(tpl.id, g.id)} style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", background: "#eef2ff", border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer", marginTop: 8 }}>+ Add Option</button>
                  </div>
                ))}
                <button type="button" onClick={() => addGroup(tpl.id)} style={{ fontSize: 12, fontWeight: 700, color: "#374151", background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>+ Add Group</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={onNext} disabled={!canNext} style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: canNext ? "linear-gradient(135deg,#ff4e2a,#ff6a3d)" : "#e5e7eb", color: canNext ? "white" : "#9ca3af", fontWeight: 900, fontSize: 15, cursor: canNext ? "pointer" : "not-allowed", boxShadow: canNext ? "0 4px 14px rgba(255,78,42,0.35)" : "none" }}>
          Next: Add Items →
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Add items using the setup ──────────────────────────
function StepItems({ items, setItems, categories, templates, onBack, onNext }) {
  const addItem = (cat = "") => setItems(p => [...p, EMPTY_ITEM(cat)]);

  const updateItem = (id, k, v) => setItems(p => p.map(it => it.id === id ? { ...it, [k]: v } : it));
  const removeItem = (id) => setItems(p => p.filter(it => it.id !== id));

  const applyTemplate = (itemId, tpl) => {
    const groups = tpl.groups.map(g => ({
      title: g.title, required: g.required, multiSelect: g.multiSelect,
      options: g.options.map(o => ({ label: o.label, extraPrice: o.extraPrice })),
    }));
    setItems(p => p.map(it => it.id === itemId ? { ...it, customizations: [...it.customizations, ...groups] } : it));
  };

  const clearCustomizations = (id) => setItems(p => p.map(it => it.id === id ? { ...it, customizations: [] } : it));

  const grouped = categories.reduce((acc, c) => {
    acc[c.name] = items.filter(it => it.category === c.name);
    return acc;
  }, {});
  const uncategorized = items.filter(it => !categories.find(c => c.name === it.category));

  const renderItem = (item) => {
    const preview = item.image ? URL.createObjectURL(item.image) : null;
    return (
      <div key={item.id} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: "14px 16px", display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 14, alignItems: "start" }}>
        {/* Image */}
        <label style={{ cursor: "pointer" }}>
          <div style={{ width: 80, height: 72, borderRadius: 10, border: "1.5px dashed #d1d5db", background: "#f9fafb", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {preview ? <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22 }}>📷</span>}
          </div>
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => updateItem(item.id, "image", e.target.files?.[0] || null)} />
        </label>

        {/* Fields */}
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: 8, marginBottom: 8 }}>
            <input className="input" value={item.name} onChange={e => updateItem(item.id, "name", e.target.value)} placeholder="Item name *" style={{ fontSize: 13 }} />
            <input className="input" value={item.category} onChange={e => updateItem(item.id, "category", e.target.value)} placeholder="Category" list="cats-list" style={{ fontSize: 13 }} />
            <input className="input" type="number" value={item.price} onChange={e => updateItem(item.id, "price", e.target.value)} placeholder="AED" style={{ fontSize: 13 }} />
          </div>
          <textarea className="textarea" value={item.description} onChange={e => updateItem(item.id, "description", e.target.value)} placeholder="Description *" style={{ fontSize: 13, minHeight: 54, resize: "none" }} />

          {/* Template apply */}
          {templates.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>Apply template:</span>
              {templates.map(t => (
                <button key={t.id} type="button" onClick={() => applyTemplate(item.id, t)} style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, border: "1px solid #c7d2fe", background: "#eef2ff", color: "#4338ca", cursor: "pointer" }}>
                  + {t.name || "Template"}
                </button>
              ))}
              {item.customizations.length > 0 && (
                <span style={{ fontSize: 11, color: "#15803d", fontWeight: 700, background: "#dcfce7", padding: "3px 8px", borderRadius: 999 }}>
                  {item.customizations.length} group{item.customizations.length !== 1 ? "s" : ""} applied
                </span>
              )}
              {item.customizations.length > 0 && (
                <button type="button" onClick={() => clearCustomizations(item.id)} style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 999, padding: "3px 8px", cursor: "pointer" }}>✕ Clear</button>
              )}
            </div>
          )}
        </div>

        {/* Remove */}
        <button type="button" onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", color: "#d1d5db", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "4px 6px", marginTop: 2 }}>✕</button>
      </div>
    );
  };

  return (
    <div>
      <datalist id="cats-list">{categories.map(c => <option key={c.id} value={c.name} />)}</datalist>

      {/* Category sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {categories.filter(c => c.name.trim()).map(cat => (
          <div key={cat.id} style={{ background: "white", borderRadius: 20, border: "1px solid var(--border)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff4e2a" }} />
                <span style={{ fontWeight: 900, fontSize: 15 }}>{cat.name}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{grouped[cat.name]?.length || 0} items</span>
              </div>
              <button type="button" onClick={() => addItem(cat.name)} style={{ padding: "7px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "white", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                + Add Item
              </button>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {(grouped[cat.name] || []).length === 0
                ? <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "14px 0" }}>No items yet — click "+ Add Item"</p>
                : (grouped[cat.name] || []).map(renderItem)}
            </div>
          </div>
        ))}

        {/* Uncategorized */}
        {uncategorized.length > 0 && (
          <div style={{ background: "white", borderRadius: 20, border: "1px solid var(--border)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", background: "#fffbeb", borderBottom: "1px solid #fef3c7" }}>
              <span style={{ fontWeight: 900, fontSize: 15, color: "#92400e" }}>⚠️ Uncategorized</span>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {uncategorized.map(renderItem)}
            </div>
          </div>
        )}
      </div>

      {/* Add item + nav */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => onBack()} style={{ padding: "11px 20px", borderRadius: 12, border: "1px solid var(--border)", background: "white", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>← Back</button>
          <button type="button" onClick={() => addItem()} style={{ padding: "11px 20px", borderRadius: 12, border: "1.5px dashed #d1d5db", background: "white", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>+ Add Item</button>
        </div>
        <button type="button" onClick={onNext} disabled={items.length === 0} style={{ padding: "11px 28px", borderRadius: 12, border: "none", background: items.length ? "linear-gradient(135deg,#ff4e2a,#ff6a3d)" : "#e5e7eb", color: items.length ? "white" : "#9ca3af", fontWeight: 900, fontSize: 15, cursor: items.length ? "pointer" : "not-allowed", boxShadow: items.length ? "0 4px 14px rgba(255,78,42,0.35)" : "none" }}>
          Review {items.length} item{items.length !== 1 ? "s" : ""} →
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Review & submit ─────────────────────────────────────
function StepReview({ items, setItems, onBack }) {
  const [submitting, setSubmitting] = useState(false);

  const updateStatus = (id, status, error = "") =>
    setItems(p => p.map(it => it.id === id ? { ...it, status, error } : it));

  const submitAll = async () => {
    const pending = items.filter(it => it.status !== "success");
    const invalid = pending.filter(it => !it.name || !it.price || !it.description || !it.image);
    if (invalid.length) { alert(`${invalid.length} item(s) missing required fields or image.`); return; }
    setSubmitting(true);
    for (const item of pending) {
      updateStatus(item.id, "uploading");
      try {
        const form = new FormData();
        form.append("name", item.name);
        form.append("category", item.category);
        form.append("price", item.price);
        form.append("description", item.description);
        form.append("image", item.image);
        form.append("customizations", JSON.stringify(item.customizations));
        const res = await api.post("/api/restaurantadmin/food/add", form, { headers: { "Content-Type": "multipart/form-data" } });
        updateStatus(item.id, res.data?.success ? "success" : "error", res.data?.message || "");
      } catch (err) {
        updateStatus(item.id, "error", err?.response?.data?.message || "Network error");
      }
    }
    setSubmitting(false);
  };

  const successCount = items.filter(it => it.status === "success").length;
  const errorCount   = items.filter(it => it.status === "error").length;
  const pendingCount = items.filter(it => it.status === "idle").length;

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Ready to upload", value: pendingCount, color: "#374151", bg: "#f9fafb", border: "#e5e7eb" },
          { label: "Uploaded ✓",      value: successCount, color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
          { label: "Failed ✗",        value: errorCount,   color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: "14px 18px" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: s.color, opacity: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Item list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {items.map((item, idx) => {
          const preview = item.image ? URL.createObjectURL(item.image) : null;
          const sc = item.status === "success" ? { bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e" }
                   : item.status === "error"   ? { bg: "#fef2f2", border: "#fecaca", dot: "#ef4444" }
                   : item.status === "uploading" ? { bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6" }
                   : { bg: "white", border: "#e5e7eb", dot: "#e5e7eb" };
          return (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc.dot, flexShrink: 0 }} />
              {preview && <img src={preview} alt="" style={{ width: 40, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {item.category} · AED {item.price}
                  {item.customizations.length > 0 && ` · ${item.customizations.length} customization group${item.customizations.length !== 1 ? "s" : ""}`}
                </div>
              </div>
              {item.status === "uploading" && <span style={{ fontSize: 12, color: "#3b82f6", fontWeight: 700 }}>Uploading...</span>}
              {item.status === "success"   && <span style={{ fontSize: 12, color: "#15803d", fontWeight: 700 }}>✓ Done</span>}
              {item.status === "error"     && <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 700 }}>✗ {item.error}</span>}
              {item.status === "idle"      && <span style={{ fontSize: 12, color: "#9ca3af" }}>Pending</span>}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
        <button type="button" onClick={onBack} disabled={submitting} style={{ padding: "11px 20px", borderRadius: 12, border: "1px solid var(--border)", background: "white", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>← Back</button>
        <button type="button" onClick={submitAll} disabled={submitting || pendingCount === 0} style={{
          padding: "12px 32px", borderRadius: 12, border: "none",
          background: (submitting || pendingCount === 0) ? "#9ca3af" : "linear-gradient(135deg,#ff4e2a,#ff6a3d)",
          color: "white", fontWeight: 900, fontSize: 15, cursor: (submitting || pendingCount === 0) ? "not-allowed" : "pointer",
          boxShadow: (submitting || pendingCount === 0) ? "none" : "0 4px 14px rgba(255,78,42,0.35)",
        }}>
          {submitting ? "Uploading..." : successCount === items.length ? "✓ All Done!" : `🚀 Upload ${pendingCount} Item${pendingCount !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────
export default function AddFood() {
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState([{ id: uid(), name: "" }]);
  const [templates, setTemplates] = useState([]);
  const [items, setItems] = useState([]);

  return (
    <RestaurantLayout>
      <div style={{ marginBottom: 6 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 900, letterSpacing: "-0.5px" }}>Add Menu Items</h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Build your entire menu in one go</p>
      </div>

      <div style={{ marginTop: 24 }}>
        <Steps current={step} />

        {step === 0 && (
          <StepSetup
            categories={categories} setCategories={setCategories}
            templates={templates} setTemplates={setTemplates}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <StepItems
            items={items} setItems={setItems}
            categories={categories} templates={templates}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepReview
            items={items} setItems={setItems}
            onBack={() => setStep(1)}
          />
        )}
      </div>
    </RestaurantLayout>
  );
}