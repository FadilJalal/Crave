import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { toast } from "react-toastify";
import { BACKEND_URL } from "../config";

const DEFAULT_PLANS = {
  basic: { name: "Basic", price: 299, color: "#3b82f6", bg: "#eff6ff" },
  enterprise: { name: "Enterprise", price: 599, color: "#f59e0b", bg: "#fff7ed" },
};

const PLAN_THEME = {
  basic: { color: "#3b82f6", bg: "#eff6ff" },
  enterprise: { color: "#f59e0b", bg: "#fff7ed" },
};

const PLAN_ALIASES = {
  starter: "basic",
  professional: "enterprise",
  pro: "enterprise",
};

const normalizePlan = (plan) => PLAN_ALIASES[String(plan || "").toLowerCase()] || String(plan || "").toLowerCase();

const formatFeatureLabel = (key) =>
  String(key || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (s) => s.toUpperCase());

const STATUS_STYLE = {
  active:    { bg: "#f0fdf4", color: "#15803d", label: "Active" },
  trial:     { bg: "#eff6ff", color: "#1d4ed8", label: "Trial" },
  expired:   { bg: "#fef2f2", color: "#dc2626", label: "Expired" },
  cancelled: { bg: "#f9fafb", color: "#6b7280", label: "Cancelled" },
};

