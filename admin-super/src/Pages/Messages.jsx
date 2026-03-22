import { useEffect, useState, useRef } from "react";
import { api } from "../utils/api";
import { toast } from "react-toastify";
import { BACKEND_URL } from "../config";

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(date).toLocaleDateString("en-AE", { day: "numeric", month: "short" });
}

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected]           = useState(null);
  const [thread, setThread]               = useState([]);
  const [restaurants, setRestaurants]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);

  // Compose
  const [showCompose, setShowCompose]     = useState(false);
  const [compTo, setCompTo]               = useState("all");
  const [compSubject, setCompSubject]     = useState("");
  const [compBody, setCompBody]           = useState("");
  const [compEmail, setCompEmail]         = useState(false);
  const [sending, setSending]             = useState(false);

  // Reply
  const [replyBody, setReplyBody]         = useState("");
  const [replying, setReplying]           = useState(false);
  const [replyEmail, setReplyEmail]       = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    loadConversations();
    loadRestaurants();
  }, []);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [thread]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/messages/admin/conversations");
      if (res.data.success) setConversations(res.data.conversations);
    } catch {}
    finally { setLoading(false); }
  };

  const loadRestaurants = async () => {
    try {
      const res = await api.get("/api/subscription/list");
      if (res.data.success) setRestaurants(res.data.data || []);
    } catch {}
  };

  const openThread = async (restaurantId, restaurantName) => {
    setSelected({ id: restaurantId, name: restaurantName });
    setLoadingThread(true);
    try {
      const res = await api.get(`/api/messages/admin/thread/${restaurantId}`);
      if (res.data.success) setThread(res.data.messages);
      // Mark as read in UI
      setConversations(prev => prev.map(c =>
        String(c.restaurant._id) === String(restaurantId)
          ? { ...c, unreadCount: 0 }
          : c
      ));
    } catch {}
    finally { setLoadingThread(false); }
  };

  const handleSend = async () => {
    if (!compBody.trim()) return;
    setSending(true);
    try {
      const res = await api.post("/api/messages/admin/send", {
        restaurantId: compTo,
        subject: compSubject,
        body: compBody,
        sendEmail: compEmail,
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setShowCompose(false);
        setCompSubject(""); setCompBody(""); setCompTo("all"); setCompEmail(false);
        loadConversations();
        if (selected && (compTo === "all" || compTo === selected.id)) {
          openThread(selected.id, selected.name);
        }
      } else toast.error(res.data.message);
    } catch { toast.error("Failed to send."); }
    finally { setSending(false); }
  };

  const handleReply = async () => {
    if (!replyBody.trim() || !selected) return;
    setReplying(true);
    try {
      const res = await api.post("/api/messages/admin/send", {
        restaurantId: selected.id,
        body: replyBody,
        sendEmail: replyEmail,
      });
      if (res.data.success) {
        setReplyBody("");
        openThread(selected.id, selected.name);
      } else toast.error(res.data.message);
    } catch { toast.error("Failed to send reply."); }
    finally { setReplying(false); }
  };

  const inp = { padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box", background: "white" };
  const lbl = { fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 6 };

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Messages</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>Communicate with restaurant owners</p>
        </div>
        <button onClick={() => setShowCompose(true)} style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#ff4e2a,#ff6a3d)", color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
          ✏️ New Message
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, height: 600 }}>

        {/* Conversations list */}
        <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Conversations
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 20, color: "var(--muted)", fontSize: 14 }}>Loading...</div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                No conversations yet
              </div>
            ) : conversations.map(c => (
              <div key={c.restaurant._id}
                onClick={() => openThread(c.restaurant._id, c.restaurant.name)}
                style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f3f4f6", background: selected?.id === String(c.restaurant._id) ? "#fff5f3" : "white", transition: "background .15s" }}
                onMouseEnter={e => { if (selected?.id !== String(c.restaurant._id)) e.currentTarget.style.background = "#fafafa"; }}
                onMouseLeave={e => { if (selected?.id !== String(c.restaurant._id)) e.currentTarget.style.background = "white"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {c.restaurant.logo
                    ? <img src={`${BACKEND_URL}/images/${c.restaurant.logo}`} style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🍽️</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#111827" }}>{c.restaurant.name}</span>
                      {c.unreadCount > 0 && (
                        <span style={{ background: "#ff4e2a", color: "white", fontSize: 10, fontWeight: 900, padding: "2px 6px", borderRadius: 999 }}>{c.unreadCount}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.lastMessage?.from === "admin" ? "You: " : ""}{c.lastMessage?.body}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{timeAgo(c.lastMessage?.createdAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {!selected ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
                <div style={{ fontWeight: 700 }}>Select a conversation</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Or start a new message</div>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontWeight: 800, fontSize: 15, color: "#111827" }}>
                {selected.name}
              </div>

              {/* Messages */}
              <div ref={threadRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
                {loadingThread ? (
                  <div style={{ color: "var(--muted)", fontSize: 14 }}>Loading...</div>
                ) : thread.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--muted)", marginTop: 40 }}>No messages yet. Say hello!</div>
                ) : thread.map(m => (
                  <div key={m._id} style={{ display: "flex", flexDirection: m.from === "admin" ? "row-reverse" : "row", gap: 8, alignItems: "flex-end" }}>
                    <div style={{
                      maxWidth: "70%", padding: "10px 14px", borderRadius: m.from === "admin" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: m.from === "admin" ? "#ff4e2a" : "#f3f4f6",
                      color: m.from === "admin" ? "white" : "#111827",
                      fontSize: 14, lineHeight: 1.5,
                    }}>
                      {m.subject && <div style={{ fontWeight: 800, marginBottom: 4, fontSize: 13 }}>{m.subject}</div>}
                      <div style={{ whiteSpace: "pre-line" }}>{m.body}</div>
                      <div style={{ fontSize: 10, marginTop: 6, opacity: 0.7, textAlign: m.from === "admin" ? "right" : "left" }}>
                        {timeAgo(m.createdAt)}{m.sentByEmail ? " · emailed" : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply box */}
              <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                  placeholder={`Reply to ${selected.name}...`}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                  style={{ ...inp, minHeight: 60, resize: "none" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
                    <input type="checkbox" checked={replyEmail} onChange={e => setReplyEmail(e.target.checked)} />
                    Also send by email
                  </label>
                  <button onClick={handleReply} disabled={replying || !replyBody.trim()} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: replying || !replyBody.trim() ? "#e5e7eb" : "#ff4e2a", color: replying || !replyBody.trim() ? "#9ca3af" : "white", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                    {replying ? "Sending..." : "Send ↵"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }} onClick={() => setShowCompose(false)}>
          <div style={{ background: "white", borderRadius: 20, padding: 28, width: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800 }}>New Message</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>TO</label>
              <select style={inp} value={compTo} onChange={e => setCompTo(e.target.value)}>
                <option value="all">📣 All Restaurants</option>
                {restaurants.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>SUBJECT (optional)</label>
              <input style={inp} value={compSubject} onChange={e => setCompSubject(e.target.value)} placeholder="Message subject..." />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>MESSAGE</label>
              <textarea style={{ ...inp, minHeight: 100, resize: "vertical" }} value={compBody} onChange={e => setCompBody(e.target.value)} placeholder="Write your message..." />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--muted)", cursor: "pointer", marginBottom: 20 }}>
              <input type="checkbox" checked={compEmail} onChange={e => setCompEmail(e.target.checked)} />
              Also send by email
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowCompose(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid var(--border)", background: "white", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleSend} disabled={sending || !compBody.trim()} style={{ flex: 2, padding: 12, borderRadius: 10, border: "none", background: sending || !compBody.trim() ? "#e5e7eb" : "linear-gradient(135deg,#ff4e2a,#ff6a3d)", color: sending || !compBody.trim() ? "#9ca3af" : "white", cursor: "pointer", fontWeight: 800, fontFamily: "inherit" }}>
                {sending ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}