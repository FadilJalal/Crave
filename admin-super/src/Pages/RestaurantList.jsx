import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { BACKEND_URL } from "../config";
import { MapPin, Search, Power, Trash2, Clock, RefreshCcw, Utensils, Pencil, KeyRound } from "lucide-react";
import { api } from "../utils/api";

export default function RestaurantList() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading]         = useState(false);

  const [q, setQ]               = useState("");
  const [status, setStatus]     = useState("all");
  const [location, setLocation] = useState("all");

  const [editItem, setEditItem]       = useState(null);
  const [editLogo, setEditLogo]       = useState(null);
  const [editPreview, setEditPreview] = useState("");
  const [saving, setSaving]           = useState(false);

  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [resetting, setResetting]     = useState(false);

  const editModalRef  = useRef(null);
  const resetModalRef = useRef(null);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/restaurant/list`);
      if (res.data.success) setRestaurants(res.data.data || []);
      else toast.error(res.data.message || "Error fetching restaurants");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRestaurants(); }, []);

  const removeRestaurant = async (id) => {
    if (!window.confirm("Delete this restaurant? This cannot be undone.")) return;
    try {
      const res = await api.post(`${BACKEND_URL}/api/restaurant/remove`, { id });
      if (res.data.success) { toast.success("Restaurant removed"); fetchRestaurants(); }
      else toast.error(res.data.message);
    } catch { toast.error("Failed to remove"); }
  };

  const toggleActive = async (id) => {
    try {
      const res = await api.post(`${BACKEND_URL}/api/restaurant/toggle-active`, { id });
      if (res.data.success) { toast.success(res.data.message); fetchRestaurants(); }
      else toast.error(res.data.message);
    } catch { toast.error("Failed to update status"); }
  };

  const openEdit  = (r) => { setEditItem({ ...r }); setEditLogo(null); setEditPreview(""); };
  const closeEdit = () => { setEditItem(null); setEditLogo(null); setEditPreview(""); };

  const handleEditLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditLogo(file);
    setEditPreview(URL.createObjectURL(file));
  };

  const saveEdit = async () => {
    if (!editItem.name?.trim())    { toast.error("Name is required");    return; }
    if (!editItem.address?.trim()) { toast.error("Address is required"); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("id",          editItem._id);
      formData.append("name",        editItem.name);
      formData.append("email",       editItem.email);
      formData.append("address",     editItem.address);
      formData.append("avgPrepTime", editItem.avgPrepTime);
      if (editLogo) formData.append("logo", editLogo);

      const res = await api.post(`${BACKEND_URL}/api/restaurant/edit`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        toast.success("Restaurant updated!");
        setRestaurants((prev) => prev.map((r) => r._id === editItem._id ? res.data.data : r));
        closeEdit();
      } else {
        toast.error(res.data.message || "Failed to update");
      }
    } catch { toast.error("Failed to update restaurant"); }
    finally { setSaving(false); }
  };

  const openReset  = (r) => { setResetTarget(r); setNewPassword(""); setShowPass(false); };
  const closeReset = () => { setResetTarget(null); setNewPassword(""); };

  const submitReset = async () => {
    if (!newPassword.trim())      { toast.error("Enter a new password"); return; }
    if (newPassword.length < 6)   { toast.error("Password must be at least 6 characters"); return; }
    setResetting(true);
    try {
      const res = await api.post(`${BACKEND_URL}/api/restaurant/reset-password`, {
        id: resetTarget._id, newPassword,
      });
      if (res.data.success) { toast.success(res.data.message); closeReset(); }
      else toast.error(res.data.message || "Failed to reset password");
    } catch { toast.error("Failed to reset password"); }
    finally { setResetting(false); }
  };

  const locations = useMemo(() => {
    const set = new Set();
    restaurants.forEach((r) => {
      const addr = (r.address || "").split(",");
      const guess = (addr[addr.length - 1] || "").trim();
      if (guess) set.add(guess);
    });
    return ["all", ...Array.from(set)];
  }, [restaurants]);

  const filtered = useMemo(() => restaurants.filter((r) => {
    const matchesQ      = q ? `${r.name} ${r.email} ${r.address}`.toLowerCase().includes(q.toLowerCase()) : true;
    const matchesStatus = status === "all" ? true : status === "active" ? r.isActive : !r.isActive;
    const matchesLoc    = location === "all" ? true : r.address.includes(location);
    return matchesQ && matchesStatus && matchesLoc;
  }), [restaurants, q, status, location]);

  const handleEditBackdrop  = (e) => { if (editModalRef.current  && !editModalRef.current.contains(e.target))  closeEdit(); };
  const handleResetBackdrop = (e) => { if (resetModalRef.current && !resetModalRef.current.contains(e.target)) closeReset(); };

  return (
    <div style={s.container}>
      <div style={s.headerRow}>
        <div>
          <h1 style={s.h1}>Restaurant List</h1>
          <p style={s.sub}>Manage your restaurant partners.</p>
        </div>
        <button style={s.refreshBtn} onClick={fetchRestaurants} disabled={loading}>
          <RefreshCcw size={16} /> {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div style={s.filtersCard}>
        <div style={s.filtersGrid}>
          <div>
            <div style={s.label}>Search</div>
            <div style={s.searchBox}>
              <Search size={15} />
              <input style={s.searchInput} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, address..." />
            </div>
          </div>
          <div>
            <div style={s.label}>Status</div>
            <select style={s.select} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <div style={s.label}>Location</div>
            <select style={s.select} value={location} onChange={(e) => setLocation(e.target.value)}>
              {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
          <button style={s.clearBtn} onClick={() => { setQ(""); setStatus("all"); setLocation("all"); }}>Clear</button>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={s.table}>
          <div style={{ ...s.row, ...s.head }}>
            <div>RESTAURANT</div><div>ADDRESS</div><div>STATUS</div><div>PREP</div>
            <div style={{ textAlign: "right" }}>ACTIONS</div>
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}>No restaurants found.</div>
          )}

          {filtered.map((r) => (
            <div key={r._id} style={s.row}>
              <div style={s.nameCell}>
                <div style={s.logoWrapper}>
                  {r.logo ? (
                    <img src={`${BACKEND_URL}/images/${r.logo}`} alt={r.name} style={s.logoImg}
                      onError={(e) => { e.target.src = "https://via.placeholder.com/40?text=R"; }} />
                  ) : <Utensils size={20} color="#94a3b8" />}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: "#1e293b" }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{r.email}</div>
                </div>
              </div>

              <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={12} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.address}</span>
              </div>

              <div>
                <span style={{ ...s.badge, background: r.isActive ? "#e6fff5" : "#fff1f1", color: r.isActive ? "#00c853" : "#ff5252" }}>
                  {r.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>

              <div style={{ fontWeight: 700, fontSize: 14, color: "#475569", display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={14} /> {r.avgPrepTime}m
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button style={{ ...s.actionBtn, color: "#3b82f6" }} onClick={() => openEdit(r)} title="Edit"><Pencil size={17} /></button>
                <button style={{ ...s.actionBtn, color: "#f59e0b" }} onClick={() => openReset(r)} title="Reset password"><KeyRound size={17} /></button>
                <button style={{ ...s.actionBtn, color: r.isActive ? "#64748b" : "#ff4e2a" }} onClick={() => toggleActive(r._id)} title="Toggle"><Power size={17} /></button>
                <button style={{ ...s.actionBtn, color: "#ef4444" }} onClick={() => removeRestaurant(r._id)} title="Delete"><Trash2 size={17} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div style={s.overlay} onMouseDown={handleEditBackdrop}>
          <div style={s.modal} ref={editModalRef}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>✏️ Edit Restaurant</h3>
              <button style={s.closeBtn} onClick={closeEdit}>✕</button>
            </div>
            <div style={s.logoSection}>
              <div style={s.logoPreviewWrap}>
                {(editPreview || editItem.logo) ? (
                  <img src={editPreview || `${BACKEND_URL}/images/${editItem.logo}`} alt="logo" style={s.logoPreview}
                    onError={(e) => { e.target.style.display = "none"; }} />
                ) : (
                  <div style={s.logoFallback}>{editItem.name?.[0] || "R"}</div>
                )}
              </div>
              <div>
                <p style={s.logoLabel}>Restaurant Logo</p>
                <label style={s.uploadBtn}>
                  📷 Change Logo
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleEditLogoChange} />
                </label>
                {editLogo && <p style={s.logoName}>✅ {editLogo.name}</p>}
              </div>
            </div>
            <div style={s.fields}>
              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.fieldLabel}>Restaurant Name *</label>
                  <input style={s.input} value={editItem.name || ""} onChange={(e) => setEditItem((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div style={s.field}>
                  <label style={s.fieldLabel}>Email</label>
                  <input style={s.input} type="email" value={editItem.email || ""} onChange={(e) => setEditItem((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div style={s.field}>
                <label style={s.fieldLabel}>Address *</label>
                <input style={s.input} value={editItem.address || ""} onChange={(e) => setEditItem((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <div style={s.field}>
                <label style={s.fieldLabel}>Avg. Prep Time (minutes)</label>
                <input style={s.input} type="number" min="1" value={editItem.avgPrepTime || ""} onChange={(e) => setEditItem((p) => ({ ...p, avgPrepTime: e.target.value }))} />
              </div>
            </div>
            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={closeEdit} disabled={saving}>Cancel</button>
              <button style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }} onClick={saveEdit} disabled={saving}>
                {saving ? "Saving..." : "✓ Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div style={s.overlay} onMouseDown={handleResetBackdrop}>
          <div style={{ ...s.modal, maxWidth: 420 }} ref={resetModalRef}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>🔑 Reset Password</h3>
              <button style={s.closeBtn} onClick={closeReset}>✕</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <p style={{ margin: "0 0 20px", fontSize: 14, color: "#475569" }}>
                Setting a new password for <strong>{resetTarget.name}</strong>.
              </p>
              <div style={s.field}>
                <label style={s.fieldLabel}>New Password *</label>
                <div style={{ position: "relative" }}>
                  <input
                    style={{ ...s.input, paddingRight: 44 }}
                    type={showPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    onKeyDown={(e) => e.key === "Enter" && submitReset()}
                  />
                  <button type="button" style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9ca3af" }}>
                  {newPassword.length > 0 && newPassword.length < 6 ? "⚠️ Too short" : newPassword.length >= 6 ? "✅ Good" : ""}
                </p>
              </div>
            </div>
            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={closeReset} disabled={resetting}>Cancel</button>
              <button style={{ ...s.saveBtn, background: "linear-gradient(135deg, #f59e0b, #d97706)", opacity: resetting ? 0.7 : 1 }}
                onClick={submitReset} disabled={resetting}>
                {resetting ? "Resetting..." : "🔑 Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container:       { maxWidth: 1200, margin: "0 auto", padding: "40px 20px" },
  headerRow:       { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  h1:              { fontSize: 28, fontWeight: 900, color: "#1e293b", margin: 0 },
  sub:             { color: "#64748b", margin: 0 },
  refreshBtn:      { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: 700 },
  filtersCard:     { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 },
  filtersGrid:     { display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr auto", gap: 12, alignItems: "end" },
  label:           { fontSize: 12, fontWeight: 800, color: "#64748b", marginBottom: 6 },
  searchBox:       { display: "flex", alignItems: "center", gap: 8, padding: "0 12px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", height: 40 },
  searchInput:     { border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 },
  select:          { height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", padding: "0 10px", outline: "none", width: "100%" },
  clearBtn:        { height: 40, padding: "0 16px", borderRadius: 10, background: "#1e293b", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 },
  table:           { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden" },
  head:            { background: "#f8fafc", color: "#64748b", fontSize: 11, fontWeight: 900, letterSpacing: "0.5px" },
  row:             { display: "grid", gridTemplateColumns: "1.4fr 1.5fr 0.6fr 0.5fr 0.8fr", padding: "14px 20px", borderBottom: "1px solid #f1f5f9", alignItems: "center" },
  nameCell:        { display: "flex", alignItems: "center", gap: 12 },
  logoWrapper:     { width: 42, height: 42, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid #e2e8f0", flexShrink: 0 },
  logoImg:         { width: "100%", height: "100%", objectFit: "cover" },
  badge:           { padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 900 },
  actionBtn:       { background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center", borderRadius: 8 },
  overlay:         { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 },
  modal:           { background: "#fff", borderRadius: 20, width: "100%", maxWidth: 560, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", overflow: "hidden" },
  modalHeader:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6" },
  modalTitle:      { margin: 0, fontSize: 18, fontWeight: 900, color: "#1e293b" },
  closeBtn:        { background: "#f3f4f6", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 14, color: "#6b7280", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" },
  modalFooter:     { display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid #f3f4f6", background: "#f9fafb" },
  cancelBtn:       { padding: "10px 22px", background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 50, fontSize: 14, fontWeight: 700, color: "#374151", cursor: "pointer" },
  saveBtn:         { padding: "10px 26px", background: "linear-gradient(135deg, #ff4e2a, #ff6a3d)", border: "none", borderRadius: 50, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,78,42,0.28)" },
  logoSection:     { display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6" },
  logoPreviewWrap: { width: 72, height: 72, borderRadius: 14, overflow: "hidden", border: "1.5px solid #e5e7eb", flexShrink: 0, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" },
  logoPreview:     { width: "100%", height: "100%", objectFit: "cover" },
  logoFallback:    { fontSize: 28, fontWeight: 900, color: "#94a3b8" },
  logoLabel:       { margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#374151" },
  uploadBtn:       { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#374151", cursor: "pointer" },
  logoName:        { margin: "6px 0 0", fontSize: 12, color: "#16a34a", fontWeight: 600 },
  fields:          { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 },
  fieldRow:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  field:           { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel:      { fontSize: 12, fontWeight: 800, color: "#6b7280", letterSpacing: "0.3px", textTransform: "uppercase" },
  input:           { padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "#111827", background: "#fff", outline: "none", width: "100%" },
  eyeBtn:          { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, opacity: 0.7 },
};