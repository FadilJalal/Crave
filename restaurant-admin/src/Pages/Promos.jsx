import { useEffect, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { toast } from "react-toastify";

const empty = { code: "", type: "percent", value: "", minOrder: "", maxUses: "", expiresAt: "" };

export default function Promos() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(empty);
  const [creating, setCreating] = useState(false);

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/promo/list");
      if (res.data.success) setPromos(res.data.data);
    } catch { toast.error("Failed to load promo codes"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPromos(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post("/api/promo/create", form);
      if (res.data.success) { toast.success("Promo code created!"); setForm(empty); fetchPromos(); }
      else toast.error(res.data.message);
    } catch { toast.error("Error creating promo code"); }
    finally { setCreating(false); }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.post("/api/promo/toggle", { id });
      if (res.data.success) fetchPromos();
    } catch { toast.error("Error updating promo"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this promo code?")) return;
    try {
      await api.delete(`/api/promo/${id}`);
      toast.success("Promo deleted");
      fetchPromos();
    } catch { toast.error("Error deleting promo"); }
  };

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 900, padding: "0 4px" }}>
        <h1 style={{ marginTop: 0, fontSize: 24, fontWeight: 800 }}>Promo Codes</h1>
        <p style={{ color: "var(--muted)", marginTop: -12, marginBottom: 24, fontSize: 14 }}>
          Create discount codes for your customers. Codes are exclusive to your restaurant.
        </p>

        {/* Create form */}
        <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 18, padding: 24, marginBottom: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 800 }}>Create new promo code</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 6 }}>Code</label>
                <input
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}
                  placeholder="e.g. SAVE20"
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 6 }}>Discount type</label>
                <select
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14, fontFamily: "inherit", outline: "none", background: "white", boxSizing: "border-box" }}
                  value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="flat">Flat amount (AED)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 6 }}>
                  Value ({form.type === "percent" ? "%" : "AED"})
                </label>
                <input
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                  type="number" min="1"
                  placeholder={form.type === "percent" ? "e.g. 20" : "e.g. 15"}
                  value={form.value}
                  onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 6 }}>Min order (AED)</label>
                <input
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                  type="number" min="0"
                  placeholder="0 = no minimum"
                  value={form.minOrder}
                  onChange={e => setForm(p => ({ ...p, minOrder: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 6 }}>Max uses (blank = unlimited)</label>
                <input
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                  type="number" min="1"
                  placeholder="e.g. 100"
                  value={form.maxUses}
                  onChange={e => setForm(p => ({ ...p, maxUses: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 6 }}>Expiry date (blank = never)</label>
                <input
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              style={{ padding: "11px 28px", borderRadius: 50, background: "linear-gradient(135deg,#ff4e2a,#ff6a3d)", color: "white", border: "none", fontWeight: 800, cursor: "pointer", fontSize: 14, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(255,78,42,0.3)" }}
            >
              {creating ? "Creating..." : "Create Promo Code"}
            </button>
          </form>
        </div>

        {/* Promos list */}
        {loading && <div style={{ opacity: 0.5, fontSize: 14 }}>Loading...</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {promos.map(p => (
            <div key={p._id} style={{
              background: "white", border: "1px solid var(--border)", borderRadius: 14,
              padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)", opacity: p.isActive ? 1 : 0.55,
              transition: "opacity 0.2s"
            }}>
              <span style={{ fontWeight: 900, fontSize: 15, fontFamily: "monospace", minWidth: 110, letterSpacing: "0.04em" }}>{p.code}</span>

              <div style={{ flex: 1, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: p.type === "percent" ? "#eff6ff" : "#f0fdf4", color: p.type === "percent" ? "#1d4ed8" : "#15803d" }}>
                  {p.type === "percent" ? `${p.value}% off` : `AED ${p.value} off`}
                </span>
                {p.minOrder > 0 && <span style={{ fontSize: 12, color: "var(--muted)" }}>Min AED {p.minOrder}</span>}
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Used: {p.usedCount}{p.maxUses ? `/${p.maxUses}` : "x"}</span>
                {p.expiresAt && <span style={{ fontSize: 12, color: new Date(p.expiresAt) < new Date() ? "#dc2626" : "var(--muted)" }}>
                  {new Date(p.expiresAt) < new Date() ? "⚠️ Expired" : `Expires ${new Date(p.expiresAt).toLocaleDateString()}`}
                </span>}
              </div>

              <button
                onClick={() => handleToggle(p._id)}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "white", color: p.isActive ? "#15803d" : "#6b7280", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}
              >
                {p.isActive ? "✓ Active" : "Disabled"}
              </button>
              <button
                onClick={() => handleDelete(p._id)}
                style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}
              >
                Delete
              </button>
            </div>
          ))}
          {!loading && promos.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)", background: "white", border: "1px solid var(--border)", borderRadius: 14 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🏷️</div>
              <p style={{ fontWeight: 700, margin: 0 }}>No promo codes yet</p>
              <p style={{ fontSize: 13, margin: "6px 0 0" }}>Create your first code above to offer discounts to your customers.</p>
            </div>
          )}
        </div>
      </div>
    </RestaurantLayout>
  );
}