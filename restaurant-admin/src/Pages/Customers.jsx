import { useEffect, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";

export default function Customers() {
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

  const inp = { padding: "9px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, fontFamily: "inherit", outline: "none", background: "white", width: "100%", boxSizing: "border-box" };

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 860 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#111827", letterSpacing: "-0.6px" }}>Customers</h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#9ca3af" }}>
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
            {[1,2,3].map(i => <div key={i} style={{ height: 72, background: "#f3f4f6", borderRadius: 16 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
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
                <div key={c._id} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>

                  {/* Row */}
                  <div
                    onClick={() => toggleExpand(c._id)}
                    style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, color: "#374151", flexShrink: 0 }}>
                      {c.name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#111827" }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{c.email}</div>
                    </div>
                    {profile && (
                      <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontWeight: 900, fontSize: 15, color: "#111827" }}>{profile.orderCount}</div>
                          <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Orders</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontWeight: 900, fontSize: 15, color: "#111827" }}>AED {profile.totalSpent}</div>
                          <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Spent</div>
                        </div>
                      </div>
                    )}
                    <span style={{ fontSize: 18, color: "#9ca3af", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>▾</span>
                  </div>

                  {/* Expanded profile */}
                  {isOpen && (
                    <div style={{ borderTop: "1px solid #f3f4f6", padding: "18px 20px", background: "#fafafa" }}>
                      {!profile ? (
                        <div style={{ fontSize: 13, color: "#9ca3af" }}>Loading profile...</div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>

                          {/* Contact */}
                          <div style={{ background: "white", borderRadius: 14, padding: "14px 16px", border: "1px solid #e5e7eb" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Contact</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {profile.phone && (
                                <a href={`tel:${profile.phone}`} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#111827", textDecoration: "none", fontWeight: 700 }}>
                                  <span>📞</span> {profile.phone}
                                </a>
                              )}
                              <a href={`mailto:${profile.email}`} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#111827", textDecoration: "none", fontWeight: 700 }}>
                                <span>✉️</span> {profile.email}
                              </a>
                              {(profile.address?.area || profile.address?.city) && (
                                <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#374151" }}>
                                  <span>📍</span> {[profile.address.area, profile.address.city].filter(Boolean).join(", ")}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Stats */}
                          <div style={{ background: "white", borderRadius: 14, padding: "14px 16px", border: "1px solid #e5e7eb" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Order Stats</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                <span style={{ color: "#9ca3af" }}>Total orders</span>
                                <span style={{ fontWeight: 800, color: "#111827" }}>{profile.orderCount}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                <span style={{ color: "#9ca3af" }}>Total spent</span>
                                <span style={{ fontWeight: 800, color: "#111827" }}>AED {profile.totalSpent}</span>
                              </div>
                              {profile.orderCount > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                  <span style={{ color: "#9ca3af" }}>Avg order</span>
                                  <span style={{ fontWeight: 800, color: "#111827" }}>AED {Math.round(profile.totalSpent / profile.orderCount)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Dates */}
                          <div style={{ background: "white", borderRadius: 14, padding: "14px 16px", border: "1px solid #e5e7eb" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>History</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {profile.firstOrderDate && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                  <span style={{ color: "#9ca3af" }}>First order</span>
                                  <span style={{ fontWeight: 800, color: "#111827" }}>{new Date(profile.firstOrderDate).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" })}</span>
                                </div>
                              )}
                              {profile.lastOrderDate && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                  <span style={{ color: "#9ca3af" }}>Last order</span>
                                  <span style={{ fontWeight: 800, color: "#111827" }}>{new Date(profile.lastOrderDate).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" })}</span>
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