import { useState, useEffect } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import { 
  MessageSquare, 
  Star, 
  Send, 
  RotateCcw, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Filter,
  ArrowUpDown,
  Sparkles,
  Undo2
} from "lucide-react";
import { toast } from "react-toastify";
import ConfirmationModal from "../components/ConfirmationModal";

export default function ReviewReply() {
  const { dark } = useTheme();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({}); // { reviewId: string }
  const [defaults, setDefaults] = useState({}); // { reviewId: string } 
  const [instructions, setInstructions] = useState({}); // { reviewId: string }
  const [generating, setGenerating] = useState({}); // { reviewId: boolean }
  const [approving, setApproving] = useState({}); // { reviewId: boolean }
  const [deleteId, setDeleteId] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); 
  const [filterRating, setFilterRating] = useState("all");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [filterSentiment, setFilterSentiment] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  const filteredReviews = reviews.filter(rev => {
    const matchesSearch = 
      rev.userName.toLowerCase().includes(search.toLowerCase()) || 
      rev.comment.toLowerCase().includes(search.toLowerCase());
    
    const matchesRating = filterRating === "all" || rev.rating === parseInt(filterRating);
    
    const hasReply = !!rev.reply?.text;
    const matchesStatus = 
       filterStatus === "all" || 
       (filterStatus === "pending" && !hasReply) || 
       (filterStatus === "replied" && hasReply);

    // Sentiment Filter
    let matchesSentiment = true;
    if (filterSentiment === "positive") matchesSentiment = rev.rating >= 4;
    else if (filterSentiment === "neutral") matchesSentiment = rev.rating === 3;
    else if (filterSentiment === "critical") matchesSentiment = rev.rating <= 2;

    // Date Filter
    let matchesDate = true;
    if (filterDate !== "all") {
      const revDate = new Date(rev.createdAt);
      const now = new Date();
      if (filterDate === "7days") matchesDate = (now - revDate) <= 7 * 86400000;
      else if (filterDate === "30days") matchesDate = (now - revDate) <= 30 * 86400000;
      else if (filterDate === "90days") matchesDate = (now - revDate) <= 90 * 86400000;
    }

    return matchesSearch && matchesRating && matchesStatus && matchesSentiment && matchesDate;
  }).sort((a, b) => {
    if (sortOrder === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortOrder === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortOrder === "highest") return b.rating - a.rating;
    if (sortOrder === "lowest") return a.rating - b.rating;
    return 0;
  });

  const metrics = {
    total: reviews.length,
    avg: reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "0.0",
    pending: reviews.filter(r => !r.reply?.text).length
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/review/restaurant-reviews");
      if (res.data.success) {
        setReviews(res.data.data);
        // Pre-draft AI replies for those without replies
        res.data.data.forEach(rev => {
          if (!rev.reply?.text) {
             generateDraft(rev);
          } else {
             setDrafts(prev => ({ ...prev, [rev._id]: rev.reply.text }));
          }
        });
      }
    } catch (err) {
      toast.error("Failed to load reviews.");
    }
    setLoading(false);
  };

  const generateDraft = async (review, customInstruction = null) => {
    setGenerating(prev => ({ ...prev, [review._id]: true }));
    try {
      const res = await api.post("/api/ai/restaurant/generate-review-reply", {
        reviewText: review.comment,
        rating: review.rating,
        customerName: review.userName,
        instruction: customInstruction || instructions[review._id]
      });
      if (res.data.success) {
        setDrafts(prev => ({ ...prev, [review._id]: res.data.reply }));
        // If this was the first ever load (no custom instruction), save as default
        if (!customInstruction && !instructions[review._id]) {
          setDefaults(prev => ({ ...prev, [review._id]: res.data.reply }));
        }
      }
    } catch (err) {
      console.error("AI Generation failed", err);
    }
    setGenerating(prev => ({ ...prev, [review._id]: false }));
  };

  const handleRestoreDefault = (reviewId) => {
    if (defaults[reviewId]) {
      setDrafts(prev => ({ ...prev, [reviewId]: defaults[reviewId] }));
      setInstructions(prev => ({ ...prev, [reviewId]: "" }));
      toast.info("Restored to baseline AI suggestion.");
    }
  };

  const handleApprove = async (reviewId) => {
    setApproving(prev => ({ ...prev, [reviewId]: true }));
    try {
      const res = await api.post("/api/review/reply", {
        reviewId,
        reply: drafts[reviewId]
      });
      if (res.data.success) {
        toast.success("Reply posted successfully!");
        setReviews(prev => prev.map(r => r._id === reviewId ? { ...r, reply: res.data.reply } : r));
      } else {
        toast.error(res.data.message || "Failed to post reply.");
      }
    } catch (err) {
      toast.error("An error occurred.");
    }
    setApproving(prev => ({ ...prev, [reviewId]: false }));
  };

  const handleDeleteReply = async (reviewId) => {
    setApproving(prev => ({ ...prev, [reviewId]: true }));
    try {
      const res = await api.delete(`/api/review/reply/${reviewId}`);
      if (res.data.success) {
        toast.success("Reply deleted.");
        setReviews(prev => prev.map(r => r._id === reviewId ? { ...r, reply: null } : r));
        setDrafts(prev => {
          const newDrafts = { ...prev };
          delete newDrafts[reviewId];
          return newDrafts;
        });
        // Generate new draft after delete
        const targetReview = reviews.find(r => r._id === reviewId);
        if (targetReview) generateDraft(targetReview);
      }
    } catch (err) {
      toast.error("Failed to delete reply.");
    }
    setApproving(prev => ({ ...prev, [reviewId]: false }));
  };

  const statusBorder = (rating) => {
    if (rating >= 4) return "#16a34a";
    if (rating === 3) return "#f59e0b";
    return "#dc2626";
  };

  const filterSelectStyle = {
    background: dark ? "rgba(255,255,255,0.03)" : "#ffffff",
    border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 600,
    color: dark ? "#f1f5f9" : "#1e293b",
    outline: "none",
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: dark ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 4px rgba(0,0,0,0.02)",
    appearance: "none", // Remove default arrow to style our own eventually or just keep it clean
    WebkitAppearance: "none",
    minWidth: 140
  };

  const inputGlowStyle = {
    boxShadow: dark ? "0 0 0 3px rgba(34,211,238,0.1)" : "0 0 0 3px rgba(8,145,178,0.08)"
  };

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 1100 }}>
        {/* Header */}
        <div style={{
          background: dark
            ? "linear-gradient(165deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))"
            : "linear-gradient(165deg, #ffffff, #fcfdfe)",
          border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
          borderRadius: 24,
          padding: "32px",
          boxShadow: dark ? "0 20px 50px -12px rgba(0,0,0,0.5)" : "0 15px 35px -10px rgba(15,23,42,0.08)",
          marginBottom: 32,
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Subtle background glow */}
          {dark && (
            <div style={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 300,
              height: 300,
              background: "radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)",
              zIndex: 0,
              pointerEvents: "none"
            }} />
          )}

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 12 }}>
              <div style={{ 
                padding: 14, 
                borderRadius: 16, 
                background: dark ? "linear-gradient(135deg, #0891b2, #0e7490)" : "linear-gradient(135deg, #0891b2, #06b6d4)", 
                color: "white",
                boxShadow: "0 8px 16px -4px rgba(8,145,178,0.3)"
              }}>
                <MessageSquare size={28} />
              </div>
              <div>
                <h2 style={{ fontSize: 32, fontWeight: 1000, margin: 0, letterSpacing: "-1px", background: dark ? "linear-gradient(to right, #f8fafc, #cbd5e1)" : "linear-gradient(to right, #0f172a, #334155)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI Review Triage</h2>
                <p style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500, marginTop: 4 }}>Accelerate your reputation management with automated draft-and-approve workflows.</p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
            <MetricCard title="Total Reviews" value={metrics.total} dark={dark} />
            <MetricCard title="Avg Rating" value={metrics.avg} dark={dark} icon={<Star size={14} fill="#f59e0b" color="#f59e0b" />} />
            <MetricCard title="Pending Replies" value={metrics.pending} dark={dark} color="#dc2626" />
          </div>

          <div style={{
            marginTop: 32,
            paddingTop: 32,
            borderTop: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #f1f5f9",
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center"
          }}>
             <div style={{ display: "flex", gap: 12, width: "100%", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 320 }}>
                  <input 
                    placeholder="Search customers or feedback content..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onFocus={e => e.target.parentElement.style.boxShadow = dark ? "0 0 0 3px rgba(34,211,238,0.15)" : "0 0 0 3px rgba(8,145,178,0.1)"}
                    onBlur={e => e.target.parentElement.style.boxShadow = "none"}
                    style={{ 
                      ...filterSelectStyle, 
                      width: "100%", 
                      paddingLeft: 44, 
                      height: 48, 
                      fontSize: 14, 
                      transition: "all 0.3s ease",
                      boxShadow: "none" // Managed by wrapper
                    }} 
                  />
                  <Filter size={18} color={dark ? "#0891b2" : "#0891b2"} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", opacity: 0.7 }} />
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ position: "relative" }}>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...filterSelectStyle, paddingRight: 36, height: 48 }}>
                      <option value="all">Every Status</option>
                      <option value="pending">Pending Reply</option>
                      <option value="replied">Successfully Replied</option>
                    </select>
                    <ArrowUpDown size={12} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }} />
                  </div>

                  <div style={{ position: "relative" }}>
                    <select value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...filterSelectStyle, paddingRight: 36, height: 48 }}>
                      <option value="all">All Time</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="90days">Last 90 Days</option>
                    </select>
                    <Calendar size={12} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }} />
                  </div>

                  <div style={{ position: "relative" }}>
                    <select value={filterSentiment} onChange={e => setFilterSentiment(e.target.value)} style={{ ...filterSelectStyle, paddingRight: 36, height: 48 }}>
                      <option value="all">Any Tone</option>
                      <option value="positive">✨ Positive Only</option>
                      <option value="neutral">⚖️ Neutral Only</option>
                      <option value="critical">🚨 Critical Only</option>
                    </select>
                    <ArrowUpDown size={12} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }} />
                  </div>

                  <div style={{ position: "relative" }}>
                    <select value={filterRating} onChange={e => setFilterRating(e.target.value)} style={{ ...filterSelectStyle, paddingRight: 36, height: 48 }}>
                      <option value="all">Any Rating</option>
                      {[5, 4, 3, 2, 1].map(s => <option key={s} value={s}>{s} Stars</option>)}
                    </select>
                    <Star size={12} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }} />
                  </div>

                  <div style={{ position: "relative" }}>
                    <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ ...filterSelectStyle, paddingRight: 36, height: 48, background: dark ? "rgba(8,145,178,0.1)" : "#f0f9ff", borderColor: dark ? "rgba(8,145,178,0.3)" : "#bae6fd" }}>
                      <option value="newest">Recent First</option>
                      <option value="oldest">Historical First</option>
                      <option value="highest">Top Rated</option>
                      <option value="lowest">Needs Attention</option>
                    </select>
                    <ArrowUpDown size={12} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }} />
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
             <div style={{ display: "grid", gap: 16 }}>
               {[1, 2, 3].map(i => <SkeletonCard key={i} dark={dark} />)}
             </div>
        ) : (
          <div style={{ display: "grid", gap: 20 }}>
            {filteredReviews.map(review => (
              <div key={review._id} style={{
                background: dark ? "rgba(30,41,59,0.4)" : "#ffffff",
                border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0",
                borderRadius: 20,
                padding: "16px",
                boxShadow: dark ? "0 8px 30px rgba(0,0,0,0.3)" : "0 4px 12px rgba(0,0,0,0.05)",
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 12,
                position: "relative",
                overflow: "hidden"
              }}>
                <div style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  background: statusBorder(review.rating)
                }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: dark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 1000,
                      color: dark ? "#f8fafc" : "#1e293b",
                      border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0"
                    }}>
                      {review.userName.charAt(0)}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 950, color: dark ? "#f1f5f9" : "#1e293b", letterSpacing: "-0.2px" }}>{review.userName}</h4>
                        <div style={{ display: "flex", gap: 1.5 }}>
                          {[...Array(5)].map((_, i) => (
                             <Star 
                               key={i} 
                               size={11} 
                               fill={i < review.rating ? (review.rating >=4 ? "#10b981" : review.rating >=3 ? "#f59e0b" : "#ef4444") : "none"} 
                               color={i < review.rating ? (review.rating >=4 ? "#10b981" : review.rating >=3 ? "#f59e0b" : "#ef4444") : (dark ? "rgba(255,255,255,0.15)" : "#cbd5e1")} 
                             />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 800, textTransform: "uppercase" }}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p style={{ 
                  fontSize: 13, 
                  lineHeight: 1.45, 
                  color: dark ? "#cbd5e1" : "#334155", 
                  margin: 0, 
                  fontWeight: 500 
                }}>
                  "{review.comment}"
                </p>

                {/* AI & Interaction Shell */}
                <div style={{
                  background: dark ? "rgba(10,15,25,0.5)" : "#f9fbfc",
                  borderRadius: 16,
                  padding: "12px",
                  border: dark ? "1px solid rgba(255,255,255,0.04)" : "1px solid #edf2f7",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                       <Sparkles size={12} color="#0891b2" />
                       <span style={{ fontSize: 10, fontWeight: 1000, textTransform: "uppercase", letterSpacing: 0.5, color: "#0891b2" }}>
                        {generating[review._id] ? "Drafting..." : (review.reply?.text ? "Archived" : "AI Intelligence")}
                       </span>
                    </div>
                    
                    <div style={{ display: "flex", gap: 10 }}>
                      {!review.reply?.text && defaults[review._id] && drafts[review._id] !== defaults[review._id] && (
                        <button onClick={() => handleRestoreDefault(review._id)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 900, textTransform: "uppercase" }}>
                          <Undo2 size={10} /> REVERT
                        </button>
                      )}
                      {!review.reply?.text && (
                        <button onClick={() => generateDraft(review)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 900, textTransform: "uppercase" }}>
                          <RotateCcw size={10} /> REFRESH
                        </button>
                      )}
                    </div>
                  </div>

                  {!review.reply?.text ? (
                    <>
                      <div style={{ position: "relative", marginBottom: 10 }}>
                        <input 
                          placeholder="Command (e.g. 'apologetic', 'discount')"
                          value={instructions[review._id] || ""}
                          onChange={e => setInstructions(prev => ({ ...prev, [review._id]: e.target.value }))}
                          style={{
                            width: "100%",
                            height: 32,
                            background: dark ? "rgba(255,255,255,0.02)" : "#ffffff",
                            border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0",
                            borderRadius: 8,
                            padding: "0 10px",
                            fontSize: 11,
                            color: dark ? "#f1f5f9" : "#1e293b",
                            outline: "none"
                          }}
                        />
                        <button 
                          onClick={() => generateDraft(review)}
                          disabled={generating[review._id] || !instructions[review._id]}
                          style={{ position: "absolute", right: 4, top: 4, bottom: 4, background: "#0891b2", color: "white", border: "none", borderRadius: 5, padding: "0 8px", fontSize: 9, fontWeight: 900, cursor: "pointer" }}
                        >
                          APPLY
                        </button>
                      </div>

                      <textarea 
                        value={drafts[review._id] || ""}
                        onChange={e => setDrafts(prev => ({ ...prev, [review._id]: e.target.value }))}
                        style={{
                          width: "100%",
                          minHeight: 50,
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          color: dark ? "#f1f5f9" : "#1e293b",
                          fontSize: 12.5,
                          lineHeight: 1.4,
                          resize: "vertical",
                          fontFamily: "inherit",
                          fontWeight: 500
                        }}
                      />

                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                        <button 
                          disabled={approving[review._id] || !drafts[review._id]}
                          onClick={() => handleApprove(review._id)}
                          style={{
                            background: "linear-gradient(135deg, #10b981, #059669)",
                            color: "white",
                            border: "none",
                            padding: "8px 14px",
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 900,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            boxShadow: "0 2px 8px rgba(16,185,129,0.15)"
                          }}
                        >
                          {approving[review._id] ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          POST REPLY
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                       <p style={{ fontSize: 12, color: dark ? "#cbd5e1" : "#475569", margin: 0, fontStyle: "italic", opacity: 0.8, lineHeight: 1.4 }}>
                         "{review.reply.text}"
                       </p>
                       <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: dark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9", paddingTop: 8 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#10b981", fontSize: 10, fontWeight: 1000, textTransform: "uppercase" }}>
                             <CheckCircle2 size={12} /> SENT {new Date(review.reply.repliedAt).toLocaleDateString()}
                          </span>
                          <button 
                            onClick={() => setDeleteId(review._id)}
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 9, fontWeight: 1000, textTransform: "uppercase" }}
                          >
                            UNDO
                          </button>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {reviews.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
                 <p style={{ fontSize: 14 }}>No reviews found for your restaurant.</p>
              </div>
            )}
          </div>
        )}

        <ConfirmationModal 
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={() => handleDeleteReply(deleteId)}
          title="Delete this reply?"
          message="Once deleted, the reply will be permanently removed from the customer's view."
          confirmText="Yes, Delete"
          type="danger"
        />
      </div>
    </RestaurantLayout>
  );
}

function MetricCard({ title, value, dark, icon, color }) {
  return (
    <div style={{
      background: dark ? "rgba(30,41,59,0.3)" : "white",
      border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0",
      borderRadius: 18,
      padding: "20px 24px",
      minWidth: 160,
      flex: 1,
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      cursor: "default"
    }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b" }}>{title}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
        <p style={{ margin: 0, fontSize: 30, fontWeight: 1000, color: color || (dark ? "#f8fafc" : "#0f172a"), letterSpacing: "-1px" }}>{value}</p>
        {icon && <div style={{ marginBottom: -4 }}>{icon}</div>}
      </div>
    </div>
  );
}

function SkeletonCard({ dark }) {
  return (
    <div style={{
      height: 180,
      background: dark ? "rgba(15,23,42,0.4)" : "#f8fafc",
      borderRadius: 16,
      border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#e2e8f0"}`,
      animation: "pulse 1.5s infinite ease-in-out"
    }} />
  );
}
