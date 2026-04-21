import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { BACKEND_URL } from "../config";
import { MapPin, Search, Power, Trash2, Clock, RefreshCcw, Utensils, Pencil, KeyRound } from "lucide-react";
import { api, BASE_URL } from "../utils/api";

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
      console.log("📥 Fetching restaurants...");
      
      // Clear any potential cached state first
      setRestaurants([]);
      
      // Axios now handles cache-busting automatically
      const res = await api.get(`/api/restaurant/list`);
      
      console.log("📊 Restaurants response:", res.data);
      if (res.data.success) {
        console.log("✅ Loaded", res.data.data?.length, "restaurants");
        setRestaurants(res.data.data || []);
      }
      else {
        toast.error(res.data.message || "Error fetching restaurants");
        console.error("❌ Error:", res.data.message);
      }
    } catch (err) {
      console.error("❌ Fetch error:", err);
      toast.error(err?.response?.data?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchRestaurants(); 
  }, []);

  // Refresh data when window gains focus (user navigates back to this tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchRestaurants();
    };
    
    // Also refresh when page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchRestaurants();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Log restaurants state changes for debugging
  useEffect(() => {
    if (restaurants.length > 0) {
      console.log("🔄 Restaurants updated:", restaurants.length, "restaurants");
    }
  }, [restaurants]);

  const removeRestaurant = async (id) => {
    if (!window.confirm("Delete this restaurant? This cannot be undone.")) return;
    try {
      console.log("🗑️ Deleting restaurant:", id);
      const res = await api.post(`/api/restaurant/remove`, { id });
      console.log("📊 Delete response:", res.data);
      if (res.data.success) { 
        toast.success("Restaurant removed");
        // Update state directly instead of refetching to avoid cache issues
        setRestaurants((prev) => prev.filter((r) => r._id !== id));
      }
      else toast.error(res.data.message);
    } catch (err) {
      console.error("❌ Delete error:", err);
      // If restaurant not found (404), it's already deleted - remove from UI anyway
      if (err?.response?.status === 404) {
        toast.success("Restaurant deleted (already removed from database)");
        setRestaurants((prev) => prev.filter((r) => r._id !== id));
      } else {
        toast.error(err?.response?.data?.message || "Failed to remove"); 
      }
    }
  };

  const toggleActive = async (id) => {
    try {
      const res = await api.post(`/api/restaurant/toggle-active`, { id });
      if (res.data.success) { 
        toast.success(res.data.message);
        // Update state directly for immediate UI feedback
        setRestaurants((prev) => 
          prev.map((r) => r._id === id ? { ...r, isActive: !r.isActive } : r)
        );
      }
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

      const res = await api.post(`/api/restaurant/edit`, formData);
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
      const res = await api.post(`/api/restaurant/reset-password`, {
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
    <div className="dash animate-fade-in">
      <div className="dash-header">
        <div>
          <div className="dash-kicker">INFRASTRUCTURE MANAGEMENT</div>
          <h1 className="dash-title">Restaurant <span style={{ color: '#ff4e2a' }}>Partners</span></h1>
          <p className="dash-subtitle">Audit, manage, and monitor your platform's culinary network.</p>
        </div>
        <div className="dash-actions">
           <button className="btn-outline" onClick={fetchRestaurants} disabled={loading}>
             {loading ? <RefreshCcw size={14} className="animate-spin" /> : <RefreshCcw size={14} />} 
             SYNC DIRECTORY
           </button>
        </div>
      </div>

      <div className="as-glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div className="rl-filter-grid">
          <div className="field">
            <label className="label">GLOBAL SEARCH</label>
            <div className="search-wrap">
              <Search size={16} className="search-icon" />
              <input 
                className="input" 
                value={q} 
                onChange={(e) => setQ(e.target.value)} 
                placeholder="Name, email, address..."
              />
            </div>
          </div>
          <div className="field">
            <label className="label">LIVELIHOOD STATUS</label>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Display All Partners</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          <div className="field">
            <label className="label">LOCATIONAL RADIUS</label>
            <select className="select" value={location} onChange={(e) => setLocation(e.target.value)}>
              {locations.map((loc) => <option key={loc} value={loc}>{loc === 'all' ? 'All Coverage' : loc}</option>)}
            </select>
          </div>
          <button className="as-logout-btn" style={{ padding: '10px 20px', fontSize: '11px' }} onClick={() => { setQ(""); setStatus("all"); setLocation("all"); }}>
            RESET FILTERS
          </button>
        </div>
      </div>

      <div className="dash-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div className="rl-table-head">
          <div className="rl-col-main">RESTAURANT ENTITY</div>
          <div className="rl-col-addr">DEPLOYMENT ZONE</div>
          <div className="rl-col-status">PULSE</div>
          <div className="rl-col-prep">PREP</div>
          <div className="rl-col-actions">COMMAND</div>
        </div>

        <div className="rl-table-body">
          {filtered.length === 0 && (
            <div style={{ padding: "80px 20px", textAlign: "center", color: "var(--muted)" }}>
               <Utensils size={40} style={{ marginBottom: '15px', opacity: 0.2 }} />
               <p style={{ fontWeight: 600 }}>No entities matching current resonance.</p>
            </div>
          )}

          {filtered.map((r) => (
            <div key={r._id} className="rl-table-row">
              <div className="rl-col-main">
                <div className="rl-logo-outer">
                   <img 
                     src={`${BASE_URL}/images/${r.logo}`} 
                     alt={r.name}
                     onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML='<span style="font-size:18px">🏪</span>'; }}
                   />
                </div>
                <div>
                   <div className="rl-name">{r.name}</div>
                   <div className="rl-email">{r.email}</div>
                </div>
              </div>

              <div className="rl-col-addr">
                <MapPin size={14} className="muted" />
                <span>{r.address}</span>
              </div>

              <div className="rl-col-status">
                <div className={`rl-status-pill ${r.isActive ? 'active' : 'inactive'}`}>
                   <div className="status-dot"></div>
                   <span>{r.isActive ? "ACTIVE" : "INACTIVE"}</span>
                </div>
              </div>

              <div className="rl-col-prep">
                 <Clock size={14} />
                 <span>{r.avgPrepTime}m</span>
              </div>

              <div className="rl-col-actions">
                <button className="rl-act-btn edit" onClick={() => openEdit(r)} title="Edit Identity"><Pencil size={15} /></button>
                <button className="rl-act-btn pass" onClick={() => openReset(r)} title="Rotate Security"><KeyRound size={15} /></button>
                <button className={`rl-act-btn toggle ${r.isActive ? 'on' : 'off'}`} onClick={() => toggleActive(r._id)} title="Switch Power">
                   <Power size={15} />
                </button>
                <button className="rl-act-btn delete" onClick={() => removeRestaurant(r._id)} title="Terminate Entity"><Trash2 size={15} /></button>
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