// restaurant-admin/src/Pages/EditFood.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import RestaurantLayout from "../components/RestaurantLayout";
import { api, BASE_URL } from "../utils/api";

export default function EditFood() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [currentImage, setCurrentImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [categorySuggestions, setCategorySuggestions] = useState([]);

  // ✅ Customizations state
  const [customizations, setCustomizations] = useState([]);

  const previewUrl = useMemo(() => {
    if (!image) return "";
    return URL.createObjectURL(image);
  }, [image]);

  useEffect(() => {
    const loadFood = async () => {
      try {
        const res = await api.get("/api/restaurantadmin/foods");
        if (res.data?.success && Array.isArray(res.data.data)) {
          const food = res.data.data.find((f) => f._id === id);
          if (!food) {
            alert("Item not found");
            navigate("/menu");
            return;
          }
          setName(food.name || "");
          setCategory(food.category || "");
          setPrice(food.price || "");
          setDescription(food.description || "");
          setCurrentImage(food.image || "");
          // ✅ Load existing customizations
          setCustomizations(food.customizations || []);
        } else {
          alert(res.data?.message || "Failed to load item");
          navigate("/menu");
        }
      } catch (err) {
        alert(err?.response?.data?.message || "Failed to load item");
        navigate("/menu");
      }
    };
    loadFood();

    const loadCategories = async () => {
      try {
        const res = await api.get("/api/food/list/public");
        if (res.data?.success && Array.isArray(res.data.data)) {
          const uniqueCats = Array.from(
            new Set(
              res.data.data
                .map((f) => f.category)
                .filter((c) => typeof c === "string" && c.trim().length > 0)
            )
          );
          setCategorySuggestions(uniqueCats);
        }
      } catch { }
    };
    loadCategories();
  }, [id, navigate]);

  // ── Customization helpers ────────────────────────────────────────────────
  const addGroup = () => {
    setCustomizations((prev) => [
      ...prev,
      { title: "", required: false, multiSelect: false, options: [{ label: "", extraPrice: 0 }] },
    ]);
  };

  const updateGroup = (gi, field, value) => {
    setCustomizations((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, [field]: value } : g))
    );
  };

  const removeGroup = (gi) => {
    setCustomizations((prev) => prev.filter((_, i) => i !== gi));
  };

  const addOption = (gi) => {
    setCustomizations((prev) =>
      prev.map((g, i) =>
        i === gi ? { ...g, options: [...g.options, { label: "", extraPrice: 0 }] } : g
      )
    );
  };

  const updateOption = (gi, oi, field, value) => {
    setCustomizations((prev) =>
      prev.map((g, i) =>
        i === gi
          ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, [field]: value } : o)) }
          : g
      )
    );
  };

  const removeOption = (gi, oi) => {
    setCustomizations((prev) =>
      prev.map((g, i) =>
        i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g
      )
    );
  };
  // ────────────────────────────────────────────────────────────────────────

  const submit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const form = new FormData();
      form.append("id", id);
      form.append("name", name);
      form.append("category", category);
      form.append("price", price);
      form.append("description", description);
      if (image) form.append("image", image);
      // ✅ Append updated customizations
      form.append("customizations", JSON.stringify(customizations));

      const res = await api.post("/api/food/edit", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!res.data?.success) {
        alert(res.data?.message || "Failed to update food");
        return;
      }

      alert("✅ Food updated");
      navigate("/menu");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update food");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RestaurantLayout>
      <h2 className="page-title">Edit Food</h2>

      <div className="card form-card">
        <form onSubmit={submit}>
          <div className="form-grid">
            {/* Name */}
            <div className="field">
              <div className="label">Food Name</div>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chicken Burger"
                required
              />
            </div>

            {/* Category */}
            <div className="field">
              <div className="label">Category</div>
              <input
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Burgers"
                list="category-suggestions-edit"
                required
              />
              {categorySuggestions.length > 0 && (
                <datalist id="category-suggestions-edit">
                  {categorySuggestions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              )}
            </div>

            {/* Price */}
            <div className="field">
              <div className="label">Price (AED)</div>
              <input
                className="input"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 25"
                required
              />
            </div>

            {/* Image */}
            <div className="field">
              <div className="label">Image</div>
              <div className="file-wrap">
                <label className="file-btn">
                  Choose New Image
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => setImage(e.target.files?.[0] || null)}
                  />
                </label>
                <div className="file-name">
                  {image ? image.name : currentImage ? `Current: ${currentImage}` : "No file chosen"}
                </div>
              </div>
              {(previewUrl || currentImage) && (
                <div className="preview">
                  <img
                    src={previewUrl || `${BASE_URL}/images/${currentImage}`}
                    alt="preview"
                  />
                </div>
              )}
            </div>

            {/* Description */}
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <div className="label">Description</div>
              <textarea
                className="textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a short description..."
                required
              />
            </div>

            {/* ✅ CUSTOMIZATIONS SECTION */}
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <div className="label" style={{ marginBottom: 12 }}>
                Customizations{" "}
                <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 12 }}>
                  (optional — e.g. Size, Extras, Spice level)
                </span>
              </div>

              {customizations.map((group, gi) => (
                <div
                  key={gi}
                  style={{
                    border: "1.5px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 16,
                    marginBottom: 14,
                    background: "#f9fafb",
                  }}
                >
                  {/* Group header */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      className="input"
                      placeholder='Group title e.g. "Size"'
                      value={group.title}
                      onChange={(e) => updateGroup(gi, "title", e.target.value)}
                      style={{ flex: 1, minWidth: 140 }}
                    />
                    <label style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={group.required}
                        onChange={(e) => updateGroup(gi, "required", e.target.checked)}
                        style={{ width: 15, height: 15 }}
                      />
                      Required
                    </label>
                    <label style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={group.multiSelect}
                        onChange={(e) => updateGroup(gi, "multiSelect", e.target.checked)}
                        style={{ width: 15, height: 15 }}
                      />
                      Multi-select
                    </label>
                    <button
                      type="button"
                      onClick={() => removeGroup(gi)}
                      style={{ background: "#fff1f1", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
                    >
                      Remove Group
                    </button>
                  </div>

                  {/* Options */}
                  {group.options.map((opt, oi) => (
                    <div key={oi} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                      <input
                        className="input"
                        placeholder='Option e.g. "Large"'
                        value={opt.label}
                        onChange={(e) => updateOption(gi, oi, "label", e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <div style={{ position: "relative", width: 110 }}>
                        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#9ca3af", pointerEvents: "none" }}>
                          +AED
                        </span>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={opt.extraPrice === 0 ? '' : opt.extraPrice}
                          onChange={(e) => updateOption(gi, oi, "extraPrice", e.target.value === '' ? 0 : Number(e.target.value))}
                          style={{ paddingLeft: 42, width: "100%" }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOption(gi, oi)}
                        disabled={group.options.length === 1}
                        style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, color: "#ef4444", cursor: "pointer", padding: "6px 10px", fontWeight: 700, fontSize: 16, opacity: group.options.length === 1 ? 0.3 : 1 }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => addOption(gi)}
                    style={{ fontSize: 13, padding: "7px 14px", marginTop: 4 }}
                  >
                    + Add Option
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="btn btn-outline"
                onClick={addGroup}
                style={{ fontSize: 13, padding: "9px 18px" }}
              >
                + Add Customization Group
              </button>
            </div>
            {/* END CUSTOMIZATIONS */}
          </div>

          <div className="actions" style={{ marginTop: 16 }}>
            <button className="btn" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate("/menu")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </RestaurantLayout>
  );
}