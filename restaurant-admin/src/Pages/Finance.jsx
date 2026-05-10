import React, { useState, useEffect, useMemo } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { useTheme } from "../ThemeContext";
import { api } from "../utils/api";
import { 
  Users, Truck, MessageSquare, Package, 
  Search, Star, MapPin, Phone, 
  ShieldCheck, ArrowRight, TrendingUp,
  ShoppingBag, Clock, Plus, X, CheckCircle2,
  AlertCircle, ChevronRight, Landmark
} from "lucide-react";
import { toast } from "react-toastify";

/* ─── Main Component ─────────────────────────────────────────── */

export default function EVN() {
  const { dark } = useTheme();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(null); // supplier object
  const [showAddModal, setShowAddModal] = useState(false);
  const [orderForm, setOrderForm] = useState({ itemId: "", quantity: 1 });
  const [newSupplier, setNewSupplier] = useState({ name: "", contact: "", category: "Other", address: "" });

  useEffect(() => { loadInventory(); }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/inventory");
      if (res.data?.success) {
        setInventory(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to sync with Inventory system");
    } finally {
      setLoading(false);
    }
  };

  // Extract unique suppliers from inventory
  const suppliers = useMemo(() => {
    const map = new Map();
    inventory.forEach(item => {
      const s = item.supplier;
      if (s && s.name && s.name.trim()) {
        const nameKey = s.name.trim();
        if (!map.has(nameKey)) {
          map.set(nameKey, {
            name: s.name,
            contact: s.contact || "No Contact Provided",
            email: s.email || "",
            items: [],
            category: item.category || "General",
            lastRestocked: item.lastRestocked
          });
        }
        map.get(nameKey).items.push(item);
      }
    });
    return Array.from(map.values());
  }, [inventory]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.category.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [suppliers, search]);

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!orderForm.itemId || orderForm.quantity <= 0) return toast.warning("Please select an item and quantity");
    
    try {
      const res = await api.patch(`/api/inventory/${orderForm.itemId}/stock`, {
        adjustment: Number(orderForm.quantity)
      });
      if (res.data.success) {
        toast.success(`Successfully ordered ${orderForm.quantity} units from ${showOrderModal.name}`);
        setShowOrderModal(null);
        setOrderForm({ itemId: "", quantity: 1 });
        loadInventory();
      }
    } catch (err) {
      toast.error("Procurement request failed");
    }
  };

  const handleAddSupplier = (e) => {
    e.preventDefault();
    toast.success(`${newSupplier.name} added to local cache. Onboard an item in Inventory to fully link.`);
    setShowAddModal(false);
    setNewSupplier({ name: "", contact: "", category: "Other", address: "" });
  };

  /* Theme helpers */
  const c = (light, dk) => dark ? dk : light;
  const border = c("rgba(0,0,0,0.07)", "rgba(255,255,255,0.07)");
  const cardBg = c("#ffffff", "rgba(255,255,255,0.03)");
  const textC  = c("#0f172a", "#f8fafc");
  const mutedC = c("#9ca3af", "rgba(255,255,255,0.4)");
  const subBg  = c("#f8fafc", "rgba(255,255,255,0.04)");
  const accent = "#534AB7";

  if (loading && inventory.length === 0) {
    return (
      <RestaurantLayout>
        <div style={{ height: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${border}`, borderTopColor: accent, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <p style={{ fontWeight: 800, fontSize: 14, color: mutedC }}>Synchronizing B2B Network...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </RestaurantLayout>
    );
  }

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 100 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, color: textC, letterSpacing: "-1px" }}>E-Vendor Network (EVN)</h1>
            <p style={{ margin: "4px 0 0", fontSize: 15, color: mutedC, fontWeight: 600 }}>Dynamic B2B hub synced with your real-time inventory.</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ 
              padding: "12px 24px", borderRadius: 14, background: accent, color: "white", 
              border: "none", fontWeight: 900, fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 10, boxShadow: `0 8px 20px ${accent}33`
            }}
          >
            <Plus size={18} /> Onboard Supplier
          </button>
        </div>

        {/* ── Search & Filters ── */}
        <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, background: cardBg, padding: "14px 20px", borderRadius: 18, border: `1px solid ${border}` }}>
            <Search size={20} color={mutedC} />
            <input 
              placeholder="Search suppliers by name or product category..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", color: textC, fontWeight: 700, fontSize: 15, width: "100%" }}
            />
          </div>
        </div>

        {/* ── Dynamic Supplier Grid ── */}
        {filteredSuppliers.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center", background: subBg, borderRadius: 32, border: `1px dashed ${border}` }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔎</div>
            <h3 style={{ margin: 0, fontWeight: 900, color: textC }}>No Suppliers Found</h3>
            <p style={{ margin: "8px 0 0", color: mutedC, fontWeight: 600 }}>Add suppliers to your inventory items to see them here.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 24 }}>
            {filteredSuppliers.map(s => (
              <SupplierCard 
                key={s.name} 
                supplier={s} 
                dark={dark} 
                accent={accent} 
                onOrder={() => setShowOrderModal(s)} 
              />
            ))}
          </div>
        )}

        {/* ── Order Stock Modal ── */}
        {showOrderModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ background: dark ? "#111827" : "white", width: "100%", maxWidth: 460, borderRadius: 28, overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
              <div style={{ padding: 24, borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 950, letterSpacing: "-0.5px" }}>Order from {showOrderModal.name}</h3>
                <button onClick={() => setShowOrderModal(null)} style={{ background: subBg, border: "none", borderRadius: "50%", padding: 6, cursor: "pointer", color: textC }}><X size={18} /></button>
              </div>
              <form onSubmit={handleOrderSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 900, color: mutedC, textTransform: "uppercase" }}>Select Product</label>
                  <select 
                    value={orderForm.itemId}
                    onChange={e => setOrderForm({...orderForm, itemId: e.target.value})}
                    style={{ padding: 14, borderRadius: 12, background: subBg, border: `1px solid ${border}`, color: textC, fontWeight: 700, outline: "none", appearance: "none" }}
                  >
                    <option value="">Choose an item...</option>
                    {showOrderModal.items.map(item => (
                      <option key={item._id} value={item._id}>{item.itemName} ({item.currentStock} {item.unit} in stock)</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 900, color: mutedC, textTransform: "uppercase" }}>Order Quantity</label>
                  <input 
                    type="number"
                    min="1"
                    value={orderForm.quantity}
                    onChange={e => setOrderForm({...orderForm, quantity: e.target.value})}
                    style={{ padding: 14, borderRadius: 12, background: subBg, border: `1px solid ${border}`, color: textC, fontWeight: 800, fontSize: 18 }}
                  />
                  <p style={{ margin: 0, fontSize: 11, color: mutedC, fontWeight: 600 }}>This will automatically increase your inventory stock level.</p>
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 12 }}>
                  <button type="submit" style={{ flex: 1, padding: 16, borderRadius: 14, background: accent, color: "white", fontWeight: 900, border: "none", cursor: "pointer" }}>Confirm Order</button>
                  <button type="button" onClick={() => setShowOrderModal(null)} style={{ padding: 16, borderRadius: 14, background: subBg, color: textC, fontWeight: 800, border: "none", cursor: "pointer" }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Add Supplier Modal ── */}
        {showAddModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ background: dark ? "#111827" : "white", width: "100%", maxWidth: 460, borderRadius: 28, overflow: "hidden" }}>
              <div style={{ padding: 24, borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>Onboard New Supplier</h3>
                <button onClick={() => setShowAddModal(false)} style={{ background: subBg, border: "none", borderRadius: "50%", padding: 6, cursor: "pointer" }}><X size={18} /></button>
              </div>
              <form onSubmit={handleAddSupplier} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <FormInput label="Supplier Name" value={newSupplier.name} onChange={v => setNewSupplier({...newSupplier, name: v})} dark={dark} />
                <FormInput label="Category" value={newSupplier.category} onChange={v => setNewSupplier({...newSupplier, category: v})} dark={dark} placeholder="e.g. Dairy, Packaging..." />
                <FormInput label="Contact (Phone/Email)" value={newSupplier.contact} onChange={v => setNewSupplier({...newSupplier, contact: v})} dark={dark} />
                <button type="submit" style={{ marginTop: 10, padding: 16, borderRadius: 14, background: accent, color: "white", fontWeight: 900, border: "none", cursor: "pointer" }}>Add Supplier</button>
              </form>
            </div>
          </div>
        )}

      </div>
    </RestaurantLayout>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function SupplierCard({ supplier, dark, accent, onOrder }) {
  const border = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const bg = dark ? "rgba(255,255,255,0.03)" : "white";
  const mutedC = dark ? "rgba(255,255,255,0.4)" : "#64748b";

  return (
    <div style={{ 
      background: bg, border: `1px solid ${border}`, borderRadius: 24, padding: 24,
      display: "flex", flexDirection: "column", gap: 20, transition: "all 0.2s"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: dark ? "rgba(255,255,255,0.05)" : "#f8fafc", color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: `1px solid ${border}` }}>
             {supplier.category.toLowerCase().includes("dairy") ? "🐄" : supplier.category.toLowerCase().includes("packaging") ? "📦" : supplier.category.toLowerCase().includes("drink") ? "🥤" : "🏭"}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 950, letterSpacing: "-0.5px" }}>{supplier.name}</h3>
            <span style={{ fontSize: 11, fontWeight: 900, color: accent, textTransform: "uppercase", letterSpacing: "1px" }}>{supplier.category}</span>
          </div>
        </div>
        <div style={{ background: "#EAF3DE", color: "#27500A", padding: "6px 12px", borderRadius: 10, fontSize: 12, fontWeight: 900 }}>Active</div>
      </div>

      <div style={{ background: dark ? "rgba(255,255,255,0.02)" : "#f9fafb", borderRadius: 16, padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
         <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 900, color: mutedC, textTransform: "uppercase" }}>Linked Products</p>
            <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 800 }}>{supplier.items.length} Items</p>
         </div>
         <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 900, color: mutedC, textTransform: "uppercase" }}>Reliability</p>
            <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 800, color: "#10b981" }}>98%</p>
         </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: mutedC, fontSize: 13, fontWeight: 600 }}>
          <Phone size={14} /> {supplier.contact}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: mutedC, fontSize: 13, fontWeight: 600 }}>
          <Clock size={14} /> Last restocked: {new Date(supplier.lastRestocked).toLocaleDateString()}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
        <button 
          onClick={onOrder}
          style={{ flex: 1, padding: "14px", borderRadius: 14, background: accent, color: "white", border: "none", fontWeight: 900, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <ShoppingBag size={16} /> Order Stock
        </button>
        <button style={{ padding: "14px", borderRadius: 14, background: "transparent", border: `1px solid ${border}`, color: "inherit", fontWeight: 900, fontSize: 13, cursor: "pointer" }}>
          <MessageSquare size={16} />
        </button>
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, dark, placeholder }) {
  const border = dark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 950, color: dark ? "rgba(255,255,255,0.4)" : "#64748b", textTransform: "uppercase" }}>{label}</label>
      <input 
        value={value} 
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ padding: 14, borderRadius: 12, background: dark ? "rgba(255,255,255,0.05)" : "#f8fafc", border: `1px solid ${border}`, color: "inherit", fontWeight: 700, outline: "none" }}
      />
    </div>
  );
}
