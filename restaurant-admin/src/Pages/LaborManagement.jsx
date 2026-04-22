import { useState, useEffect } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import { 
  Users, 
  Plus, 
  Trash2,
  Briefcase,
  AlertTriangle
} from "lucide-react";
import ConfirmationModal from "../components/ConfirmationModal";

export default function LaborManagement() {
  const { dark } = useTheme();
  
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", role: "Waiter", hourlyWage: "", phone: "" });
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  useEffect(() => {
    loadStaffData();
  }, []);

  const loadStaffData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/staff/list");
      if (res.data.success) {
        setStaffList(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load staff", err);
    }
    setLoading(false);
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/api/staff/add", newStaff);
      if (res.data.success) {
        setStaffList([res.data.data, ...staffList]);
        setShowAddModal(false);
        setNewStaff({ name: "", role: "Waiter", hourlyWage: "", phone: "" });
      }
    } catch (err) {
      console.error("Failed to add staff", err);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await api.post("/api/staff/status", { id, status: newStatus });
      if (res.data.success) {
        setStaffList(staffList.map(s => s._id === id ? { ...s, status: newStatus } : s));
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleRemoveStaff = async (id) => {
    try {
      const res = await api.delete(`/api/staff/remove/${id}`);
      if (res.data.success) {
        setStaffList(staffList.filter(s => s._id !== id));
        setConfirmDelete({ open: false, id: null });
      }
    } catch (err) {
      console.error("Failed to delete staff", err);
    }
  };

  const accentColor = "#3b82f6"; // Work/Business Blue

  const cardStyle = {
    background: dark ? "rgba(15, 23, 42, 0.4)" : "#ffffff",
    backdropFilter: "blur(20px)",
    border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0",
    boxShadow: dark ? "0 10px 30px rgba(0,0,0,0.3)" : "0 4px 12px rgba(0,0,0,0.03)",
    borderRadius: 24,
    padding: 32,
  };

  const thStyle = { padding: "16px 24px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 };
  const tdStyle = { padding: "16px 24px", fontSize: 14 };

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 60 }}>
        
        {/* HEADER SECTION */}
        <div style={{ marginBottom: 40, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ 
                background: `${accentColor}15`, color: accentColor, 
                padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 800, 
                textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center", gap: 6 
              }}>
                <Briefcase size={14} />
                Workforce Hub
              </div>
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0, letterSpacing: "-1px", color: dark ? "#fff" : "#0f172a" }}>
              Labor & Staff <span style={{ color: "var(--muted)", fontWeight: 400 }}>Management</span>
            </h1>
            <p style={{ fontSize: 15, color: "var(--muted)", marginTop: 8, maxWidth: 600, lineHeight: 1.6 }}>
              Maintain your active employee roster, track roles, and oversee baseline labor expenditures across operations.
            </p>
          </div>
          
          <button 
            onClick={() => setShowAddModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "12px 20px",
              background: accentColor, color: "#fff", border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
            }}
          >
            <Plus size={18} /> Add New Staff
          </button>
        </div>

        {/* STAFF DIRECTORY */}
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
           {loading ? (
             <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>Loading staff directory...</div>
           ) : (
             <table style={{ width: "100%", borderCollapse: "collapse" }}>
               <thead>
                 <tr style={{ background: dark ? "rgba(255,255,255,0.02)" : "#f8fafc", borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#e2e8f0"}` }}>
                   <th style={thStyle}>Staff Member</th>
                   <th style={thStyle}>Role</th>
                   <th style={thStyle}>Hourly Wage</th>
                   <th style={thStyle}>Status</th>
                   <th style={thStyle}>Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {staffList.length === 0 ? (
                   <tr>
                     <td colSpan="5" style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
                       <Users size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                       <div style={{ fontWeight: 600 }}>Your roster is empty</div>
                       <div style={{ fontSize: 13, marginTop: 4 }}>Add employees to start tracking labor.</div>
                     </td>
                   </tr>
                 ) : (
                   staffList.map(staff => (
                     <tr key={staff._id} style={{ borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f1f5f9"}` }}>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ position: "relative" }}>
                              <div style={{ 
                                width: 32, height: 32, borderRadius: "50%", 
                                background: dark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 13, fontWeight: 900, color: accentColor
                              }}>
                                {staff.name.charAt(0)}
                              </div>
                              {staff.status === "Clocked In" && (
                                <div style={{ 
                                  position: "absolute", bottom: 0, right: 0, width: 10, height: 10, 
                                  background: "#10b981", borderRadius: "50%", border: `2px solid ${dark ? "#0f172a" : "#fff"}`,
                                  animation: "pulse-green 2s infinite"
                                }} />
                              )}
                              {staff.status === "On Break" && (
                                <div style={{ 
                                  position: "absolute", bottom: 0, right: 0, width: 10, height: 10, 
                                  background: "#f59e0b", borderRadius: "50%", border: `2px solid ${dark ? "#0f172a" : "#fff"}`
                                }} />
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800 }}>{staff.name}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{staff.phone || "No phone"}</div>
                            </div>
                          </div>
                        </td>
                       <td style={tdStyle}>
                         <span style={{ 
                           background: dark ? "rgba(255,255,255,0.05)" : "#f1f5f9", 
                           padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 
                         }}>{staff.role}</span>
                       </td>
                       <td style={tdStyle}>
                         <span style={{ fontWeight: 800 }}>AED {staff.hourlyWage}</span><span style={{ fontSize: 11, color: "var(--muted)" }}>/hr</span>
                       </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                             <div style={{ 
                               display: "inline-flex",
                               background: staff.status === "Clocked In" ? "rgba(16, 185, 129, 0.1)" : 
                                          staff.status === "On Break" ? "rgba(245, 158, 11, 0.1)" : "rgba(148, 163, 184, 0.1)",
                               color: staff.status === "Clocked In" ? "#10b981" : 
                                      staff.status === "On Break" ? "#f59e0b" : "#94a3b8",
                               padding: "4px 10px", borderRadius: 100, fontSize: 10, fontWeight: 900, textTransform: "uppercase",
                               width: "fit-content"
                             }}>
                               {staff.status}
                             </div>
                             
                             <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                                {["Clocked In", "On Break", "Shift Ended"].map(s => (
                                  staff.status !== s && (
                                    <button 
                                      key={s}
                                      onClick={() => handleUpdateStatus(staff._id, s)}
                                      style={{ 
                                        padding: "6px 12px", fontSize: 11, fontWeight: 800, borderRadius: 8,
                                        background: s === "Clocked In" ? "#10b981" : s === "On Break" ? "#f59e0b" : "#94a3b8",
                                        color: "white", border: "none",
                                        cursor: "pointer", transition: "all 0.2s",
                                        boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                                      }}
                                    >
                                      {s === "Clocked In" ? "PUNCH IN" : s === "On Break" ? "BREAK" : "FINISH"}
                                    </button>
                                  )
                                ))}
                             </div>
                          </div>
                        </td>
                       <td style={tdStyle}>
                          <button onClick={() => setConfirmDelete({ open: true, id: staff._id })} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: 6, opacity: 0.7 }}>
                            <Trash2 size={16} />
                          </button>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           )}
        </div>

      </div>

      {/* ADD STAFF MODAL */}
      {showAddModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1000,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: dark ? "#0f172a" : "#fff",
            border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`,
            borderRadius: 24, padding: 32, width: "100%", maxWidth: 400,
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
          }}>
             <h3 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 800 }}>Add Staff Member</h3>
             <form onSubmit={handleAddStaff} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--muted)" }}>FULL NAME</label>
                  <input type="text" required value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} 
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, background: dark ? "rgba(0,0,0,0.2)" : "#f8fafc", color: dark ? "#fff" : "#000", fontSize: 14 }} 
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--muted)" }}>ROLE</label>
                  <select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} 
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, background: dark ? "rgba(0,0,0,0.2)" : "#f8fafc", color: dark ? "#fff" : "#000", fontSize: 14 }}
                  >
                    <option value="Head Chef">Head Chef</option>
                    <option value="Sous Chef">Sous Chef</option>
                    <option value="Line Cook">Line Cook</option>
                    <option value="Manager">Manager</option>
                    <option value="Waiter">Waiter</option>
                    <option value="Delivery Driver">Delivery Driver</option>
                    <option value="Cashier">Cashier</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--muted)" }}>WAGE (AED/hr)</label>
                    <input type="number" required min="0" value={newStaff.hourlyWage} onChange={e => setNewStaff({...newStaff, hourlyWage: e.target.value})} 
                      style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, background: dark ? "rgba(0,0,0,0.2)" : "#f8fafc", color: dark ? "#fff" : "#000", fontSize: 14 }} 
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--muted)" }}>PHONE (Optional)</label>
                    <input type="text" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} 
                      style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, background: dark ? "rgba(0,0,0,0.2)" : "#f8fafc", color: dark ? "#fff" : "#000", fontSize: 14 }} 
                    />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
                  <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: "12px 20px", borderRadius: 12, border: "none", background: "transparent", color: "var(--muted)", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                  <button type="submit" style={{ padding: "12px 24px", borderRadius: 12, border: "none", background: accentColor, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save Staff</button>
                </div>
             </form>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={() => handleRemoveStaff(confirmDelete.id)}
        title="Remove Staff Member"
        message="Are you sure you want to remove this staff member? This will delete all their records."
        confirmText="Remove"
      />

      <style>{`
        @keyframes pulse-green {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>
    </RestaurantLayout>
  );
}
