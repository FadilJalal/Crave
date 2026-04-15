import { useEffect, useMemo, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";

const uid = () => Math.random().toString(36).slice(2);

const makeOption = () => ({ id: uid(), label: "", extraPrice: "" });

const makeGroup = () => ({
  id: uid(),
  title: "",
  required: false,
  multiSelect: false,
  options: [makeOption()],
});

const makeItem = () => ({
  id: uid(),
  name: "",
  category: "",
  categoryMode: "existing",
  price: "",
  description: "",
  image: null,
  customizations: [],
  ingredients: [],
  status: "idle",
  error: "",
});

function Stepper({ step, dark }) {
  const steps = ["Add Items", "Review & Submit"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 }}>
      {steps.map((label, i) => {
        const active = step === i;
        const done = i < step;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 13,
                  background: done ? "#111827" : active ? "linear-gradient(135deg,#ff4e2a,#ff6a3d)" : (dark ? "#334155" : "#e5e7eb"),
                  color: done || active ? "#fff" : (dark ? "#cbd5e1" : "#6b7280"),
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: active ? (dark ? "#f8fafc" : "#111827") : (dark ? "#94a3b8" : "#6b7280") }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  margin: "0 12px",
                  borderRadius: 999,
                  background: done ? "#111827" : (dark ? "#334155" : "#e5e7eb"),
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ItemEditor({
  item,
  dark,
  categoryOptions,
  inventoryItems,
  onUpdate,
  onRemove,
  onAddGroup,
  onRemoveGroup,
  onUpdateGroup,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
  onAddIngredient,
  onRemoveIngredient,
}) {
  const NEW_CATEGORY_VALUE = "__new_category__";
  const textMain = dark ? "#f8fafc" : "#111827";
  const textMuted = dark ? "#94a3b8" : "#6b7280";
  const border = dark ? "rgba(255,255,255,0.12)" : "#e5e7eb";
  const surface = dark ? "#111827" : "#ffffff";
  const soft = dark ? "#1f2937" : "#f9fafb";
  const isCustomCategory = item.categoryMode === "new" || (item.category && !categoryOptions.includes(item.category));

  const availableIngredients = inventoryItems.filter(
    (inv) => !item.ingredients.some((it) => it.inventoryId === inv._id)
  );

  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 12, alignItems: "start" }}>
        <label style={{ cursor: "pointer" }}>
          <div
            style={{
              width: 80,
              height: 72,
              borderRadius: 10,
              border: `1.5px dashed ${dark ? "#475569" : "#d1d5db"}`,
              background: soft,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {item.image ? (
              <img src={URL.createObjectURL(item.image)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 22 }}>📷</span>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => onUpdate(item.id, "image", e.target.files?.[0] || null)}
          />
        </label>

        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 8, marginBottom: 8 }}>
            <input className="input" value={item.name} onChange={(e) => onUpdate(item.id, "name", e.target.value)} placeholder="Food name *" />
            {categoryOptions.length > 0 ? (
              <select
                className="select"
                value={isCustomCategory ? NEW_CATEGORY_VALUE : item.category}
                onChange={(e) => {
                  if (e.target.value === NEW_CATEGORY_VALUE) {
                    onUpdate(item.id, "categoryMode", "new");
                    onUpdate(item.id, "category", "");
                    return;
                  }
                  onUpdate(item.id, "categoryMode", "existing");
                  onUpdate(item.id, "category", e.target.value);
                }}
              >
                <option value="">Select category *</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value={NEW_CATEGORY_VALUE}>+ Add new category</option>
              </select>
            ) : (
              <input className="input" value={item.category} onChange={(e) => onUpdate(item.id, "category", e.target.value)} placeholder="Category *" />
            )}
            <input className="input" type="number" min="0" step="0.01" value={item.price} onChange={(e) => onUpdate(item.id, "price", e.target.value)} placeholder="Price (AED) *" />
          </div>

          {categoryOptions.length > 0 && isCustomCategory && (
            <div style={{ marginBottom: 8 }}>
              <input
                className="input"
                value={item.category}
                onChange={(e) => onUpdate(item.id, "category", e.target.value)}
                placeholder="Type new category name"
              />
            </div>
          )}

          <textarea
            className="textarea"
            value={item.description}
            onChange={(e) => onUpdate(item.id, "description", e.target.value)}
            placeholder="Description *"
            style={{ minHeight: 70, resize: "vertical" }}
          />

          <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: dark ? "#0f172a" : "#f8fafc", border: `1px solid ${border}` }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: textMain, marginBottom: 8 }}>Customizations</div>
            {item.customizations.length === 0 && <div style={{ fontSize: 12, color: textMuted }}>No customization groups yet.</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {item.customizations.map((group) => (
                <div key={group.id} style={{ background: soft, border: `1px solid ${border}`, borderRadius: 10, padding: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <input
                      className="input"
                      value={group.title}
                      onChange={(e) => onUpdateGroup(item.id, group.id, "title", e.target.value)}
                      placeholder="Group title (e.g. Size)"
                    />
                    <label style={{ fontSize: 12, fontWeight: 700, color: textMuted, display: "flex", gap: 4, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={group.required}
                        onChange={(e) => onUpdateGroup(item.id, group.id, "required", e.target.checked)}
                      />
                      Required
                    </label>
                    <label style={{ fontSize: 12, fontWeight: 700, color: textMuted, display: "flex", gap: 4, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={group.multiSelect}
                        onChange={(e) => onUpdateGroup(item.id, group.id, "multiSelect", e.target.checked)}
                      />
                      Multi
                    </label>
                    <button
                      type="button"
                      onClick={() => onRemoveGroup(item.id, group.id)}
                      style={{ border: `1px solid ${dark ? "#7f1d1d" : "#fecaca"}`, background: dark ? "rgba(127,29,29,0.18)" : "#fef2f2", color: "#dc2626", borderRadius: 8, padding: "6px 8px", fontWeight: 700, cursor: "pointer" }}
                    >
                      Remove
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {group.options.map((opt) => (
                      <div key={opt.id} style={{ display: "grid", gridTemplateColumns: "1fr 130px auto", gap: 8 }}>
                        <input
                          className="input"
                          value={opt.label}
                          onChange={(e) => onUpdateOption(item.id, group.id, opt.id, "label", e.target.value)}
                          placeholder="Option label"
                        />
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={opt.extraPrice}
                          onChange={(e) => onUpdateOption(item.id, group.id, opt.id, "extraPrice", e.target.value)}
                          placeholder="Extra AED"
                        />
                        <button
                          type="button"
                          onClick={() => onRemoveOption(item.id, group.id, opt.id)}
                          disabled={group.options.length === 1}
                          style={{ border: `1px solid ${border}`, background: surface, color: "#ef4444", borderRadius: 8, padding: "6px 8px", fontWeight: 700, cursor: group.options.length === 1 ? "not-allowed" : "pointer", opacity: group.options.length === 1 ? 0.5 : 1 }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => onAddOption(item.id, group.id)}
                    style={{ marginTop: 8, border: `1px solid ${border}`, background: surface, color: textMain, borderRadius: 8, padding: "6px 10px", fontWeight: 700, cursor: "pointer" }}
                  >
                    + Add Option
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onAddGroup(item.id)}
              style={{ marginTop: 8, border: `1px solid ${border}`, background: surface, color: textMain, borderRadius: 8, padding: "7px 12px", fontWeight: 800, cursor: "pointer" }}
            >
              + Add Customization Group
            </button>
          </div>

          {inventoryItems.length > 0 && (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: dark ? "rgba(22,163,74,0.16)" : "#f0fdf4", border: `1px solid ${dark ? "rgba(134,239,172,0.4)" : "#bbf7d0"}` }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: dark ? "#86efac" : "#166534", marginBottom: 6 }}>
                Inventory Ingredients (Optional)
              </div>

              {item.ingredients.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  {item.ingredients.map((ing) => (
                    <div key={ing.inventoryId} style={{ fontSize: 12, background: dark ? "rgba(21, 128, 61, 0.15)" : "#f0fdf4", color: dark ? "#86efac" : "#166534", borderRadius: 10, padding: "6px 10px", display: "inline-flex", gap: 10, alignItems: "center", border: `1px solid ${dark ? "rgba(134,239,172,0.2)" : "#bbf7d0"}` }}>
                      <span style={{ fontWeight: 800 }}>{ing.itemName}</span>
                      <span style={{ opacity: 0.7 }}>{ing.quantityPerOrder} {ing.unit}</span>
                      <button 
                        type="button" 
                        onClick={() => onRemoveIngredient(item.id, ing.inventoryId)} 
                        style={{ border: "none", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: 6, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, fontWeight: 900 }}
                        title="Remove Ingredient"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <IngredientAdder item={item} available={availableIngredients} onAdd={onAddIngredient} dark={dark} />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          style={{ border: "none", background: "none", color: dark ? "#64748b" : "#9ca3af", fontSize: 20, cursor: "pointer", padding: "2px 6px" }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function IngredientAdder({ item, available, onAdd, dark }) {
  const [inventoryId, setInventoryId] = useState("");
  const [qty, setQty] = useState("1");

  const add = () => {
    if (!inventoryId) return;
    const quantity = Number(qty);
    if (!quantity || quantity <= 0) return;
    onAdd(item.id, inventoryId, quantity);
    setInventoryId("");
    setQty("1");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px auto", gap: 8 }}>
      <select className="select" value={inventoryId} onChange={(e) => setInventoryId(e.target.value)}>
        <option value="">Select ingredient</option>
        {available.map((inv) => (
          <option key={inv._id} value={inv._id}>
            {inv.itemName} ({inv.currentStock} {inv.unit})
          </option>
        ))}
      </select>
      <input className="input" type="number" min="0.01" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} />
      <button
        type="button"
        onClick={add}
        disabled={!inventoryId}
        style={{ border: "none", borderRadius: 10, background: inventoryId ? "#16a34a" : (dark ? "#334155" : "#e5e7eb"), color: inventoryId ? "#fff" : (dark ? "#94a3b8" : "#6b7280"), fontWeight: 800, padding: "0 12px", cursor: inventoryId ? "pointer" : "not-allowed" }}
      >
        Add
      </button>
    </div>
  );
}

export default function AddFood() {
  const { dark } = useTheme();
  const [step, setStep] = useState(0);
  const [items, setItems] = useState([makeItem()]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [existingCategories, setExistingCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadBootstrapData = async () => {
      try {
        const [inventoryRes, foodsRes] = await Promise.all([
          api.get("/api/inventory"),
          api.get("/api/restaurantadmin/foods"),
        ]);

        if (inventoryRes.data?.success && Array.isArray(inventoryRes.data.data)) {
          setInventoryItems(inventoryRes.data.data);
        }

        if (foodsRes.data?.success && Array.isArray(foodsRes.data.data)) {
          const cats = [...new Set(
            foodsRes.data.data
              .map((food) => (food?.category || "").trim())
              .filter(Boolean)
          )].sort((a, b) => a.localeCompare(b));
          setExistingCategories(cats);
        }
      } catch {
        setInventoryItems([]);
        setExistingCategories([]);
      }
    };
    loadBootstrapData();
  }, []);

  const updateItem = (id, key, value) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [key]: value } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, makeItem()]);
  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  const addGroup = (itemId) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, customizations: [...it.customizations, makeGroup()] } : it)));
  };

  const removeGroup = (itemId, groupId) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? { ...it, customizations: it.customizations.filter((g) => g.id !== groupId) }
          : it
      )
    );
  };

  const updateGroup = (itemId, groupId, key, value) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              customizations: it.customizations.map((g) => (g.id === groupId ? { ...g, [key]: value } : g)),
            }
          : it
      )
    );
  };

  const addOption = (itemId, groupId) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              customizations: it.customizations.map((g) =>
                g.id === groupId ? { ...g, options: [...g.options, makeOption()] } : g
              ),
            }
          : it
      )
    );
  };

  const removeOption = (itemId, groupId, optionId) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              customizations: it.customizations.map((g) => {
                if (g.id !== groupId) return g;
                if (g.options.length === 1) return g;
                return { ...g, options: g.options.filter((o) => o.id !== optionId) };
              }),
            }
          : it
      )
    );
  };

  const updateOption = (itemId, groupId, optionId, key, value) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              customizations: it.customizations.map((g) =>
                g.id === groupId
                  ? {
                      ...g,
                      options: g.options.map((o) => (o.id === optionId ? { ...o, [key]: value } : o)),
                    }
                  : g
              ),
            }
          : it
      )
    );
  };

  const addIngredient = (itemId, inventoryId, quantityPerOrder) => {
    const inv = inventoryItems.find((x) => x._id === inventoryId);
    if (!inv) return;

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        if (it.ingredients.some((ing) => ing.inventoryId === inventoryId)) return it;

        return {
          ...it,
          ingredients: [
            ...it.ingredients,
            {
              inventoryId: inv._id,
              itemName: inv.itemName,
              unit: inv.unit,
              quantityPerOrder,
            },
          ],
        };
      })
    );
  };

  const removeIngredient = (itemId, inventoryId) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? { ...it, ingredients: it.ingredients.filter((ing) => ing.inventoryId !== inventoryId) }
          : it
      )
    );
  };

  const normalizedItems = useMemo(
    () =>
      items.map((it) => {
        const customizations = it.customizations
          .filter((g) => g.title.trim() && g.options.some((o) => o.label.trim()))
          .map((g) => ({
            title: g.title.trim(),
            required: !!g.required,
            multiSelect: !!g.multiSelect,
            options: g.options
              .filter((o) => o.label.trim())
              .map((o) => ({ label: o.label.trim(), extraPrice: Number(o.extraPrice) || 0 })),
          }))
          .filter((g) => g.options.length > 0);

        return {
          ...it,
          name: it.name.trim(),
          category: it.category.trim(),
          description: it.description.trim() || it.name.trim(),
          priceNum: Number(it.price),
          customizations,
        };
      }),
    [items]
  );

  const categories = useMemo(
    () => [...new Set(normalizedItems.map((it) => it.category).filter(Boolean))],
    [normalizedItems]
  );

  const categoryOptions = useMemo(
    () => [...new Set([...existingCategories, ...categories])],
    [existingCategories, categories]
  );

  const validCount = normalizedItems.filter(
    (it) => it.name && it.category && it.image && Number.isFinite(it.priceNum) && it.priceNum > 0
  ).length;

  const moveToReview = () => {
    if (validCount === 0) {
      alert("Add at least 1 complete food item first (name, category, price, description, image).");
      return;
    }
    setStep(1);
  };

  const uploadAll = async () => {
    const pending = normalizedItems.filter((it) => it.status !== "success");
    const invalid = pending.filter(
      (it) => !it.name || !it.category || !it.image || !Number.isFinite(it.priceNum) || it.priceNum <= 0
    );

    if (invalid.length) {
      alert(`${invalid.length} item(s) are incomplete. Please go back and fill required fields.`);
      return;
    }

    setSubmitting(true);

    for (const item of pending) {
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: "uploading", error: "" } : it)));

      try {
        const form = new FormData();
        form.append("name", item.name);
        form.append("category", item.category);
        form.append("price", String(item.priceNum));
        form.append("description", item.description);
        form.append("image", item.image);
        form.append("customizations", JSON.stringify(item.customizations));

        const res = await api.post("/api/restaurantadmin/food/add", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (!res.data?.success) {
          throw new Error(res.data?.message || "Upload failed");
        }

        const foodId = res.data?.data?._id;
        if (foodId && item.ingredients.length > 0) {
          try {
            await api.post("/api/inventory/link-sync", {
              foodId,
              ingredients: item.ingredients.map(ing => ({
                inventoryId: ing.inventoryId,
                quantityPerOrder: ing.quantityPerOrder
              }))
            });
          } catch (syncErr) {
            console.error("Ingredient sync failed for item:", item.name, syncErr);
            // We still consider the food upload a success, but log the sync error
          }
        }

        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: "success", error: "" } : it)));
      } catch (error) {
        const msg = error?.response?.data?.message || error?.message || "Network error";
        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: "error", error: msg } : it)));
      }
    }

    setSubmitting(false);
    // Note: step 2 (success view) is handled automatically by checking all items status
  };

  const successCount = items.filter((it) => it.status === "success").length;
  const errorCount = items.filter((it) => it.status === "error").length;
  const pendingCount = items.filter((it) => it.status === "idle").length;

  useEffect(() => {
    if (step === 1 && items.length > 0 && items.every(it => it.status === 'success')) {
       setStep(2);
    }
  }, [items, step]);

  const textMain = dark ? "#f8fafc" : "#111827";
  const textMuted = dark ? "#94a3b8" : "#6b7280";
  const border = dark ? "rgba(255,255,255,0.12)" : "#e5e7eb";
  const surface = dark ? "#111827" : "#ffffff";

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 40 }}>
        {/* Title Section */}
        <div style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: "-0.5px", color: textMain }}>Add Food</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: textMuted }}>
            Add food first, then review and upload.
          </p>
        </div>

        {/* Content Section */}
        <div style={{ marginTop: 18 }}>
          <Stepper step={step} dark={dark} />

          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map((item) => (
                <ItemEditor
                   key={item.id}
                   item={item}
                   dark={dark}
                   categoryOptions={categoryOptions}
                   inventoryItems={inventoryItems}
                   onUpdate={updateItem}
                   onRemove={removeItem}
                   onAddGroup={addGroup}
                   onRemoveGroup={removeGroup}
                   onUpdateGroup={updateGroup}
                   onAddOption={addOption}
                   onRemoveOption={removeOption}
                   onUpdateOption={updateOption}
                   onAddIngredient={addIngredient}
                   onRemoveIngredient={removeIngredient}
                />
              ))}

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={addItem}
                  style={{ border: `1px dashed ${dark ? "#475569" : "#cbd5e1"}`, borderRadius: 12, background: surface, color: textMain, padding: "11px 18px", fontWeight: 800, cursor: "pointer" }}
                >
                  + Add Another Food
                </button>

                <button
                  type="button"
                  onClick={moveToReview}
                  disabled={validCount === 0}
                  style={{ border: "none", borderRadius: 12, background: validCount === 0 ? (dark ? "#334155" : "#e5e7eb") : "linear-gradient(135deg,#ff4e2a,#ff6a3d)", color: validCount === 0 ? (dark ? "#94a3b8" : "#6b7280") : "#fff", padding: "11px 24px", fontWeight: 900, cursor: validCount === 0 ? "not-allowed" : "pointer" }}
                >
                  Review {validCount} Item{validCount !== 1 ? "s" : ""} →
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, marginBottom: 14 }}>
                <div style={{ background: dark ? "#1e293b" : "#f9fafb", border: `1px solid ${border}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: textMain }}>{pendingCount}</div>
                  <div style={{ fontSize: 12, color: textMuted, fontWeight: 700 }}>Pending</div>
                </div>
                <div style={{ background: dark ? "rgba(22,163,74,0.2)" : "#f0fdf4", border: `1px solid ${dark ? "rgba(134,239,172,0.4)" : "#bbf7d0"}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: dark ? "#bbf7d0" : "#166534" }}>{successCount}</div>
                  <div style={{ fontSize: 12, color: dark ? "#bbf7d0" : "#166534", fontWeight: 700 }}>Uploaded</div>
                </div>
                <div style={{ background: dark ? "rgba(127,29,29,0.2)" : "#fef2f2", border: `1px solid ${dark ? "rgba(252,165,165,0.4)" : "#fecaca"}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: dark ? "#fca5a5" : "#991b1b" }}>{errorCount}</div>
                  <div style={{ fontSize: 12, color: dark ? "#fca5a5" : "#991b1b", fontWeight: 700 }}>Failed</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {items.map((item) => {
                  const statusColor =
                    item.status === "success"
                      ? (dark ? "#86efac" : "#166534")
                      : item.status === "error"
                      ? (dark ? "#fca5a5" : "#991b1b")
                      : item.status === "uploading"
                      ? (dark ? "#93c5fd" : "#1d4ed8")
                      : textMuted;

                  return (
                    <div key={item.id} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                      {item.image ? (
                        <img src={URL.createObjectURL(item.image)} alt="" style={{ width: 44, height: 40, borderRadius: 8, objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 44, height: 40, borderRadius: 8, background: dark ? "#334155" : "#f3f4f6", display: "grid", placeItems: "center" }}>📷</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: textMain }}>{item.name || "Untitled"}</div>
                        <div style={{ fontSize: 12, color: textMuted }}>
                          {item.category || "No category"} · AED {item.price || "0"}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: statusColor }}>
                        {item.status === "idle" && "Pending"}
                        {item.status === "uploading" && "Uploading..."}
                        {item.status === "success" && "Done"}
                        {item.status === "error" && `Error: ${item.error || "Upload failed"}`}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  disabled={submitting}
                  style={{ border: `1px solid ${border}`, borderRadius: 12, background: surface, color: textMain, padding: "11px 18px", fontWeight: 800, cursor: submitting ? "not-allowed" : "pointer" }}
                >
                  ← Back to Edit
                </button>

                <button
                  type="button"
                  onClick={uploadAll}
                  disabled={submitting || items.length === 0}
                  style={{ border: "none", borderRadius: 12, background: submitting || items.length === 0 ? (dark ? "#334155" : "#9ca3af") : "linear-gradient(135deg,#ff4e2a,#ff6a3d)", color: "#fff", padding: "11px 24px", fontWeight: 900, cursor: submitting || items.length === 0 ? "not-allowed" : "pointer" }}
                >
                  {submitting ? "Uploading..." : `Upload ${items.length} Item${items.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 24, padding: 60, textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.1)" }}>
              <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
              <h2 style={{ fontSize: 32, fontWeight: 950, color: textMain, marginBottom: 12 }}>Items Saved Successfully!</h2>
              <p style={{ fontSize: 16, color: textMuted, marginBottom: 40, maxWidth: 450, margin: "0 auto 40px" }}>
                Your {successCount} new menu items have been added and are now live on your storefront.
              </p>
              <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
                <button 
                  onClick={() => { setStep(0); setItems([makeItem()]); }}
                  style={{ padding: "14px 28px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#ff4e2a,#ff6a3d)", color: "#fff", fontWeight: 900, cursor: "pointer", boxShadow: "0 10px 20px rgba(255,78,42,0.2)" }}
                >
                  + Add More Food
                </button>
                <a href="/menu" style={{ padding: "14px 28px", borderRadius: 12, border: `1.5px solid ${border}`, background: surface, color: textMain, fontWeight: 900, textDecoration: "none", display: "flex", alignItems: "center" }}>
                  View Menu →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </RestaurantLayout>
  );
}
