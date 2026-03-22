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
  const [thread, setThread]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [body, setBody]         = useState("");
  const [sending, setSending]   = useState(false);
  const [result, setResult]     = useState(null);
  const threadRef = useRef(null);

  useEffect(() => { loadThread(); }, []);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [thread]);

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
      if (res.data.success) {
        setBody("");
        setResult({ success: true, msg: "Message sent to Crave support." });
        setTimeout(() => setResult(null), 3000);
        loadThread();
      }
    } catch {}
    finally { setSending(false); }
  };

  const inp = { padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box", background: "white" };

  return (
    <RestaurantLayout>
      <div style={{ maxWidth: 680 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#111827", letterSpacing: "-0.6px" }}>Messages</h2>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#9ca3af" }}>Your conversation with Crave support</p>
        </div>

        {/* Thread */}
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 20, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ff4e2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "white" }}>C</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#111827" }}>Crave Support</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Platform administrator</div>
            </div>
          </div>

          <div ref={threadRef} style={{ padding: 16, minHeight: 300, maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {loading ? (
              <div style={{ color: "#9ca3af", fontSize: 14 }}>Loading...</div>
            ) : thread.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                <div style={{ fontWeight: 700 }}>No messages yet</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Send a message to Crave support below</div>
              </div>
            ) : thread.map(m => (
              <div key={m._id} style={{ display: "flex", flexDirection: m.from === "admin" ? "row" : "row-reverse", gap: 8, alignItems: "flex-end" }}>
                <div style={{
                  maxWidth: "75%", padding: "10px 14px",
                  borderRadius: m.from === "admin" ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                  background: m.from === "admin" ? "#f3f4f6" : "#ff4e2a",
                  color: m.from === "admin" ? "#111827" : "white",
                  fontSize: 14, lineHeight: 1.5,
                }}>
                  {m.subject && <div style={{ fontWeight: 800, marginBottom: 4, fontSize: 13 }}>{m.subject}</div>}
                  <div style={{ whiteSpace: "pre-line" }}>{m.body}</div>
                  <div style={{ fontSize: 10, marginTop: 6, opacity: 0.6 }}>{timeAgo(m.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
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
        </div>

        {result && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", borderRadius: 12, padding: "10px 16px", fontSize: 13, fontWeight: 700 }}>
            ✅ {result.msg}
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}