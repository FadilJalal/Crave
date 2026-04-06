import { useEffect, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";

export default function Customers() {
  const { dark } = useTheme();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [expanded, setExpanded]   = useState(null);
  const [profiles, setProfiles]   = useState({});

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/restaurantadmin/customers");
      if (res.data.success) setCustomers(res.data.customers || []);
    } catch {}
    finally { setLoading(false); }
  };

  const loadProfile = async (userId) => {
    if (profiles[userId]) return;
    try {
      const res = await api.get(`/api/restaurantadmin/customer/${userId}`);
      if (res.data.success) setProfiles(prev => ({ ...prev, [userId]: res.data.data }));
    } catch {}
  };

  const toggleExpand = (userId) => {
    if (expanded === userId) { setExpanded(null); return; }
    setExpanded(userId);
    loadProfile(userId);
  };

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const textPrimary = dark ? "#f3f4f6" : "#111827";
  const textSecondary = dark ? "#cbd5e1" : "#9ca3af";
  const cardBg = dark ? "#0f172a" : "#ffffff";
  const surfaceBg = dark ? "#111827" : "#fafafa";
  const border = dark ? "#334155" : "#e5e7eb";
  const hoverBg = dark ? "#1f2937" : "#fafafa";
  const chipBg = dark ? "#1e293b" : "#f3f4f6";
  const inp = { padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${border}`, fontSize: 14, fontFamily: "inherit", outline: "none", background: cardBg, color: textPrimary, width: "100%", boxSizing: "border-box" };

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 860 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: textPrimary, letterSpacing: "-0.6px" }}>Customers</h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: textSecondary }}>
              {loading ? "Loading..." : `${customers.length} customer${customers.length !== 1 ? "s" : ""} have ordered from you`}
            </p>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 20 }}>
          <input
            style={inp}
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 72, background: chipBg, borderRadius: 16 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: textSecondary }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
            <div style={{ fontWeight: 700 }}>{search ? "No customers match your search" : "No customers yet"}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Customers who order from you will appear here</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(c => {
              const isOpen = expanded === c._id;
              const profile = profiles[c._id];
              return (
                <div key={c._id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, overflow: "hidden", boxShadow: dark ? "0 4px 18px rgba(0,0,0,0.32)" : "0 2px 8px rgba(0,0,0,0.04)" }}>

                  {/* Row */}
                  <div
                    onClick={() => toggleExpand(c._id)}
                    style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: chipBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, color: textPrimary, flexShrink: 0 }}>
                      {c.name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: textPrimary }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>{c.email}</div>
                    </div>
                    {profile && (
                      <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontWeight: 900, fontSize: 15, color: textPrimary }}>{profile.orderCount}</div>
                          <div style={{ fontSize: 10, color: textSecondary, fontWeight: 700, textTransform: "uppercase" }}>Orders</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontWeight: 900, fontSize: 15, color: textPrimary }}>AED {profile.totalSpent}</div>
                          <div style={{ fontSize: 10, color: textSecondary, fontWeight: 700, textTransform: "uppercase" }}>Spent</div>
                        </div>
                      </div>
                    )}
                    <span style={{ fontSize: 18, color: textSecondary, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>▾</span>
                  </div>

                  {/* Expanded profile */}
                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${border}`, padding: "18px 20px", background: surfaceBg }}>
                      {!profile ? (
                        <div style={{ fontSize: 13, color: textSecondary }}>Loading profile...</div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>

                          {/* Contact */}
                          <div style={{ background: cardBg, borderRadius: 14, padding: "14px 16px", border: `1px solid ${border}` }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Contact</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {profile.phone && (
                                <a href={`tel:${profile.phone}`} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: textPrimary, textDecoration: "none", fontWeight: 700 }}>
                                  <span>📞</span> {profile.phone}
                                </a>
                              )}
                              <a href={`mailto:${profile.email}`} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: textPrimary, textDecoration: "none", fontWeight: 700 }}>
                                <span>✉️</span> {profile.email}
                              </a>
                              {(profile.address?.area || profile.address?.city) && (
                                <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: textPrimary }}>
                                  <span>📍</span> {[profile.address.area, profile.address.city].filter(Boolean).join(", ")}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Stats */}
                          <div style={{ background: cardBg, borderRadius: 14, padding: "14px 16px", border: `1px solid ${border}` }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Order Stats</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                <span style={{ color: textSecondary }}>Total orders</span>
                                <span style={{ fontWeight: 800, color: textPrimary }}>{profile.orderCount}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                <span style={{ color: textSecondary }}>Total spent</span>
                                <span style={{ fontWeight: 800, color: textPrimary }}>AED {profile.totalSpent}</span>
                              </div>
                              {profile.orderCount > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                  <span style={{ color: textSecondary }}>Avg order</span>
                                  <span style={{ fontWeight: 800, color: textPrimary }}>AED {Math.round(profile.totalSpent / profile.orderCount)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Dates */}
                          <div style={{ background: cardBg, borderRadius: 14, padding: "14px 16px", border: `1px solid ${border}` }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>History</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {profile.firstOrderDate && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                  <span style={{ color: textSecondary }}>First order</span>
                                  <span style={{ fontWeight: 800, color: textPrimary }}>{new Date(profile.firstOrderDate).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" })}</span>
                                </div>
                              )}
                              {profile.lastOrderDate && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                  <span style={{ color: textSecondary }}>Last order</span>
                                  <span style={{ fontWeight: 800, color: textPrimary }}>{new Date(profile.lastOrderDate).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" })}</span>
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}