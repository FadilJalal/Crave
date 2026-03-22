import { useEffect, useState, useRef } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(date).toLocaleDateString("en-AE", { day: "numeric", month: "short" });
}

export default function Messages() {
  const [thread, setThread]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody]       = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter]   = useState("all"); // all | pinned | favourited
  const threadRef = useRef(null);

  useEffect(() => { loadThread(); }, []);

  useEffect(() => {
    if (filter === "all" && threadRef.current)
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [thread, filter]);

  const loadThread = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/messages/restaurant/thread");
      if (res.data.success) setThread(res.data.messages);
    } catch {}
    finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await api.post("/api/messages/restaurant/send", { body });
      if (res.data.success) { setBody(""); loadThread(); }
    } catch {}
    finally { setSending(false); }
  };

  const togglePin = async (msgId) => {
    try {
      const res = await api.post(`/api/messages/restaurant/pin/${msgId}`);
      if (res.data.success)
        setThread(prev => prev.map(m => m._id === msgId ? { ...m, pinned: res.data.pinned } : m));
    } catch {}
  };

  const toggleFavourite = async (msgId) => {
    try {
      const res = await api.post(`/api/messages/restaurant/favourite/${msgId}`);
      if (res.data.success)
        setThread(prev => prev.map(m => m._id === msgId ? { ...m, favourited: res.data.favourited } : m));
    } catch {}
  };

  const pinnedCount    = thread.filter(m => m.pinned).length;
  const favouriteCount = thread.filter(m => m.favourited).length;

  const displayed = [...thread]
    .filter(m => {
      if (filter === "pinned")    return m.pinned;
      if (filter === "favourited") return m.favourited;
      return true;
    })
    .sort((a, b) => {
      if (filter !== "all") return new Date(b.createdAt) - new Date(a.createdAt);
      // In "all" view: pinned float to top
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

  const inp = { padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box", background: "white" };

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 680 }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#111827", letterSpacing: "-0.6px" }}>Messages</h2>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#9ca3af" }}>Your conversation with Crave support</p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[
            { key: "all",        label: `All (${thread.length})` },
            { key: "pinned",     label: `📌 Pinned (${pinnedCount})` },
            { key: "favourited", label: `⭐ Favourites (${favouriteCount})` },
          ].map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)} style={{
              padding: "7px 16px", borderRadius: 999, fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              border: `1.5px solid ${filter === t.key ? "#ff4e2a" : "#e5e7eb"}`,
              background: filter === t.key ? "#fff5f3" : "white",
              color: filter === t.key ? "#ff4e2a" : "#6b7280",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Thread */}
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 20, overflow: "hidden", marginBottom: 16 }}>

          {/* Header */}
          <div style={{ padding: "12px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ff4e2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "white" }}>C</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#111827" }}>Crave Support</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Platform administrator</div>
            </div>
          </div>

          {/* Messages */}
          <div ref={threadRef} style={{ padding: 16, minHeight: 300, maxHeight: 440, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {loading ? (
              <div style={{ color: "#9ca3af", fontSize: 14 }}>Loading...</div>
            ) : displayed.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{filter === "pinned" ? "📌" : filter === "favourited" ? "⭐" : "💬"}</div>
                <div style={{ fontWeight: 700 }}>
                  {filter === "pinned" ? "No pinned messages" : filter === "favourited" ? "No favourites yet" : "No messages yet"}
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  {filter === "all" ? "Send a message to Crave support below" : "Pin or star messages to find them here"}
                </div>
              </div>
            ) : displayed.map(m => (
              <div key={m._id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>

                {/* Pin banner for pinned messages */}
                {m.pinned && filter === "all" && (
                  <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, paddingLeft: m.from === "admin" ? 0 : "auto", textAlign: m.from === "admin" ? "left" : "right" }}>
                    📌 Pinned
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: m.from === "admin" ? "row" : "row-reverse", gap: 8, alignItems: "flex-end" }}>
                  <div style={{
                    maxWidth: "75%", padding: "10px 14px",
                    borderRadius: m.from === "admin" ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                    background: m.from === "admin" ? (m.pinned ? "#fff5f3" : "#f3f4f6") : "#ff4e2a",
                    color: m.from === "admin" ? "#111827" : "white",
                    border: m.pinned ? "1.5px solid #ff4e2a33" : "none",
                    fontSize: 14, lineHeight: 1.5, position: "relative",
                  }}>
                    {m.subject && <div style={{ fontWeight: 800, marginBottom: 4, fontSize: 13 }}>{m.subject}</div>}
                    <div style={{ whiteSpace: "pre-line" }}>{m.body}</div>
                    <div style={{ fontSize: 10, marginTop: 6, opacity: 0.6 }}>{timeAgo(m.createdAt)}</div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => togglePin(m._id)}
                      title={m.pinned ? "Unpin" : "Pin message"}
                      style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #e5e7eb", background: m.pinned ? "#fff5f3" : "white", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", color: m.pinned ? "#ff4e2a" : "#9ca3af" }}
                    >📌</button>
                    <button
                      onClick={() => toggleFavourite(m._id)}
                      title={m.favourited ? "Unfavourite" : "Favourite"}
                      style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #e5e7eb", background: m.favourited ? "#fffbeb" : "white", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", color: m.favourited ? "#f59e0b" : "#9ca3af" }}
                    >⭐</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input — only show in all view */}
          {filter === "all" && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write a message to Crave support..."
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                style={{ ...inp, minHeight: 60, flex: 1, resize: "none" }}
              />
              <button onClick={handleSend} disabled={sending || !body.trim()} style={{ padding: "12px 18px", borderRadius: 12, border: "none", background: sending || !body.trim() ? "#e5e7eb" : "#ff4e2a", color: sending || !body.trim() ? "#9ca3af" : "white", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                {sending ? "..." : "Send"}
              </button>
            </div>
          )}
        </div>
      </div>
    </RestaurantLayout>
  );
}