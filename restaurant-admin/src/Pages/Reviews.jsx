import React, { useEffect, useState } from "react";
import { api } from "../utils/api";
import RestaurantLayout from "../components/RestaurantLayout";

const StarRow = ({ rating, size = 14 }) => (
  <div style={{ display: "flex", gap: 2 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <svg key={s} width={size} height={size} viewBox="0 0 24 24"
        fill={rating >= s ? "#f59e0b" : "none"}
        stroke={rating >= s ? "#f59e0b" : "#d1d5db"}
        strokeWidth="1.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ))}
  </div>
);

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const LABEL = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

const ReplyBox = ({ review, onReplied }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(review.reply?.text || "");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await api.post(`/api/review/reply/${review._id}`, { text });
      if (res.data.success) {
        onReplied(review._id, res.data.reply);
        setOpen(false);
      }
    } catch {}
    setLoading(false);
  };

  const hasReply = !!review.reply?.text;

  return (
    <div style={{ marginTop: 12 }}>
      {/* Show existing reply */}
      {hasReply && !open && (
        <div style={{
          padding: "10px 14px",
          background: "rgba(249,115,22,0.06)",
          borderLeft: "3px solid #f97316",
          borderRadius: "0 10px 10px 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#f97316" }}>🍽️ Your reply</span>
            <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>{timeAgo(review.reply.repliedAt)}</span>
            <button
              onClick={() => setOpen(true)}
              style={{ background: "none", border: "1px solid #f97316", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, color: "#f97316", cursor: "pointer", fontFamily: "inherit" }}
            >
              Edit
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text, #111)", lineHeight: 1.6 }}>{review.reply.text}</p>
        </div>
      )}

      {/* Reply button if no reply yet */}
      {!hasReply && !open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            background: "none", border: "1px solid var(--border, #e5e7eb)",
            borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700,
            color: "var(--text-2, #6b7280)", cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#f97316"; e.currentTarget.style.color = "#f97316"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border, #e5e7eb)"; e.currentTarget.style.color = "var(--text-2, #6b7280)"; }}
        >
          💬 Reply to this review
        </button>
      )}

      {/* Reply input */}
      {open && (
        <div style={{ marginTop: hasReply ? 10 : 0 }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Write a reply to this customer…"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 12px", borderRadius: 10,
              border: "1.5px solid #f97316",
              background: "var(--card, #fff)", color: "var(--text, #111)",
              fontFamily: "inherit", fontSize: 13, resize: "none",
              outline: "none", marginBottom: 8,
            }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 11, color: "#9ca3af", alignSelf: "center", marginRight: "auto" }}>{text.length}/500</span>
            <button
              onClick={() => { setOpen(false); setText(review.reply?.text || ""); }}
              style={{ background: "none", border: "1px solid var(--border, #e5e7eb)", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "var(--text-2, #6b7280)" }}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={loading || !text.trim()}
              style={{
                background: "#f97316", border: "none", borderRadius: 8,
                padding: "7px 18px", fontSize: 12, fontWeight: 800,
                color: "white", cursor: loading ? "wait" : "pointer",
                fontFamily: "inherit", opacity: (!text.trim() || loading) ? 0.5 : 1,
              }}
            >
              {loading ? "Posting…" : hasReply ? "Update Reply" : "Post Reply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [total, setTotal] = useState(0);
  const [breakdown, setBreakdown] = useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(0);

  useEffect(() => {
    api.get("/api/review/restaurant-admin/list")
      .then((res) => {
        if (res.data.success) {
          setReviews(res.data.data || []);
          setAvgRating(res.data.avgRating || 0);
          setTotal(res.data.total || 0);
          setBreakdown(res.data.breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleReplied = (reviewId, reply) => {
    setReviews(prev => prev.map(r => r._id === reviewId ? { ...r, reply } : r));
  };

  const filtered = filter === 0 ? reviews : reviews.filter((r) => r.rating === filter);

  return (
    <RestaurantLayout>
      <div style={{ padding: "32px 0 80px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "var(--font-display, inherit)", fontSize: 28, fontWeight: 900, margin: "0 0 4px", color: "var(--text, #111)" }}>
            Customer Reviews
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-2, #6b7280)", margin: 0 }}>
            Real feedback from your customers after delivery
          </p>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />
            ))}
          </div>
        ) : total === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "var(--card, #fff)", borderRadius: 20, border: "1px dashed var(--border, #e5e7eb)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <p style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px", color: "var(--text, #111)" }}>No reviews yet</p>
            <p style={{ fontSize: 14, color: "var(--text-2, #6b7280)", margin: 0 }}>
              Reviews will appear here once customers rate your restaurant after delivery.
            </p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 28 }}>
              <div style={{ background: "var(--card, #fff)", border: "1px solid var(--border, #e5e7eb)", borderRadius: 16, padding: "20px 20px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 40, fontWeight: 900, color: "var(--text, #111)", lineHeight: 1, marginBottom: 6 }}>
                  {avgRating.toFixed(1)}
                </div>
                <StarRow rating={Math.round(avgRating)} size={16} />
                <div style={{ fontSize: 12, color: "var(--text-2, #6b7280)", marginTop: 4 }}>
                  {total} review{total !== 1 ? "s" : ""}
                </div>
              </div>
              {[5, 4, 3, 2, 1].map((star) => (
                <div
                  key={star}
                  onClick={() => setFilter(filter === star ? 0 : star)}
                  style={{
                    background: filter === star ? "rgba(245,158,11,0.08)" : "var(--card, #fff)",
                    border: filter === star ? "1.5px solid #f59e0b" : "1px solid var(--border, #e5e7eb)",
                    borderRadius: 16, padding: "16px 16px 14px",
                    cursor: "pointer", transition: "all 0.15s", textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text, #111)", lineHeight: 1 }}>
                    {breakdown[star] || 0}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
                    <StarRow rating={star} size={12} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-2, #6b7280)" }}>
                    {total > 0 ? Math.round(((breakdown[star] || 0) / total) * 100) : 0}%
                  </div>
                </div>
              ))}
            </div>

            {filter > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-2, #6b7280)" }}>
                  Showing {filter}-star reviews ({filtered.length})
                </span>
                <button
                  onClick={() => setFilter(0)}
                  style={{ background: "none", border: "1px solid var(--border, #e5e7eb)", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "var(--text-2, #6b7280)" }}
                >
                  Clear
                </button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-2, #6b7280)", fontSize: 14 }}>
                  No {filter}-star reviews.
                </div>
              ) : (
                filtered.map((review) => (
                  <div key={review._id} style={{
                    background: "var(--card, #fff)",
                    border: "1px solid var(--border, #e5e7eb)",
                    borderRadius: 16, padding: "18px 20px",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: review.comment ? 10 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: "50%",
                          background: "linear-gradient(135deg, #f97316, #f59e0b)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 900, fontSize: 15, color: "white", flexShrink: 0,
                        }}>
                          {(review.userName || "C")[0].toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 14, color: "var(--text, #111)" }}>
                            {review.userName || "Customer"}
                          </p>
                          <p style={{ margin: 0, fontSize: 11, color: "var(--text-2, #6b7280)", opacity: 0.7 }}>
                            {timeAgo(review.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <StarRow rating={review.rating} size={15} />
                        <span style={{
                          fontSize: 11, fontWeight: 800, padding: "3px 8px",
                          background: review.rating >= 4 ? "rgba(34,197,94,0.1)" : review.rating === 3 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                          color: review.rating >= 4 ? "#16a34a" : review.rating === 3 ? "#b45309" : "#dc2626",
                          borderRadius: 6,
                        }}>
                          {LABEL[review.rating]}
                        </span>
                      </div>
                    </div>

                    {review.comment && (
                      <p style={{ margin: "0 0 4px", fontSize: 14, color: "var(--text-2, #6b7280)", fontStyle: "italic", lineHeight: 1.6 }}>
                        "{review.comment}"
                      </p>
                    )}

                    <ReplyBox review={review} onReplied={handleReplied} />
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </RestaurantLayout>
  );
}