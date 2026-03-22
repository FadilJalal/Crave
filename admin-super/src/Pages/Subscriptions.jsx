import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { toast } from "react-toastify";
import { BACKEND_URL } from "../config";

const PLANS = {
  basic: { name: "Basic", price: 299, color: "#3b82f6", bg: "#eff6ff" },
  pro:   { name: "Pro",   price: 399, color: "#8b5cf6", bg: "#f5f3ff" },
};

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
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState({ plan: "basic", months: "1", notes: "" });
  const [saving, setSaving]     = useState(false);
  const [filter, setFilter]     = useState("all");

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

  useEffect(() => { fetchData(); checkExpired(); }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post("/api/subscription/assign", { restaurantId: selected._id, ...form });
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

  const filtered = filter === "all" ? data : data.filter(r =>
    r.status === filter || (filter === "expiring" && r.expiringSoon)
  );

  const inp = { padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box", background: "white" };
  const lbl = { fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 6 };
  const selectedPlanInfo = PLANS[form.plan];

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
        {Object.entries(PLANS).map(([key, p]) => (
          <div key={key} style={{ background: p.bg, border: `1px solid ${p.color}33`, borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: p.color }}>{p.name}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: p.color }}>AED {p.price}/mo</span>
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
          const plan = PLANS[r.plan];
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
                <button onClick={() => { setSelected(r); setForm({ plan: r.plan && PLANS[r.plan] ? r.plan : "basic", months: "1", notes: r.notes || "" }); }}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#111827", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
                  Assign Plan
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
            <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>Assign Plan</h2>
            <p style={{ margin: "0 0 20px", color: "var(--muted)", fontSize: 14 }}>{selected.name}</p>
            <form onSubmit={handleAssign}>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Plan</label>
                <select style={inp} value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}>
                  <option value="basic">Basic — AED 299/mo</option>
                  <option value="pro">Pro — AED 499/mo</option>
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
                  {saving ? "Assigning..." : "Assign Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}