export default function Subscriptions() {
  const [data, setData]         = useState([]);
  const [stats, setStats]       = useState({});
  const [loading, setLoading]   = useState(false);
  const [plans, setPlans]       = useState(DEFAULT_PLANS);
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState({ plan: "basic", months: "1", notes: "" });
  const [saving, setSaving]     = useState(false);
  const [filter, setFilter]     = useState("all");
  const [editingPlanKey, setEditingPlanKey] = useState(null);
  const [editingPlanForm, setEditingPlanForm] = useState({ name: "", price: 0, description: "", features: {} });
  const [savingPlan, setSavingPlan] = useState(false);
  const [newFeatureKey, setNewFeatureKey] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/subscription/list");
      if (res.data.success) {
        setData(res.data.data);
        setStats({ mrr: res.data.mrr, activeCount: res.data.activeCount, trialCount: res.data.trialCount, expiringSoon: res.data.expiringSoon });
      }
    } catch { toast.error("Failed to load subscriptions"); }
    finally { setLoading(false); }
  };

  const checkExpired = async () => {
    try { await api.post("/api/subscription/check-expired"); fetchData(); } catch {}
  };

  const loadPlans = async () => {
    try {
      const res = await api.get("/api/subscription/plans");
      if (res.data?.success && res.data?.data) {
        setPlans({
          basic: { ...PLAN_THEME.basic, ...res.data.data.basic },
          enterprise: { ...PLAN_THEME.enterprise, ...res.data.data.enterprise },
        });
      }
    } catch {
      // Keep defaults if API fails.
    }
  };

  useEffect(() => { fetchData(); checkExpired(); loadPlans(); }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post("/api/subscription/assign", {
        restaurantId: selected._id,
        ...form,
        plan: normalizePlan(form.plan),
      });
      if (res.data.success) { toast.success(res.data.message); setSelected(null); fetchData(); }
      else toast.error(res.data.message);
    } catch { toast.error("Error assigning plan"); }
    finally { setSaving(false); }
  };

  const handleCancel = async (id, name) => {
    if (!confirm(`Cancel subscription for ${name}? This will deactivate the restaurant.`)) return;
    try {
      const res = await api.post("/api/subscription/cancel", { restaurantId: id });
      if (res.data.success) { toast.success("Subscription cancelled"); fetchData(); }
    } catch { toast.error("Error cancelling"); }
  };

  const openPlanEditor = (planKey) => {
    const key = normalizePlan(planKey);
    const source = plans[key];
    if (!source) return;
    setEditingPlanKey(key);
    setEditingPlanForm({
      name: source.name || "",
      price: Number(source.price || 0),
      description: source.description || "",
      features: { ...(source.features || {}) },
    });
    setNewFeatureKey("");
  };

  const toggleFeature = (featureKey) => {
    setEditingPlanForm((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [featureKey]: !prev.features[featureKey],
      },
    }));
  };

  const addFeatureToEditor = () => {
    const key = String(newFeatureKey || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "");
    if (!key) return;
    setEditingPlanForm((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: prev.features[key] ?? true,
      },
    }));
    setNewFeatureKey("");
  };

  const savePlanConfig = async () => {
    if (!editingPlanKey) return;
    setSavingPlan(true);
    try {
      const payload = {
        name: editingPlanForm.name,
        price: Number(editingPlanForm.price || 0),
        description: editingPlanForm.description,
        features: editingPlanForm.features,
      };
      const res = await api.put(`/api/subscription/plans/${editingPlanKey}`, payload);
      if (!res.data?.success) {
        toast.error(res.data?.message || "Failed to update plan");
        return;
      }
      const planData = res.data?.data;
      if (planData?.basic && planData?.enterprise) {
        setPlans({
          basic: { ...PLAN_THEME.basic, ...planData.basic },
          enterprise: { ...PLAN_THEME.enterprise, ...planData.enterprise },
        });
      } else {
        await loadPlans();
      }
      toast.success("Plan card updated");
      setEditingPlanKey(null);
    } catch {
      toast.error("Failed to update plan");
    } finally {
      setSavingPlan(false);
    }
  };

  const filtered = filter === "all" ? data : data.filter(r =>
    r.status === filter || (filter === "expiring" && r.expiringSoon)
  );

  const inp = { padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box", background: "white" };
  const lbl = { fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 6 };
  const selectedPlanInfo = plans[form.plan];
  const selectedCurrentPlan = selected ? plans[normalizePlan(selected.plan)] : null;

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Subscriptions</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>Manage restaurant plans and billing</p>
        </div>
        <button onClick={fetchData} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "white", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
          ↻ Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Monthly Revenue",  value: `AED ${(stats.mrr || 0).toLocaleString()}`, color: "#15803d", bg: "#f0fdf4" },
          { label: "Active Plans",     value: stats.activeCount  || 0, color: "#1d4ed8", bg: "#eff6ff" },
          { label: "On Trial",         value: stats.trialCount   || 0, color: "#92400e", bg: "#fffbeb" },
          { label: "Expiring Soon",    value: stats.expiringSoon || 0, color: "#dc2626", bg: "#fef2f2" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: "16px 18px", border: `1px solid ${s.color}22` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Plan reference */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {Object.entries(plans).map(([key, p]) => (
          <div key={key} style={{ background: p.bg, border: `1px solid ${p.color}33`, borderRadius: 12, padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: p.color }}>{p.name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: p.color }}>AED {p.price}/mo</span>
            </div>
            <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 8 }}>{p.description || "No description"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {Object.entries(p.features || {}).slice(0, 8).map(([featureKey, enabled]) => (
                <span key={featureKey} style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 8px", background: enabled ? "#ecfdf5" : "#f3f4f6", color: enabled ? "#047857" : "#6b7280" }}>
                  {enabled ? "✓" : "—"} {formatFeatureLabel(featureKey)}
                </span>
              ))}
            </div>
            <button
              onClick={() => openPlanEditor(key)}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${p.color}66`, background: "white", color: p.color, cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: "inherit" }}
            >
              Edit Card
            </button>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "active", "trial", "expiring", "expired", "cancelled"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${filter === f ? "#111827" : "var(--border)"}`, background: filter === f ? "#111827" : "white", color: filter === f ? "white" : "var(--muted)" }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Restaurant list */}
      {loading && <div style={{ opacity: 0.5, fontSize: 14 }}>Loading...</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(r => {
          const st   = STATUS_STYLE[r.isExpired ? "expired" : r.status] || STATUS_STYLE.trial;
          const plan = plans[normalizePlan(r.plan)];
          return (
            <div key={r._id} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {r.logo
                ? <img src={`${BACKEND_URL}/images/${r.logo}`} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                : <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🍽️</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {r.expiresAt ? `Expires ${new Date(r.expiresAt).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" })}` : "No expiry set"}
                  {r.expiringSoon && !r.isExpired && <span style={{ color: "#dc2626", fontWeight: 700 }}> · ⚠️ {r.daysLeft}d left</span>}
                  {r.isExpired && <span style={{ color: "#dc2626", fontWeight: 700 }}> · Expired</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {plan && (
                  <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: plan.bg, color: plan.color }}>
                    {plan.name} · AED {plan.price}/mo
                  </span>
                )}
                <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: st.bg, color: st.color }}>
                  {st.label}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { const planKey = normalizePlan(r.plan); setSelected(r); setForm({ plan: planKey && plans[planKey] ? planKey : "basic", months: "1", notes: r.notes || "" }); }}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#111827", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
                  Edit Subscription
                </button>
                {r.status === "active" && (
                  <button onClick={() => handleCancel(r._id, r.name)}
                    style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)", background: "white", border: "1px solid var(--border)", borderRadius: 14 }}>
            No restaurants match this filter.
          </div>
        )}
      </div>

      {/* Assign plan modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }} onClick={() => setSelected(null)}>
          <div style={{ background: "white", borderRadius: 20, padding: 28, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>Edit Subscription</h2>
            <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 14 }}>{selected.name}</p>

            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Current Subscription</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>
                  {selectedCurrentPlan ? `${selectedCurrentPlan.name} · AED ${selectedCurrentPlan.price}/mo` : "No active plan"}
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: (STATUS_STYLE[selected.status] || STATUS_STYLE.trial).bg, color: (STATUS_STYLE[selected.status] || STATUS_STYLE.trial).color }}>
                  {(STATUS_STYLE[selected.status] || STATUS_STYLE.trial).label}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {Object.entries(plans).map(([key, p]) => {
                const isActive = form.plan === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, plan: key }))}
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${isActive ? p.color : "#e5e7eb"}`,
                      background: isActive ? p.bg : "#ffffff",
                      padding: "10px 12px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: p.color }}>{p.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#4b5563", marginTop: 2 }}>AED {p.price}/month</div>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleAssign}>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Plan</label>
                <select style={inp} value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}>
                  {Object.entries(plans).map(([key, p]) => (
                    <option key={key} value={key}>{p.name} — AED {p.price}/mo</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Duration (months)</label>
                <select style={inp} value={form.months} onChange={e => setForm(p => ({ ...p, months: e.target.value }))}>
                  {[1, 2, 3, 6, 12].map(m => (
                    <option key={m} value={m}>{m} month{m > 1 ? "s" : ""} — AED {(selectedPlanInfo?.price || 0) * m}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Notes (optional)</label>
                <input style={inp} placeholder="e.g. Paid via bank transfer" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 14px", marginBottom: 20, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ color: "var(--muted)" }}>Plan</span><span style={{ fontWeight: 700 }}>{selectedPlanInfo?.name}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ color: "var(--muted)" }}>Duration</span><span style={{ fontWeight: 700 }}>{form.months} month(s)</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e5e7eb", paddingTop: 8, marginTop: 4 }}>
                  <span style={{ fontWeight: 700 }}>Total</span>
                  <span style={{ fontWeight: 900, color: "#111827" }}>AED {(selectedPlanInfo?.price || 0) * Number(form.months)}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setSelected(null)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid var(--border)", background: "white", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: 12, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#ff4e2a,#ff6a3d)", color: "white", cursor: "pointer", fontWeight: 800, fontFamily: "inherit", fontSize: 14 }}>
                  {saving ? "Saving..." : "Save Subscription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan card editor modal */}
      {editingPlanKey && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setEditingPlanKey(null)}>
          <div style={{ background: "white", borderRadius: 20, padding: 24, width: 560, maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 900 }}>Edit Plan Card</h2>
            <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 13 }}>
              Update plan title, price, description, and feature toggles from here.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Plan Name</label>
                <input style={inp} value={editingPlanForm.name} onChange={(e) => setEditingPlanForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Monthly Price (AED)</label>
                <input type="number" min="0" style={inp} value={editingPlanForm.price} onChange={(e) => setEditingPlanForm((p) => ({ ...p, price: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Description</label>
              <input style={inp} value={editingPlanForm.description} onChange={(e) => setEditingPlanForm((p) => ({ ...p, description: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={lbl}>Features</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.entries(editingPlanForm.features || {}).map(([featureKey, enabled]) => (
                  <button
                    type="button"
                    key={featureKey}
                    onClick={() => toggleFeature(featureKey)}
                    style={{
                      border: `1px solid ${enabled ? "#10b981" : "#d1d5db"}`,
                      background: enabled ? "#ecfdf5" : "#f9fafb",
                      color: enabled ? "#047857" : "#6b7280",
                      borderRadius: 10,
                      padding: "8px 10px",
                      textAlign: "left",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {enabled ? "✓" : "—"} {formatFeatureLabel(featureKey)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                style={inp}
                placeholder="New feature key (e.g. tableReservations)"
                value={newFeatureKey}
                onChange={(e) => setNewFeatureKey(e.target.value)}
              />
              <button
                type="button"
                onClick={addFeatureToEditor}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "white", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}
              >
                Add
              </button>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => setEditingPlanKey(null)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid var(--border)", background: "white", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                Close
              </button>
              <button type="button" onClick={savePlanConfig} disabled={savingPlan} style={{ flex: 2, padding: 12, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#ff4e2a,#ff6a3d)", color: "white", cursor: "pointer", fontWeight: 800, fontFamily: "inherit", fontSize: 14 }}>
                {savingPlan ? "Saving..." : "Save Plan Card"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}