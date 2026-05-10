import React, { useState, useEffect, useMemo } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { useTheme } from "../ThemeContext";
import { api } from "../utils/api";
import { 
  Users, Truck, MessageSquare, Package, 
  Search, Star, MapPin, Phone, 
  ShieldCheck, ArrowRight, TrendingUp,
  ShoppingBag, Clock, Plus, X, CheckCircle2,
  AlertCircle, ChevronRight, Landmark,
  History, Receipt, FileText, ArrowDownLeft
} from "lucide-react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";

/* ─── Procurement Hub ────────────────────────────────────────── */

export default function ProcurementHub() {
  const { dark } = useTheme();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("suppliers"); // "suppliers" | "history"

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(null); // selected supplier
  const [orderItems, setOrderItems] = useState([]); // [{ itemId, itemName, quantity, unit, price }]
  const [showAddModal, setShowAddModal] = useState(false);
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
            lastRestocked: item.lastRestocked || new Date()
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

  const handleAddItemToOrder = (item) => {
    if (orderItems.find(oi => oi.itemId === item._id)) return;
    setOrderItems([...orderItems, { 
      itemId: item._id, 
      itemName: item.itemName, 
      quantity: 1, 
      unit: item.unit, 
      price: item.pricePerUnit || 0 
    }]);
  };

  const handleUpdateQty = (idx, delta) => {
    const updated = [...orderItems];
    updated[idx].quantity = Math.max(1, updated[idx].quantity + delta);
    setOrderItems(updated);
  };

  const handleRemoveItem = (idx) => {
    setOrderItems(orderItems.filter((_, i) => i !== idx));
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (orderItems.length === 0) return toast.warning("No items selected for procurement");
    
    try {
      // Process each item restock
      const promises = orderItems.map(oi => 
        api.patch(`/api/inventory/${oi.itemId}/stock`, {
          adjustment: Number(oi.quantity),
          reason: `Procured from ${showOrderModal.name}`
        })
      );

      await Promise.all(promises);
      
      toast.success(`Procurement batch confirmed for ${showOrderModal.name}`);
      setShowOrderModal(null);
      setOrderItems([]);
      loadInventory();
    } catch (err) {
      toast.error("Procurement batch failed. Some items may not have updated.");
    }
  };

  const handleAddSupplier = (e) => {
    e.preventDefault();
    toast.success(`${newSupplier.name} added to supplier records.`);
    setShowAddModal(false);
    setNewSupplier({ name: "", contact: "", category: "Other", address: "" });
  };

  /* Indigo Command Styling */
  const accent = "#6366f1";
  const glass = dark ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.8)";
  const border = dark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
  const textC  = dark ? "#f8fafc" : "#0f172a";
  const mutedC = dark ? "rgba(255, 255, 255, 0.4)" : "#64748b";

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "40px 20px 100px" }}>
        
        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 950, color: textC, letterSpacing: "-1.2px", display: "flex", alignItems: "center", gap: 12 }}>
              <Truck size={36} color={accent} /> Procurement Hub
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 16, color: mutedC, fontWeight: 600 }}>Manage B2B supplier networks and automate stock replenishment.</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button 
              onClick={() => setShowAddModal(true)}
              style={{ 
                padding: "14px 24px", borderRadius: 16, background: "rgba(99, 102, 241, 0.1)", color: accent, 
                border: `1px solid ${accent}40`, fontWeight: 800, fontSize: 14, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10, transition: "0.2s"
              }}
            >
              <Plus size={18} /> New Supplier
            </button>
            <button 
              style={{ 
                padding: "14px 24px", borderRadius: 16, background: accent, color: "white", 
                border: "none", fontWeight: 800, fontSize: 14, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10, boxShadow: `0 10px 25px ${accent}40`
              }}
            >
              <FileText size={18} /> Export Reports
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: 32, borderBottom: `1px solid ${border}`, marginBottom: 40 }}>
          {["suppliers", "history", "analytics"].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ 
                padding: "16px 8px", background: "none", border: "none", 
                borderBottom: activeTab === tab ? `3px solid ${accent}` : "3px solid transparent",
                color: activeTab === tab ? accent : mutedC, fontWeight: 800, fontSize: 15,
                textTransform: "capitalize", cursor: "pointer", transition: "0.2s"
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "suppliers" && (
          <>
            {/* ── Search ── */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ maxWidth: 600, display: "flex", alignItems: "center", gap: 16, background: glass, padding: "16px 24px", borderRadius: 20, border: `1px solid ${border}`, backdropFilter: "blur(20px)" }}>
                <Search size={22} color={mutedC} />
                <input 
                  placeholder="Search suppliers, categories, or specific ingredients..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ background: "transparent", border: "none", outline: "none", color: textC, fontWeight: 700, fontSize: 16, width: "100%" }}
                />
              </div>
            </div>

            {/* ── Supplier Grid ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 24 }}>
              {filteredSuppliers.map(s => (
                <SupplierCard 
                  key={s.name} 
                  supplier={s} 
                  dark={dark} 
                  accent={accent} 
                  onOrder={() => {
                    setShowOrderModal(s);
                    setOrderItems([]);
                  }} 
                />
              ))}
            </div>
          </>
        )}

        {activeTab === "history" && (
          <div style={{ background: glass, border: `1px solid ${border}`, borderRadius: 24, padding: 32 }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 900 }}>Restock History</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: `1px solid ${border}` }}>
                    <th style={{ padding: "16px", color: mutedC, fontSize: 13, fontWeight: 900, textTransform: "uppercase" }}>Batch ID</th>
                    <th style={{ padding: "16px", color: mutedC, fontSize: 13, fontWeight: 900, textTransform: "uppercase" }}>Supplier</th>
                    <th style={{ padding: "16px", color: mutedC, fontSize: 13, fontWeight: 900, textTransform: "uppercase" }}>Items</th>
                    <th style={{ padding: "16px", color: mutedC, fontSize: 13, fontWeight: 900, textTransform: "uppercase" }}>Date</th>
                    <th style={{ padding: "16px", color: mutedC, fontSize: 13, fontWeight: 900, textTransform: "uppercase" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.slice(0, 5).map((s, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: "16px", fontWeight: 700 }}>#PO-{1000 + i}</td>
                      <td style={{ padding: "16px", fontWeight: 800 }}>{s.name}</td>
                      <td style={{ padding: "16px", fontWeight: 700 }}>{s.items.length} Product(s)</td>
                      <td style={{ padding: "16px", fontWeight: 600, color: mutedC }}>{new Date(s.lastRestocked).toLocaleDateString()}</td>
                      <td style={{ padding: "16px" }}>
                        <span style={{ padding: "6px 12px", borderRadius: 10, background: "rgba(16, 185, 129, 0.1)", color: "#10b981", fontSize: 12, fontWeight: 900 }}>COMPLETED</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              <AnalyticsKpi 
                label="Monthly Spend" 
                value={`AED ${(suppliers.reduce((acc, s) => acc + (s.items.length * 1250), 0) / 12).toFixed(0)}`} 
                trend="+12.5%" 
                dark={dark} 
                icon={<TrendingUp size={20} />} 
              />
              <AnalyticsKpi 
                label="Supplier Network" 
                value={suppliers.length} 
                trend="Healthy" 
                dark={dark} 
                icon={<Users size={20} />} 
              />
              <AnalyticsKpi 
                label="Inventory Health" 
                value={`${Math.round((inventory.filter(i => i.currentStock > i.minimumStock).length / (inventory.length || 1)) * 100)}%`} 
                trend="Optimized" 
                dark={dark} 
                icon={<ShieldCheck size={20} />} 
              />
              <AnalyticsKpi 
                label="Avg Delivery Time" 
                value="32h" 
                trend="-4h" 
                dark={dark} 
                icon={<Clock size={20} />} 
              />
            </div>

            {/* Charts Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>
              {/* Spend Trend */}
              <div style={{ background: glass, border: `1px solid ${border}`, borderRadius: 28, padding: 32 }}>
                <h3 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 900 }}>Procurement Spend Trend</h3>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { name: "Jan", spend: 4200 }, { name: "Feb", spend: 3800 }, { name: "Mar", spend: 5100 },
                      { name: "Apr", spend: 4800 }, { name: "May", spend: 6200 }, { name: "Jun", spend: 5800 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: mutedC, fontSize: 12, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: mutedC, fontSize: 12, fontWeight: 700 }} />
                      <Tooltip 
                        contentStyle={{ background: dark ? "#1e293b" : "white", border: `1px solid ${border}`, borderRadius: 12, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
                        itemStyle={{ color: accent, fontWeight: 800 }}
                      />
                      <Line type="monotone" dataKey="spend" stroke={accent} strokeWidth={4} dot={{ r: 6, fill: accent, strokeWidth: 2, stroke: "white" }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Distribution */}
              <div style={{ background: glass, border: `1px solid ${border}`, borderRadius: 28, padding: 32 }}>
                <h3 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 900 }}>Spend by Category</h3>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Dairy", value: 400 }, { name: "Meat", value: 300 },
                          { name: "Dry Goods", value: 300 }, { name: "Packaging", value: 200 }
                        ]}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[accent, "#10b981", "#f59e0b", "#ef4444"].map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bottom Row: Top Suppliers */}
            <div style={{ background: glass, border: `1px solid ${border}`, borderRadius: 28, padding: 32 }}>
              <h3 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 900 }}>Top Suppliers by Volume</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                {suppliers.slice(0, 3).map((s, i) => (
                  <div key={i} style={{ padding: 20, borderRadius: 20, background: dark ? "rgba(255,255,255,0.03)" : "#f8fafc", border: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: accent + "15", color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      <Landmark size={24} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 900, fontSize: 15 }}>{s.name}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: mutedC, fontWeight: 700 }}>{s.items.length} Catalog Items</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Order Stock Modal ── */}
        <AnimatePresence>
          {showOrderModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                style={{ background: dark ? "#0f172a" : "white", width: "100%", maxWidth: 800, borderRadius: 32, overflow: "hidden", boxShadow: "0 50px 100px -20px rgba(0,0,0,0.5)", border: `1px solid ${border}` }}
              >
                <div style={{ padding: "32px 40px", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: `linear-gradient(to right, ${accent}10, transparent)` }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 24, fontWeight: 950, letterSpacing: "-0.8px" }}>Procurement Order: {showOrderModal.name}</h3>
                    <p style={{ margin: "4px 0 0", color: mutedC, fontWeight: 600, fontSize: 14 }}>Add items from this supplier to your batch order.</p>
                  </div>
                  <button onClick={() => setShowOrderModal(null)} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 16, padding: 12, cursor: "pointer", color: textC, transition: "0.2s" }}><X size={24} /></button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: 500 }}>
                  {/* Left: Supplier Catalog */}
                  <div style={{ padding: 32, borderRight: `1px solid ${border}`, overflowY: "auto" }}>
                    <h4 style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 900, color: mutedC, textTransform: "uppercase", letterSpacing: "1px" }}>Available Products</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {showOrderModal.items.map(item => (
                        <div 
                          key={item._id} 
                          onClick={() => handleAddItemToOrder(item)}
                          style={{ 
                            padding: "16px 20px", borderRadius: 18, background: dark ? "rgba(255,255,255,0.03)" : "#f8fafc", 
                            border: `1px solid ${border}`, cursor: "pointer", transition: "0.2s",
                            display: "flex", justifyContent: "space-between", alignItems: "center"
                          }}
                        >
                          <div>
                            <p style={{ margin: 0, fontWeight: 800, fontSize: 15 }}>{item.itemName}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 12, color: mutedC }}>Stock: {item.currentStock} {item.unit}</p>
                          </div>
                          <div style={{ width: 32, height: 32, borderRadius: 10, background: accent, color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Plus size={18} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Order Summary */}
                  <div style={{ padding: 32, display: "flex", flexDirection: "column", background: dark ? "rgba(255,255,255,0.01)" : "#fafafa" }}>
                    <h4 style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 900, color: mutedC, textTransform: "uppercase", letterSpacing: "1px" }}>Current Batch</h4>
                    
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
                      {orderItems.length === 0 ? (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
                          <ShoppingBag size={48} />
                          <p style={{ fontWeight: 800, marginTop: 12 }}>Batch is empty</p>
                        </div>
                      ) : (
                        orderItems.map((oi, idx) => (
                          <div key={oi.itemId} style={{ display: "flex", alignItems: "center", gap: 16, background: glass, padding: 12, borderRadius: 16, border: `1px solid ${border}` }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>{oi.itemName}</p>
                              <p style={{ margin: 0, fontSize: 12, color: mutedC }}>AED {oi.price.toFixed(2)} / {oi.unit}</p>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, background: dark ? "rgba(255,255,255,0.05)" : "#f1f5f9", padding: "4px 8px", borderRadius: 12 }}>
                              <button type="button" onClick={() => handleUpdateQty(idx, -1)} style={{ background: "none", border: "none", color: textC, cursor: "pointer", padding: 4 }}><AlertCircle size={14} /></button>
                              <span style={{ fontWeight: 900, minWidth: 24, textAlign: "center" }}>{oi.quantity}</span>
                              <button type="button" onClick={() => handleUpdateQty(idx, 1)} style={{ background: "none", border: "none", color: textC, cursor: "pointer", padding: 4 }}><Plus size={14} /></button>
                            </div>
                            <button onClick={() => handleRemoveItem(idx)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}><X size={18} /></button>
                          </div>
                        ))
                      )}
                    </div>

                    <div style={{ marginTop: 24, paddingTop: 24, borderTop: `2px dashed ${border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                        <span style={{ fontWeight: 800, color: mutedC }}>Estimated Cost</span>
                        <span style={{ fontSize: 20, fontWeight: 950, color: textC }}>AED {orderItems.reduce((acc, oi) => acc + (oi.price * oi.quantity), 0).toFixed(2)}</span>
                      </div>
                      <button 
                        onClick={handleOrderSubmit}
                        style={{ width: "100%", padding: 18, borderRadius: 18, background: accent, color: "white", fontWeight: 900, fontSize: 16, border: "none", cursor: "pointer", boxShadow: `0 12px 30px ${accent}40` }}
                      >
                        Confirm Procurement Batch
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Add Supplier Modal ── */}
        <AnimatePresence>
          {showAddModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{ background: dark ? "#0f172a" : "white", width: "100%", maxWidth: 460, borderRadius: 32, overflow: "hidden", border: `1px solid ${border}` }}
              >
                <div style={{ padding: 24, borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>Onboard New Supplier</h3>
                  <button onClick={() => setShowAddModal(false)} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: "50%", padding: 6, cursor: "pointer" }}><X size={18} /></button>
                </div>
                <form onSubmit={handleAddSupplier} style={{ padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
                  <FormInput label="Supplier Name" value={newSupplier.name} onChange={v => setNewSupplier({...newSupplier, name: v})} dark={dark} />
                  <FormInput label="Category" value={newSupplier.category} onChange={v => setNewSupplier({...newSupplier, category: v})} dark={dark} placeholder="e.g. Dairy, Packaging..." />
                  <FormInput label="Contact (Phone/Email)" value={newSupplier.contact} onChange={v => setNewSupplier({...newSupplier, contact: v})} dark={dark} />
                  <button type="submit" style={{ marginTop: 10, padding: 18, borderRadius: 16, background: accent, color: "white", fontWeight: 900, border: "none", cursor: "pointer", boxShadow: `0 10px 25px ${accent}33` }}>Authorize Supplier</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </RestaurantLayout>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function SupplierCard({ supplier, dark, accent, onOrder }) {
  const border = dark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
  const glass = dark ? "rgba(255, 255, 255, 0.02)" : "white";
  const mutedC = dark ? "rgba(255, 255, 255, 0.4)" : "#64748b";

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      style={{ 
        background: glass, border: `1px solid ${border}`, borderRadius: 28, padding: 32,
        display: "flex", flexDirection: "column", gap: 24, transition: "0.2s",
        boxShadow: dark ? "0 20px 40px rgba(0,0,0,0.2)" : "0 10px 30px rgba(0,0,0,0.02)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: dark ? "rgba(255, 255, 255, 0.05)" : "#f8fafc", color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, border: `1px solid ${border}` }}>
             {supplier.category.toLowerCase().includes("dairy") ? "🐄" : supplier.category.toLowerCase().includes("packaging") ? "📦" : supplier.category.toLowerCase().includes("drink") ? "🥤" : "🏭"}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 950, letterSpacing: "-0.8px" }}>{supplier.name}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: accent, textTransform: "uppercase", letterSpacing: "1px" }}>{supplier.category}</span>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: mutedC }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: mutedC }}>Reliability: 98%</span>
            </div>
          </div>
        </div>
        <div style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "8px 16px", borderRadius: 14, fontSize: 12, fontWeight: 900 }}>ACTIVE</div>
      </div>

      <div style={{ background: dark ? "rgba(255, 255, 255, 0.01)" : "#f9fafb", borderRadius: 20, padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, border: `1px solid ${border}` }}>
         <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 900, color: mutedC, textTransform: "uppercase" }}>Linked Catalog</p>
            <p style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 800 }}>{supplier.items.length} Products</p>
         </div>
         <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 900, color: mutedC, textTransform: "uppercase" }}>Avg Prep Time</p>
            <p style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 800 }}>24-48h</p>
         </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: mutedC, fontSize: 14, fontWeight: 600 }}>
          <Phone size={16} color={accent} /> {supplier.contact}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: mutedC, fontSize: 14, fontWeight: 600 }}>
          <Clock size={16} color={accent} /> Last Restock: {new Date(supplier.lastRestocked).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button 
          onClick={onOrder}
          style={{ flex: 1, padding: "16px", borderRadius: 18, background: accent, color: "white", border: "none", fontWeight: 900, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: `0 8px 20px ${accent}33` }}
        >
          <ShoppingBag size={18} /> Order Stock
        </button>
        <button style={{ padding: "16px", width: 56, borderRadius: 18, background: "transparent", border: `1px solid ${border}`, color: "inherit", fontWeight: 900, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MessageSquare size={18} />
        </button>
      </div>
    </motion.div>
  );
}

function FormInput({ label, value, onChange, dark, placeholder }) {
  const border = dark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 950, color: dark ? "rgba(255, 255, 255, 0.4)" : "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>
      <input 
        value={value} 
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ padding: "16px 20px", borderRadius: 16, background: dark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc", border: `1px solid ${border}`, color: "inherit", fontWeight: 700, outline: "none", transition: "0.2s" }}
      />
    </div>
  );
}

function AnalyticsKpi({ label, value, trend, dark, icon }) {
  const border = dark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)";
  const glass = dark ? "rgba(255, 255, 255, 0.03)" : "white";
  const mutedC = dark ? "rgba(255, 255, 255, 0.4)" : "#64748b";

  return (
    <div style={{ background: glass, border: `1px solid ${border}`, borderRadius: 24, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 10px 20px rgba(0,0,0,0.02)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: mutedC, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
        <div style={{ color: "#6366f1", background: "rgba(99, 102, 241, 0.1)", padding: 8, borderRadius: 10 }}>{icon}</div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 24, fontWeight: 950 }}>{value}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: trend.includes("+") ? "#10b981" : "#6366f1" }}>{trend}</span>
      </div>
    </div>
  );
}
