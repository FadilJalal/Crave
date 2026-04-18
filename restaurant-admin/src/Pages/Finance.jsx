import React, { useEffect, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { useTheme } from "../ThemeContext";
import { api } from "../utils/api";
import { toast } from "react-toastify";

const money = (v) => `AED ${Number(v || 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Finance() {
  const { dark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [editBank, setEditBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    accountHolder: "",
    bankName: "",
    iban: "",
    swiftCode: "",
  });

  useEffect(() => {
    fetchFinance();
  }, []);

  const fetchFinance = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/restaurantadmin/finance");
      if (res.data.success) {
        setData(res.data.data);
        setBankForm(res.data.data.bankDetails || {
          accountHolder: "",
          bankName: "",
          iban: "",
          swiftCode: "",
        });
      }
    } catch (err) {
      toast.error("Failed to load financial records");
    } finally {
      setLoading(false);
    }
  };

  const handleBankSave = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/api/restaurantadmin/bank-details", bankForm);
      if (res.data.success) {
        toast.success("Bank details saved successfully");
        setEditBank(false);
        fetchFinance();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error("Failed to update bank details");
    }
  };

  if (loading) return <RestaurantLayout><div style={{ padding: 40, textAlign: "center" }}>Loading Financial Records...</div></RestaurantLayout>;

  const { summary, payouts } = data || {};
  const surface = dark ? "#111827" : "#fff";
  const border = dark ? "rgba(255,255,255,0.08)" : "#e2e8f0";

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        
        {/* Header Section */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 950, margin: 0, letterSpacing: "-1.5px" }}>Billing & Payouts</h1>
          <p style={{ margin: "4px 0 0", color: dark ? "rgba(255,255,255,0.5)" : "#64748b", fontWeight: 500 }}>
            Management of your bank account and tracking of funds disbursed to you.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: 32 }}>
          
          {/* Left Column: Balance & Bank */}
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            
            {/* Balance Card */}
            <div style={{ 
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", 
              borderRadius: 32, padding: 32, color: "white",
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
            }}>
              <div style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Available Balance</div>
              <div style={{ fontSize: 48, fontWeight: 950, letterSpacing: "-2px" }}>{money(summary?.currentBalance)}</div>
              <p style={{ fontSize: 14, marginTop: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                This is the net amount waiting to be paid out. Payouts are typically processed every Monday.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 32, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24 }}>
                <div>
                   <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Lifetime Paid</div>
                   <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{money(summary?.totalPaidPayouts)}</div>
                </div>
                <div>
                   <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Commission ({summary?.commissionRate}%)</div>
                   <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4, color: "#ff4e2a" }}>{money(summary?.totalCommission)}</div>
                </div>
              </div>
            </div>

            {/* Bank Details Card */}
            <div style={{ background: surface, borderRadius: 32, padding: 32, border: `1px solid ${border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Payout Settings</h3>
                {!editBank && (
                  <button 
                    onClick={() => setEditBank(true)}
                    style={{ background: "none", border: "none", color: "#3b82f6", fontWeight: 800, cursor: "pointer", fontSize: 14 }}
                  >
                    Edit Bank
                  </button>
                )}
              </div>

              {editBank ? (
                <form onSubmit={handleBankSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: dark ? "#9ca3af" : "#6b7280" }}>Account Holder Name</label>
                    <input 
                      value={bankForm.accountHolder} 
                      onChange={e => setBankForm({...bankForm, accountHolder: e.target.value})}
                      style={{ padding: "12px 16px", borderRadius: 12, border: `1px solid ${border}`, background: dark ? "rgba(255,255,255,0.05)" : "#f9fafb", color: "inherit" }}
                      required
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: dark ? "#9ca3af" : "#6b7280" }}>Bank Name</label>
                    <input 
                      value={bankForm.bankName} 
                      onChange={e => setBankForm({...bankForm, bankName: e.target.value})}
                      style={{ padding: "12px 16px", borderRadius: 12, border: `1px solid ${border}`, background: dark ? "rgba(255,255,255,0.05)" : "#f9fafb", color: "inherit" }}
                      required
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: dark ? "#9ca3af" : "#6b7280" }}>IBAN</label>
                    <input 
                      value={bankForm.iban} 
                      onChange={e => setBankForm({...bankForm, iban: e.target.value})}
                      style={{ padding: "12px 16px", borderRadius: 12, border: `1px solid ${border}`, background: dark ? "rgba(255,255,255,0.05)" : "#f9fafb", color: "inherit" }}
                      placeholder="AE..."
                      required
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: dark ? "#9ca3af" : "#6b7280" }}>SWIFT/BIC Code (Optional)</label>
                    <input 
                      value={bankForm.swiftCode} 
                      onChange={e => setBankForm({...bankForm, swiftCode: e.target.value})}
                      style={{ padding: "12px 16px", borderRadius: 12, border: `1px solid ${border}`, background: dark ? "rgba(255,255,255,0.05)" : "#f9fafb", color: "inherit" }}
                    />
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
                    <button type="submit" style={{ flex: 1, padding: 14, borderRadius: 12, background: "#ff4e2a", color: "white", fontWeight: 800, border: "none", cursor: "pointer" }}>Save Details</button>
                    <button type="button" onClick={() => setEditBank(false)} style={{ padding: 14, borderRadius: 12, background: dark ? "rgba(255,255,255,0.1)" : "#f1f5f9", fontWeight: 800, border: "none", cursor: "pointer" }}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "#3b82f615", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏦</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>Receiving Bank</div>
                        <div style={{ fontWeight: 800 }}>{data.bankDetails?.bankName || "Not Setup"}</div>
                      </div>
                   </div>
                   <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "#10b98115", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>Beneficiary</div>
                        <div style={{ fontWeight: 800 }}>{data.bankDetails?.accountHolder || "Not Setup"}</div>
                      </div>
                   </div>
                   <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "#8b5cf615", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💳</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>IBAN Number</div>
                        <div style={{ fontWeight: 800, letterSpacing: 0.5 }}>{data.bankDetails?.iban || "Not Setup"}</div>
                      </div>
                   </div>
                   {(!data.bankDetails?.iban) && (
                     <div style={{ background: "#fff7ed", color: "#9a3412", padding: 16, borderRadius: 16, fontSize: 13, fontWeight: 700, border: "1px solid #fed7aa" }}>
                       📢 Please add your bank details to enable automatic payouts.
                     </div>
                   )}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Payout History */}
          <div style={{ background: surface, borderRadius: 32, padding: 32, border: `1px solid ${border}`, display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: 32 }}>
               <h3 style={{ margin: 0, fontSize: 24, fontWeight: 950, letterSpacing: "-1px" }}>Payout History</h3>
               <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--muted)", fontWeight: 500 }}>Recent transfers from Crave to your bank account.</p>
            </div>

            {payouts?.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", opacity: 0.5 }}>
                 <div style={{ fontSize: 64, marginBottom: 16 }}>📉</div>
                 <h4 style={{ margin: 0, fontWeight: 900 }}>No Disbursements Found</h4>
                 <p style={{ fontSize: 13, maxWidth: 200, marginTop: 8 }}>Your first payout will appear here once your balance is processed.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {payouts?.map(payout => (
                  <div key={payout._id} style={{ 
                    padding: 20, borderRadius: 20, border: `1px solid ${border}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: dark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)"
                  }}>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <div style={{ 
                        width: 48, height: 48, borderRadius: 14, 
                        background: payout.status === "Processed" ? "#10b98115" : payout.status === "Failed" ? "#ef444415" : "rgba(255,255,255,0.05)",
                        color: payout.status === "Processed" ? "#10b981" : payout.status === "Failed" ? "#ef4444" : "inherit",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
                      }}>
                        {payout.status === "Processed" ? "✓" : "⏳"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 16 }}>{money(payout.amount)}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{new Date(payout.processedAt || payout.createdAt).toLocaleDateString([], { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                       <span style={{ 
                         fontSize: 10, fontWeight: 900, padding: "5px 12px", borderRadius: 8, 
                         background: payout.status === "Processed" ? "#10b98120" : "#6366f120", 
                         color: payout.status === "Processed" ? "#10b981" : "#6366f1",
                         textTransform: "uppercase", letterSpacing: "1px"
                       }}>
                         {payout.status}
                       </span>
                       <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, marginTop: 4 }}>ID: {payout.referenceId || "Pending"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </RestaurantLayout>
  );
}
