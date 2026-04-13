import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import RestaurantLayout from "../components/RestaurantLayout";
import { useTheme } from "../ThemeContext";
import { api } from "../utils/api";
import { toast } from "react-toastify";
import { 
  Tag, Gift, TrendingUp, Users, Clock, AlertCircle, ChevronRight, Plus, 
  Search, MoreVertical, Calendar, MousePointer2, Percent, DollarSign, 
  Loader2, Filter, Trash2, Edit3, Copy, ShieldCheck, MapPin, ShoppingBag,
  Sparkles
} from "lucide-react";
import ConfirmationModal from "../components/ConfirmationModal";

export default function Coupons() {
  const { dark } = useTheme();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("Coupons");
  const [view, setView] = useState("list"); 
  const [loading, setLoading] = useState(true);
  
  const [promos, setPromos] = useState([]);
  const [orders, setOrders] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "percent",
    value: "",
    minOrder: "",
    maxDiscount: "",
    maxUses: "",
    perUserLimit: "1",
    startDate: "",
    endDate: "",
    isActive: true,
    targetUsers: "All",
    orderType: "Both",
    promoType: "standard"
  });

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  useEffect(() => {
    if (location.state?.aiSuggestion) {
        const idea = location.state.aiSuggestion;
        setFormData(prev => ({
            ...prev,
            code: idea.code || "",
            type: idea.type || "percent",
            value: idea.value || "",
            minOrder: idea.minOrder || 0,
            maxUses: idea.maxUses || "",
            name: idea.reason || "AI Suggested Campaign"
        }));
        setView("create-coupon");
        window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, oRes] = await Promise.all([
        api.get("/api/promo/list"),
        api.get("/api/order/restaurant/list")
      ]);
      if (pRes.data?.success) setPromos(pRes.data.data || []);
      if (oRes.data?.success) setOrders(oRes.data.data || []);
    } catch (err) {
      toast.error("Failed to sync production data.");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const activeC = promos.filter(p => p.isActive && (!p.expiresAt || new Date(p.expiresAt) > new Date())).length;
    const totalRedemptions = promos.reduce((sum, p) => sum + (p.usedCount || 0), 0);
    const promoOrders = orders.filter(o => o.promoCode);
    const revenue = promoOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const discountsTotal = promoOrders.reduce((sum, o) => sum + (o.discount || 0), 0);
    const now = new Date();
    const fortyEightHours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const expiringSoon = promos.filter(p => p.expiresAt && new Date(p.expiresAt) > now && new Date(p.expiresAt) < fortyEightHours).length;
    return { activeC, totalRedemptions, revenue, discountsTotal, expiringSoon };
  }, [promos, orders]);

  const handleLaunch = async () => {
    try {
        const res = await api.post("/api/promo/create", formData);
        if (res.data?.success) {
            toast.success("Campaign Live!");
            setView("list");
            fetchData();
        } else {
            toast.error(res.data?.message || "Launch failed");
        }
    } catch (err) {
        toast.error("Network error during launch");
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/api/promo/${id}`);
      if (res.data?.success) {
        toast.success("Promo deleted successfully");
        fetchData();
      } else {
        toast.error(res.data?.message || "Failed to delete");
      }
    } catch (err) {
      toast.error("Error deleting promotion");
    }
  };

  const bgColor = dark ? "#0f172a" : "#f8fafc";
  const cardBg = dark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const borderColor = dark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const textColor = dark ? "#f8fafc" : "#1e293b";
  const subTextColor = dark ? "rgba(255,255,255,0.5)" : "#64748b";

  if (loading) {
    return (
        <RestaurantLayout>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", gap: "16px" }}>
                <Loader2 className="animate-spin" size={48} color="var(--orange)" />
                <div style={{ color: textColor, fontWeight: 900, fontSize: "20px" }}>Syncing Campaigns...</div>
            </div>
        </RestaurantLayout>
    );
  }

  return (
    <RestaurantLayout>
      <div style={{ padding: "20px", background: bgColor, minHeight: "100vh", maxWidth: "1600px", margin: "0 auto" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "30px", fontWeight: 950, color: textColor, margin: 0, letterSpacing: "-1.2px" }}>Promotions Manager</h1>
            <p style={{ color: subTextColor, fontSize: "14px", marginTop: "4px" }}>Manage your restaurant incentive and promo code strategy.</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              onClick={() => { setFormData({...formData, promoType: 'standard'}); setView("create-coupon"); }}
              style={{ padding: "12px 20px", borderRadius: "12px", border: "none", background: "var(--orange)", color: "white", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 8px 20px rgba(255,90,31,0.2)" }}
            >
              <Tag size={16} /> Create Promo Code
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <SummaryCard icon={<Tag color="#3b82f6" />} title="Active" value={stats.activeC} subText="Live on site" dark={dark} />
          <SummaryCard icon={<MousePointer2 color="#10b981" />} title="Redemptions" value={stats.totalRedemptions} subText="Total usage" dark={dark} />
          <SummaryCard icon={<DollarSign color="#f59e0b" />} title="Revenue" value={`AED ${stats.revenue.toLocaleString()}`} subText="Calculated" dark={dark} />
          <SummaryCard icon={<Percent color="#ef4444" />} title="Discounts" value={`AED ${stats.discountsTotal.toLocaleString()}`} subText="Total value" dark={dark} />
        </div>

        {view === "list" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", alignItems: "start" }}>
              <div style={{ background: cardBg, borderRadius: "24px", border: `1.5px solid ${borderColor}`, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: `1.5px solid ${borderColor}` }}>
                    <h3 style={{ margin: 0, fontSize: "16px", color: textColor, fontWeight: 800 }}>Promotion Records</h3>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", background: dark ? "rgba(255,255,255,0.01)" : "#f8fafc" }}>
                        <th style={{ padding: "12px 20px", color: subTextColor, fontSize: "11px", fontWeight: 900, textTransform: "uppercase" }}>Offer</th>
                        <th style={{ padding: "12px 12px", color: subTextColor, fontSize: "11px", fontWeight: 900, textTransform: "uppercase" }}>Type</th>
                        <th style={{ padding: "12px 12px", color: subTextColor, fontSize: "11px", fontWeight: 900, textTransform: "uppercase" }}>Usage</th>
                        <th style={{ padding: "12px 12px", color: subTextColor, fontSize: "11px", fontWeight: 900, textTransform: "uppercase" }}>Status</th>
                        <th style={{ padding: "12px 20px", color: subTextColor, fontSize: "11px", fontWeight: 900, textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promos.map(p => (
                        <tr key={p._id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                          <td style={{ padding: "16px 20px" }}>
                            <div style={{ fontWeight: 800, color: textColor, fontSize: "13px" }}>{p.code || "Auto Promo"}</div>
                          </td>
                          <td style={{ padding: "16px 12px" }}>
                            <div style={{ padding: "4px 8px", borderRadius: "6px", background: "rgba(59,130,246,0.1)", color: "#3b82f6", fontSize: "11px", fontWeight: 800 }}>
                              {p.type === "percent" ? `${p.value}%` : `AED ${p.value}`}
                            </div>
                          </td>
                          <td style={{ padding: "16px 12px", color: textColor, fontWeight: 700, fontSize: "13px" }}>{p.usedCount}</td>
                          <td style={{ padding: "16px 12px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 800, color: p.isActive ? "#10b981" : subTextColor }}>{p.isActive ? "Active" : "Paused"}</span>
                          </td>
                          <td style={{ padding: "16px 20px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                              <button 
                                onClick={() => setConfirmModal({ isOpen: true, id: p._id })}
                                style={{ background: "none", border: "none", color: "#f43f5e", cursor: "pointer", padding: "4px" }}
                                title="Delete Promo"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ background: cardBg, borderRadius: "24px", border: `1.5px solid ${borderColor}`, padding: "20px" }}>
                     <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                        <AlertCircle color="#f43f5e" size={20} />
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 950, color: textColor }}>Health Monitor</h3>
                     </div>
                     {stats.expiringSoon > 0 ? (
                        <AlertBox title={`${stats.expiringSoon} Codes Expiring Soon`} type="danger" dark={dark} />
                     ) : (
                        <AlertBox title="All Campaigns Healthy" type="info" dark={dark} />
                     )}
                  </div>
              </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "28px", alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ background: cardBg, borderRadius: "24px", border: `1.5px solid ${borderColor}`, padding: "24px" }}>
                <button onClick={() => setView("list")} style={{ background: "none", border: "none", color: "var(--orange)", fontWeight: 900, fontSize: "12px", cursor: "pointer", marginBottom: "16px" }}>← Back to Manager</button>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                   <h2 style={{ fontSize: "20px", fontWeight: 950, color: textColor, margin: 0 }}>Configure Promotion</h2>
                </div>

                <div style={{ display: "grid", gap: "16px" }}>
                   <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                      <FormField label="Campaign Title" value={formData.name} onChange={(v) => setFormData({...formData, name: v})} placeholder="Seasonal Blast" dark={dark} />
                      <FormField label="Promo Code" value={formData.code} onChange={(v) => setFormData({...formData, code: v.toUpperCase()})} placeholder="SAVE50" dark={dark} />
                   </div>
                   <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "12px" }}>
                      <FormSelect label="Type" value={formData.type} onChange={(v) => setFormData({...formData, type: v})} options={[{label: "Percent %", value: "percent"}, {label: "Fixed AED", value: "flat"}]} dark={dark} />
                      <FormField label="Value" value={formData.value} onChange={(v) => setFormData({...formData, value: v})} type="number" dark={dark} />
                      <FormField label="Min Order" value={formData.minOrder} onChange={(v) => setFormData({...formData, minOrder: v})} type="number" dark={dark} />
                   </div>
                </div>
              </div>

              <div style={{ background: cardBg, borderRadius: "24px", border: `1.5px solid ${borderColor}`, padding: "24px" }}>
                 <h3 style={{ fontSize: "16px", fontWeight: 950, color: textColor, margin: "0 0 16px" }}>Audience & Launch</h3>
                 <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
                    <FormSelect label="Audience" value={formData.targetUsers} onChange={(v) => setFormData({...formData, targetUsers: v})} options={[{label: "All Users", value: "All"}]} dark={dark} />
                    <FormSelect label="Fulfillment" value={formData.orderType} onChange={(v) => setFormData({...formData, orderType: v})} options={[{label: "Both", value: "Both"}]} dark={dark} />
                 </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
               <div style={{ background: cardBg, borderRadius: "24px", border: `2.5px dashed ${borderColor}`, padding: "24px" }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: "11px", fontWeight: 900, color: subTextColor, textTransform: "uppercase" }}>Production Preview</h4>
                  <div style={{ padding: "16px", borderRadius: "16px", background: "var(--orange)", color: "white", textAlign: "center", position: "relative", overflow: "hidden" }}>
                     <Tag size={40} style={{ position: "absolute", left: "-5px", top: "-5px", opacity: 0.1 }} />
                     <div style={{ fontSize: "28px", fontWeight: 1000 }}>{formData.type === 'percent' ? `${formData.value || '0'}% OFF` : `AED ${formData.value || '0'} OFF`}</div>
                     <div style={{ fontSize: "14px", fontWeight: 900, margin: "8px 0", letterSpacing: "1px" }}>{formData.code || "CODE"}</div>
                  </div>
               </div>
               <button onClick={handleLaunch} style={{ width: "100%", padding: "16px", borderRadius: "16px", background: "var(--orange)", color: "white", fontSize: "16px", fontWeight: 1000, border: "none", cursor: "pointer", boxShadow: "0 10px 20px rgba(255,90,31,0.2)" }}>Launch Promotion</button>
            </div>
          </div>
        )}
        
        <ConfirmationModal 
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false, id: null })}
          onConfirm={() => handleDelete(confirmModal.id)}
          title="Delete Promotion?"
          message="This will permanently remove the promo code and it will no longer be usable by customers."
          confirmText="Yes, Delete"
        />
      </div>
    </RestaurantLayout>
  );
}

function SummaryCard({ icon, title, value, subText, dark }) {
  const cardBg = dark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const borderColor = dark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const textColor = dark ? "#f8fafc" : "#1e293b";
  const subTextColor = dark ? "rgba(255,255,255,0.5)" : "#64748b";
  return (
    <div style={{ background: cardBg, borderRadius: "20px", padding: "16px", border: `1.5px solid ${borderColor}` }}>
      <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: dark ? "rgba(255,255,255,0.05)" : "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>{icon}</div>
      <div style={{ fontSize: "11px", fontWeight: 900, color: subTextColor, textTransform: "uppercase" }}>{title}</div>
      <div style={{ fontSize: "22px", fontWeight: 1000, color: textColor, margin: "4px 0" }}>{value}</div>
      <div style={{ fontSize: "11px", fontWeight: 700, color: "#10b981" }}>{subText}</div>
    </div>
  );
}

function IconButton({ icon, title, variant, dark }) {
  return (
    <button title={title} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", background: variant === "danger" ? "rgba(244,63,94,0.1)" : dark ? "rgba(255,255,255,0.05)" : "#f1f5f9", color: variant === "danger" ? "#f43f5e" : dark ? "white" : "#1e293b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</button>
  );
}

function AlertBox({ title, type, dark }) {
  const colors = {
    danger: { bg: "rgba(244,63,94,0.08)", text: "#f43f5e" },
    warning: { bg: "rgba(245,158,11,0.08)", text: "#f59e0b" },
    info: { bg: "rgba(59,130,246,0.08)", text: "#3b82f6" },
  };
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: "12px", background: colors[type].bg }}>
       <div style={{ fontSize: "13px", fontWeight: 800, color: colors[type].text }}>{title}</div>
       <ChevronRight size={14} color={colors[type].text} />
    </div>
  );
}

function FormField({ label, placeholder, value, onChange, type = "text", dark }) {
  const textColor = dark ? "#f8fafc" : "#1e293b";
  const borderColor = dark ? "rgba(255,255,255,0.1)" : "#e2e8f0";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
       <label style={{ fontSize: "12px", fontWeight: 800, color: textColor }}>{label}</label>
       <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ padding: "10px 14px", borderRadius: "10px", border: `1.5px solid ${borderColor}`, background: dark ? "rgba(0,0,0,0.2)" : "#f8fafc", color: textColor, fontSize: "14px", fontWeight: 600, outline: "none" }} />
    </div>
  );
}

function FormSelect({ label, options, value, onChange, dark }) {
  const textColor = dark ? "#f8fafc" : "#1e293b";
  const borderColor = dark ? "rgba(255,255,255,0.1)" : "#e2e8f0";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
       <label style={{ fontSize: "12px", fontWeight: 800, color: textColor }}>{label}</label>
       <select value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: "10px 14px", borderRadius: "10px", border: `1.5px solid ${borderColor}`, background: dark ? "rgba(0,0,0,0.2)" : "#f8fafc", color: textColor, fontSize: "14px", fontWeight: 600, outline: "none", cursor: "pointer" }}>
         {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
       </select>
    </div>
  );
}
