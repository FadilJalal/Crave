import { useEffect, useState } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";

const empty = { code: "", type: "percent", value: "", minOrder: "", maxUses: "", expiresAt: "" };

const quickGoals = [
  "Weekend family bundle",
  "Lunch rush boost",
  "Win back inactive customers",
  "Increase average basket size",
];

const toDateTimeLocal = (days) => {
  if (!days) return "";
  const date = new Date();
  date.setDate(date.getDate() + Number(days));
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const getPromoId = (promo) => String(promo?._id || promo?.id || "");
const normalizePromos = (list = []) => list.map((promo) => ({ ...promo, _id: promo?._id || promo?.id }));

export default function Promos() {
  const { dark } = useTheme();
  const [isPhone, setIsPhone] = useState(() => window.innerWidth <= 768);
  const [promos, setPromos] = useState([]);
  const [hoveredPromoId, setHoveredPromoId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyPromoId, setBusyPromoId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(empty);
  const [creating, setCreating] = useState(false);
  const [aiGoal, setAiGoal] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiIdeas, setAiIdeas] = useState([]);
  const [aiHeadline, setAiHeadline] = useState("AI promo suggestions");
  const [status, setStatus] = useState(null);

  const setPromosSafe = (next) => {
    setPromos((prev) => (typeof next === "function" ? next(prev) : next));
  };

  const textPrimary = dark ? "#f8fafc" : "#111827";
  const textSecondary = dark ? "rgba(248,250,252,0.76)" : "#6b7280";
  const surface = dark ? "linear-gradient(165deg, rgba(15,23,42,0.98), rgba(17,24,39,0.95))" : "linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%)";
  const surfaceBorder = dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid #ece7f5";
  const inputBg = dark ? "rgba(15,23,42,0.9)" : "#fff";
  const inputBorder = dark ? "1.5px solid rgba(148,163,184,0.35)" : "1.5px solid #e6e7ef";

  const showStatus = (type, text) => {
    setStatus({ type, text });
  };

  useEffect(() => {
    if (!status) return undefined;
    const timeout = setTimeout(() => setStatus(null), 3500);
    return () => clearTimeout(timeout);
  }, [status]);

  const isExpiredPromo = (promo) => Boolean(promo?.expiresAt) && new Date(promo.expiresAt) < new Date();

  const activePromos = promos.filter((promo) => promo.isActive).length;
  const totalRedemptions = promos.reduce((sum, promo) => sum + Number(promo.usedCount || 0), 0);
  const expiringSoon = promos.filter((promo) => {
    if (!promo.expiresAt) return false;
    const diff = new Date(promo.expiresAt).getTime() - Date.now();
    return diff > 0 && diff <= 1000 * 60 * 60 * 24 * 7;
  }).length;

  const filteredPromos = promos
    .filter((promo) => {
      const code = String(promo?.code || "").toLowerCase();
      const matchSearch = code.includes(searchTerm.trim().toLowerCase());
      if (!matchSearch) return false;

      if (filter === "active") return promo.isActive && !isExpiredPromo(promo);
      if (filter === "paused") return !promo.isActive;
      if (filter === "expired") return isExpiredPromo(promo);
      return true;
    })
    .sort((a, b) => {
      const aTime = new Date(a?.createdAt || 0).getTime();
      const bTime = new Date(b?.createdAt || 0).getTime();
      return bTime - aTime;
    });

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/promo/list?t=${Date.now()}`);
      if (res.data?.success) {
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.promos)
            ? res.data.promos
            : [];
        setPromosSafe(normalizePromos(list));
      } else {
        showStatus("error", res.data?.message || "Failed to load promo codes");
      }
    } catch {
      showStatus("error", "Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const onChange = (event) => setIsPhone(event.matches);
    setIsPhone(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setStatus(null);
    try {
      const res = await api.post("/api/promo/create", form);
      if (res.data.success) {
        if (res.data?.data?._id) {
          setPromosSafe((prev) => [res.data.data, ...prev]);
        }
        showStatus("success", "Promo code created!");
        setForm(empty);
        fetchPromos();
      } else {
        showStatus("error", res.data.message || "Failed to create promo code.");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Error creating promo code";
      showStatus("error", msg);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id) => {
    setStatus(null);
    if (!id) {
      showStatus("error", "Promo id missing. Please refresh and try again.");
      return;
    }
    try {
      setBusyPromoId(String(id));
      const res = await api.post("/api/promo/toggle", { id });
      if (res.data.success) {
        setPromosSafe((prev) => prev.map((promo) => (
          getPromoId(promo) === String(id) ? { ...promo, isActive: !promo.isActive } : promo
        )));
        fetchPromos();
      } else {
        showStatus("error", res.data?.message || "Error updating promo");
      }
    } catch {
      showStatus("error", "Error updating promo");
    } finally {
      setBusyPromoId("");
    }
  };

  const handleDelete = async (id) => {
    setStatus(null);
    if (!id) {
      showStatus("error", "Promo id missing. Please refresh and try again.");
      return;
    }

    try {
      setBusyPromoId(String(id));
      let res = await api.delete(`/api/promo/${id}`);
      if (!res.data?.success) {
        res = await api.post("/api/promo/delete", { id });
      }

      if (res.data?.success) {
        setPromosSafe((prev) => prev.filter((promo) => getPromoId(promo) !== String(id)));
        showStatus("success", "Promo deleted");
        fetchPromos();
      } else {
        showStatus("error", res.data?.message || "Could not delete promo code.");
      }
    } catch {
      showStatus("error", "Error deleting promo");
    } finally {
      setBusyPromoId("");
      setDeleteTarget(null);
    }
  };

  const openDeleteModal = (promo) => {
    const id = getPromoId(promo);
    if (!id) {
      showStatus("error", "Promo id missing. Please refresh and try again.");
      return;
    }
    setDeleteTarget({ id, code: promo?.code || "this promo" });
  };

  const handleGenerateAi = async () => {
    setAiLoading(true);
    setStatus(null);
    try {
      const res = await api.post("/api/promo/ai-suggest", { goal: aiGoal });
      if (res.data.success) {
        setAiIdeas(res.data.data?.suggestions || []);
        setAiHeadline(res.data.data?.headline || "AI promo suggestions");
        showStatus("success", "AI promo ideas ready.");
      } else {
        showStatus("error", res.data.message || "Could not generate promo ideas.");
      }
    } catch {
      showStatus("error", "Failed to generate promo ideas.");
    } finally {
      setAiLoading(false);
    }
  };

  const applySuggestion = (idea) => {
    setForm({
      code: idea.code || "",
      type: idea.type || "percent",
      value: String(idea.value || ""),
      minOrder: String(idea.minOrder || 0),
      maxUses: idea.maxUses ? String(idea.maxUses) : "",
      expiresAt: idea.expiresInDays ? toDateTimeLocal(idea.expiresInDays) : "",
    });
    showStatus("success", `Applied ${idea.code} to the form.`);
  };

  return (
    <RestaurantLayout>
      <div style={{ width: "100%", maxWidth: 1120, margin: "0 auto", padding: isPhone ? "0" : "0 4px", boxSizing: "border-box", color: textPrimary }}>
        <div style={{
          position: "relative",
          overflow: "hidden",
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-end",
          flexWrap: "wrap",
          marginBottom: 20,
          padding: "24px 24px 22px",
          borderRadius: 28,
          background: "linear-gradient(135deg, #111827 0%, #1f2937 42%, #ff5a36 100%)",
          boxShadow: "0 22px 60px rgba(17,24,39,0.18)",
        }}>
          <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", top: -90, right: 140, background: "rgba(255,255,255,0.10)", filter: "blur(6px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: 180, height: 180, borderRadius: 32, bottom: -70, right: -20, background: "rgba(255,255,255,0.08)", transform: "rotate(24deg)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: isPhone ? 32 : 42, lineHeight: 0.95, fontWeight: 900, letterSpacing: "-0.05em", color: "white" }}>Promo Codes</h1>
            <p style={{ color: "rgba(255,255,255,0.82)", margin: 0, fontSize: 15, maxWidth: 640, lineHeight: 1.5 }}>
              Launch discount drops that actually feel sharp. Create codes manually or let AI generate campaign ideas from your menu.
            </p>
          </div>
        </div>

        {status && (
          <div
            style={{
              marginBottom: 14,
              padding: "11px 14px",
              borderRadius: 12,
              border: status.type === "success" ? "1px solid #bbf7d0" : "1px solid #fecaca",
              background: status.type === "success" ? "#f0fdf4" : "#fef2f2",
              color: status.type === "success" ? "#166534" : "#991b1b",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {status.text}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
          <div style={{ background: dark ? "linear-gradient(180deg, #10213b 0%, #1f2937 100%)" : "linear-gradient(180deg, #ffffff 0%, #fff7f3 100%)", border: dark ? "1px solid rgba(255,216,204,0.32)" : "1px solid #ffd8cc", borderRadius: 22, padding: 18, boxShadow: dark ? "0 10px 28px rgba(0,0,0,0.35)" : "0 10px 28px rgba(255,90,54,0.08)" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "#9a3412", textTransform: "uppercase", letterSpacing: "0.08em" }}>Active promos</p>
            <p style={{ margin: "8px 0 0", fontSize: 34, fontWeight: 900, color: textPrimary, letterSpacing: "-0.04em" }}>{activePromos}</p>
          </div>
          <div style={{ background: dark ? "linear-gradient(180deg, #0f233f 0%, #1e293b 100%)" : "linear-gradient(180deg, #ffffff 0%, #f5f7ff 100%)", border: dark ? "1px solid rgba(219,228,255,0.32)" : "1px solid #dbe4ff", borderRadius: 22, padding: 18, boxShadow: dark ? "0 10px 28px rgba(0,0,0,0.35)" : "0 10px 28px rgba(59,130,246,0.08)" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Total redemptions</p>
            <p style={{ margin: "8px 0 0", fontSize: 34, fontWeight: 900, color: textPrimary, letterSpacing: "-0.04em" }}>{totalRedemptions}</p>
          </div>
          <div style={{ background: dark ? "linear-gradient(180deg, #11271d 0%, #1f2937 100%)" : "linear-gradient(180deg, #ffffff 0%, #f7fff7 100%)", border: dark ? "1px solid rgba(214,245,220,0.28)" : "1px solid #d6f5dc", borderRadius: 22, padding: 18, boxShadow: dark ? "0 10px 28px rgba(0,0,0,0.35)" : "0 10px 28px rgba(34,197,94,0.08)" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.08em" }}>Expiring in 7 days</p>
            <p style={{ margin: "8px 0 0", fontSize: 34, fontWeight: 900, color: textPrimary, letterSpacing: "-0.04em" }}>{expiringSoon}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "minmax(320px, 1.1fr) minmax(320px, 1fr)", gap: 18, alignItems: "start", marginBottom: 24 }}>
          <div style={{ background: dark ? "linear-gradient(165deg, rgba(15,23,42,0.98), rgba(17,24,39,0.95))" : "linear-gradient(155deg, #fff4ee 0%, #fff9f6 46%, #fff 100%)", border: dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid #ffd5c8", borderRadius: 28, padding: 22, boxShadow: dark ? "0 16px 40px rgba(0,0,0,0.35)" : "0 16px 40px rgba(255,78,42,0.12)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: "auto -40px -50px auto", width: 180, height: 180, borderRadius: "50%", background: "rgba(255,90,54,0.08)", pointerEvents: "none" }} />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 30, lineHeight: 0.95, letterSpacing: "-0.04em", fontWeight: 900, color: textPrimary }}>Generate with AI</h3>
                <p style={{ margin: "10px 0 0", fontSize: 14, color: textSecondary, maxWidth: 460, lineHeight: 1.55 }}>
                  Tell AI what campaign you want and it will generate ready-to-use promo ideas based on your menu and existing codes.
                </p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 900, color: "#ff4e2a", background: dark ? "rgba(255,255,255,0.05)" : "white", border: dark ? "1px solid rgba(255,215,202,0.18)" : "1px solid #ffd7ca", borderRadius: 999, padding: "8px 12px", boxShadow: dark ? "none" : "0 8px 18px rgba(255,78,42,0.08)" }}>
                AI Assist
              </span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: textPrimary, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>What kind of promo do you want?</label>
              <textarea
                style={{ width: "100%", minHeight: 104, resize: "vertical", padding: "14px 15px", borderRadius: 18, border: dark ? "1.5px solid rgba(255,214,202,0.18)" : "1.5px solid #ffd6ca", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: dark ? "rgba(2,6,23,0.72)" : "rgba(255,255,255,0.9)", color: textPrimary, lineHeight: 1.5, boxShadow: "inset 0 1px 1px rgba(0,0,0,0.02)" }}
                placeholder="e.g. I want a strong weekend promo for family orders without hurting margins too much"
                value={aiGoal}
                onChange={(e) => setAiGoal(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {quickGoals.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => setAiGoal(goal)}
                  style={{ padding: "9px 14px", borderRadius: 999, border: dark ? "1px solid rgba(255,211,198,0.16)" : "1px solid #ffd3c6", background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.78)", color: dark ? "#fdba74" : "#9a3412", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: dark ? "none" : "0 6px 14px rgba(255,78,42,0.05)" }}
                >
                  {goal}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={aiLoading}
              onClick={handleGenerateAi}
              style={{ padding: "14px 18px", borderRadius: 16, background: "linear-gradient(135deg, #111827 0%, #ff5a36 100%)", color: "white", border: "none", fontWeight: 900, cursor: "pointer", fontSize: 13, fontFamily: "inherit", minWidth: 180, boxShadow: "0 14px 28px rgba(255,78,42,0.18)" }}
            >
              {aiLoading ? "Generating..." : "Generate Ideas"}
            </button>

            {aiIdeas.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 900, color: textPrimary, textTransform: "uppercase", letterSpacing: "0.06em" }}>{aiHeadline}</p>
                <div style={{ display: "grid", gap: 12 }}>
                  {aiIdeas.map((idea, idx) => (
                    <div key={`${idea.code}-${idx}`} style={{ background: dark ? "linear-gradient(165deg, rgba(2,6,23,0.78), rgba(15,23,42,0.88))" : "linear-gradient(180deg, #ffffff 0%, #fff7f4 100%)", border: dark ? "1px solid rgba(255,224,214,0.14)" : "1px solid #ffe0d6", borderRadius: 20, padding: 16, display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr auto", gap: 12, alignItems: "center", boxShadow: dark ? "0 10px 22px rgba(0,0,0,0.28)" : "0 10px 22px rgba(255,78,42,0.07)" }}>
                      <div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontWeight: 900, fontSize: 15, fontFamily: "monospace", letterSpacing: "0.04em", color: textPrimary }}>{idea.code}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: idea.type === "percent" ? "#eff6ff" : "#f0fdf4", color: idea.type === "percent" ? "#1d4ed8" : "#15803d" }}>
                            {idea.type === "percent" ? `${idea.value}% off` : `AED ${idea.value} off`}
                          </span>
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>Min AED {idea.minOrder || 0}</span>
                        </div>
                        <p style={{ margin: "0 0 6px", fontSize: 13, color: dark ? "#e2e8f0" : "#374151", fontWeight: 600 }}>{idea.reason}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                          {idea.maxUses ? `${idea.maxUses} uses` : "Unlimited uses"} • {idea.expiresInDays ? `Expires in ${idea.expiresInDays} days` : "No expiry"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applySuggestion(idea)}
                        style={{ padding: "11px 15px", borderRadius: 12, background: "#111827", color: "white", border: "1px solid #111827", fontWeight: 900, cursor: "pointer", fontSize: 12, fontFamily: "inherit", whiteSpace: "nowrap", boxShadow: "0 10px 20px rgba(17,24,39,0.10)" }}
                      >
                        Use This
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ background: surface, border: surfaceBorder, borderRadius: 28, padding: 24, boxShadow: dark ? "0 16px 34px rgba(0,0,0,0.35)" : "0 16px 34px rgba(17,24,39,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 30, lineHeight: 0.95, letterSpacing: "-0.04em", fontWeight: 900, color: textPrimary }}>Create new promo code</h3>
                <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--muted)" }}>Use AI ideas or build one manually.</p>
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#4338ca", background: "#eef2ff", border: "1px solid #dbe4ff", borderRadius: 999, padding: "8px 12px" }}>
                Code must be unique per restaurant
              </div>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: textPrimary, display: "block", marginBottom: 6 }}>Code</label>
                  <input
                    style={{ width: "100%", padding: "12px 13px", borderRadius: 16, border: inputBorder, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.05em", background: inputBg, color: textPrimary }}
                    placeholder="e.g. SAVE20"
                    value={form.code}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: textPrimary, display: "block", marginBottom: 6 }}>Discount type</label>
                  <select
                    style={{ width: "100%", padding: "12px 13px", borderRadius: 16, border: inputBorder, fontSize: 14, fontFamily: "inherit", outline: "none", background: inputBg, boxSizing: "border-box", fontWeight: 700, color: textPrimary }}
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat amount (AED)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: textPrimary, display: "block", marginBottom: 6 }}>
                    Value ({form.type === "percent" ? "%" : "AED"})
                  </label>
                  <input
                    style={{ width: "100%", padding: "12px 13px", borderRadius: 16, border: inputBorder, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: inputBg, color: textPrimary }}
                    type="number"
                    min="1"
                    placeholder={form.type === "percent" ? "e.g. 20" : "e.g. 15"}
                    value={form.value}
                    onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: textPrimary, display: "block", marginBottom: 6 }}>Min order (AED)</label>
                  <input
                    style={{ width: "100%", padding: "12px 13px", borderRadius: 16, border: inputBorder, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: inputBg, color: textPrimary }}
                    type="number"
                    min="0"
                    placeholder="0 = no minimum"
                    value={form.minOrder}
                    onChange={(e) => setForm((p) => ({ ...p, minOrder: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: textPrimary, display: "block", marginBottom: 6 }}>Max uses</label>
                  <input
                    style={{ width: "100%", padding: "12px 13px", borderRadius: 16, border: inputBorder, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: inputBg, color: textPrimary }}
                    type="number"
                    min="1"
                    placeholder="Leave blank for unlimited"
                    value={form.maxUses}
                    onChange={(e) => setForm((p) => ({ ...p, maxUses: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: textPrimary, display: "block", marginBottom: 6 }}>Expiry date</label>
                  <input
                    style={{ width: "100%", padding: "12px 13px", borderRadius: 16, border: inputBorder, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: inputBg, color: textPrimary }}
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, color: textSecondary, padding: "10px 12px", borderRadius: 14, background: dark ? "rgba(255,255,255,0.04)" : "#f9fafb", border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #eceff5" }}>
                  Preview: <strong style={{ color: textPrimary }}>{form.code || "CODE"}</strong> • <strong style={{ color: textPrimary }}>{form.type === "flat" ? `AED ${form.value || 0} off` : `${form.value || 0}% off`}</strong>
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  style={{ padding: "13px 28px", borderRadius: 50, background: "linear-gradient(135deg,#ff4e2a,#ff6a3d)", color: "white", border: "none", fontWeight: 900, cursor: "pointer", fontSize: 14, fontFamily: "inherit", boxShadow: "0 14px 28px rgba(255,78,42,0.22)" }}
                >
                  {creating ? "Creating..." : "Create Promo Code"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {loading && <div style={{ opacity: 0.5, fontSize: 14, marginBottom: 12 }}>Loading...</div>}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 28, lineHeight: 0.95, letterSpacing: "-0.04em", fontWeight: 900 }}>Existing promo codes</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>Manage your live, expired, and draft promo offers.</p>
          </div>
          <button
            type="button"
            onClick={fetchPromos}
            disabled={loading}
            style={{ padding: "10px 14px", borderRadius: 12, border: dark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #e5e7eb", background: dark ? "rgba(255,255,255,0.04)" : "white", color: textPrimary, cursor: "pointer", fontWeight: 800, fontSize: 12, fontFamily: "inherit" }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "minmax(220px, 1fr) auto", gap: 10, marginBottom: 12 }}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search promo code (e.g. SAVE20)"
            style={{ width: "100%", padding: "11px 12px", borderRadius: 12, border: dark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #e5e7eb", background: dark ? "rgba(255,255,255,0.04)" : "white", color: textPrimary, outline: "none", fontSize: 13, fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "paused", label: "Paused" },
              { key: "expired", label: "Expired" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                style={{
                  padding: "9px 12px",
                  borderRadius: 999,
                  border: filter === item.key ? "1px solid #ffb6a4" : (dark ? "1px solid rgba(255,255,255,0.16)" : "1px solid #eceff5"),
                  background: filter === item.key ? "#fff1ec" : (dark ? "rgba(255,255,255,0.04)" : "white"),
                  color: filter === item.key ? "#c2410c" : (dark ? "#e2e8f0" : "#374151"),
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: "inherit",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredPromos.map((promo) => (
            (() => {
              const promoId = getPromoId(promo);
              return (
            <div
              key={promoId || promo.code}
              onMouseEnter={() => setHoveredPromoId(promoId)}
              onMouseLeave={() => setHoveredPromoId("")}
              style={{
                background: dark ? "linear-gradient(165deg, rgba(15,23,42,0.98), rgba(17,24,39,0.95))" : "linear-gradient(180deg, #ffffff 0%, #fffdfc 100%)",
                border: hoveredPromoId === promoId ? "1px solid #ffd4c7" : (dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid #eee6e2"),
                borderRadius: 22,
                padding: "16px 18px",
                display: "flex",
                flexDirection: isPhone ? "column" : "row",
                alignItems: isPhone ? "stretch" : "center",
                gap: 14,
                boxShadow: hoveredPromoId === promoId ? "0 18px 36px rgba(17,24,39,0.10)" : "0 14px 30px rgba(17,24,39,0.05)",
                opacity: promo.isActive ? 1 : 0.55,
                transform: hoveredPromoId === promoId ? "translateY(-2px)" : "translateY(0)",
                transition: "opacity 0.2s, transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
              }}
            >
              <div style={{ minWidth: isPhone ? "auto" : 120 }}>
                <span style={{ display: "inline-block", fontWeight: 900, fontSize: 15, fontFamily: "monospace", letterSpacing: "0.04em", marginBottom: 6, color: textPrimary }}>{promo.code}</span>
                <div style={{ fontSize: 11, color: promo.isActive ? "#15803d" : textSecondary, fontWeight: 800 }}>
                  {promo.isActive ? "Live" : "Paused"}
                </div>
              </div>

              <div style={{ flex: 1, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: promo.type === "percent" ? "#eff6ff" : "#f0fdf4", color: promo.type === "percent" ? "#1d4ed8" : "#15803d" }}>
                  {promo.type === "percent" ? `${promo.value}% off` : `AED ${promo.value} off`}
                </span>
                {promo.minOrder > 0 && <span style={{ fontSize: 12, color: "var(--muted)" }}>Min AED {promo.minOrder}</span>}
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Used: {promo.usedCount}{promo.maxUses ? `/${promo.maxUses}` : " total"}</span>
                {promo.expiresAt && (
                  <span style={{ fontSize: 12, color: new Date(promo.expiresAt) < new Date() ? "#dc2626" : "var(--muted)" }}>
                    {new Date(promo.expiresAt) < new Date() ? "Expired" : `Expires ${new Date(promo.expiresAt).toLocaleDateString()}`}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: isPhone ? "flex-start" : "flex-end" }}>
                <button
                  onClick={() => handleToggle(promoId)}
                  disabled={busyPromoId === promoId}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 12,
                    border: promo.isActive ? "1.5px solid #86efac" : "1.5px solid #93c5fd",
                    background: promo.isActive ? "#dcfce7" : "#dbeafe",
                    color: promo.isActive ? "#166534" : "#1d4ed8",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: "inherit",
                    boxShadow: promo.isActive ? "0 6px 14px rgba(22,101,52,0.15)" : "0 6px 14px rgba(29,78,216,0.15)",
                  }}
                >
                  {busyPromoId === promoId ? "Working..." : promo.isActive ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(String(promo.code || ""));
                      showStatus("success", `Copied ${promo.code}`);
                    } catch {
                      showStatus("error", "Could not copy promo code.");
                    }
                  }}
                  style={{ padding: "8px 12px", borderRadius: 12, border: dark ? "1px solid rgba(255,255,255,0.18)" : "1px solid #e5e7eb", background: dark ? "rgba(255,255,255,0.04)" : "#f9fafb", color: textPrimary, cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: "inherit" }}
                >
                  Copy
                </button>
                <button
                  onClick={() => openDeleteModal(promo)}
                  disabled={busyPromoId === promoId}
                  style={{ padding: "8px 12px", borderRadius: 12, border: "none", background: "#fff1f2", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: "inherit" }}
                >
                  {busyPromoId === promoId ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
              );
            })()
          ))}

          {!loading && filteredPromos.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)", background: dark ? "rgba(255,255,255,0.04)" : "white", border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid var(--border)", borderRadius: 14 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🏷️</div>
              <p style={{ fontWeight: 700, margin: 0 }}>{promos.length === 0 ? "No promo codes yet" : "No promos match this filter"}</p>
              <p style={{ fontSize: 13, margin: "6px 0 0" }}>
                {promos.length === 0 ? "Create your first code above to offer discounts to your customers." : "Try changing filter or search term to find your promo."}
              </p>
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div
          onClick={() => {
            if (!busyPromoId) setDeleteTarget(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              borderRadius: 20,
              background: dark ? "linear-gradient(165deg, rgba(15,23,42,0.98), rgba(17,24,39,0.95))" : "white",
              border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #e5e7eb",
              boxShadow: "0 28px 60px rgba(15,23,42,0.25)",
              padding: 22,
            }}
          >
            <h4 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: textPrimary, letterSpacing: "-0.02em" }}>
              Delete promo code?
            </h4>
            <p style={{ margin: "10px 0 0", fontSize: 14, color: textSecondary, lineHeight: 1.55 }}>
              You are deleting <strong style={{ color: textPrimary }}>{deleteTarget.code}</strong>. This action cannot be undone.
            </p>

            <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={Boolean(busyPromoId)}
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                  background: "white",
                  color: "#374151",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(busyPromoId)}
                onClick={() => handleDelete(deleteTarget.id)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "1px solid #ef4444",
                  background: "#ef4444",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {busyPromoId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}