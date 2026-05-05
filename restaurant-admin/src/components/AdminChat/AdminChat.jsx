import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../utils/api";
import { useTheme } from "../../ThemeContext";

const AdminChat = () => {
  const { dark } = useTheme();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { 
      role: "assistant", 
      text: "Welcome to Ops Command. 📊 I'm your AI Operations Consultant. Ask me anything about your stocks, today's sales, or staff status." 
    }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = async () => {
    const q = input.trim();
    if (!q || loading) return;

    setMessages(prev => [...prev, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/api/ai/restaurant/chat", {
        question: q,
        history: messages.slice(-10).map(m => ({ role: m.role, content: m.text }))
      });

      if (res.data?.success) {
        setMessages(prev => [...prev, { role: "assistant", text: res.data.reply }]);
      } else {
        throw new Error("Failed to get response");
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        text: "System offline. Please check your network or try again in a moment." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  let restaurantInfo = null;
  try { restaurantInfo = JSON.parse(localStorage.getItem("restaurantInfo")); } catch { }
  const restaurantName = restaurantInfo?.name || "Restaurant";

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: "18px",
          background: "linear-gradient(135deg, #6366f1, #4f46e5)",
          border: "none",
          color: "white",
          fontSize: 24,
          cursor: "pointer",
          boxShadow: "0 10px 30px rgba(99, 102, 241, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        {open ? "✕" : "🤖"}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{
              position: "fixed",
              bottom: 90,
              right: 24,
              width: 380,
              height: 600,
              maxHeight: "calc(100vh - 120px)",
              background: dark ? "#0b1220" : "#ffffff",
              borderRadius: "24px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
              border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              zIndex: 1000,
              overflow: "hidden",
            }}
          >
            <style>{`
              .admin-chat-scroll::-webkit-scrollbar { display: none; }
              .admin-chat-scroll { scrollbar-width: none; }
            `}</style>

          {/* Header */}
          <div style={{
            padding: "20px 24px",
            background: "linear-gradient(90deg, #6366f1, #4f46e5)",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: 12
          }}>
            {restaurantInfo?.logo ? (
              <img 
                src={`${api.defaults.baseURL}/images/${restaurantInfo.logo}`} 
                alt="Logo" 
                style={{ width: 32, height: 32, borderRadius: "8px", objectFit: "cover", border: "2px solid rgba(255,255,255,0.2)" }} 
              />
            ) : (
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
            )}
            <div>
              <div style={{ fontSize: 15, fontWeight: 900 }}>KFC Ops AI</div>
              <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>Data-Linked Service</div>
            </div>
          </div>

          {/* Messages */}
          <div className="admin-chat-scroll" style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: dark ? "#0b1220" : "#ffffff"
          }}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", damping: 20, stiffness: 200, delay: i * 0.05 }}
                style={{
                  alignSelf: m.role === "assistant" ? "flex-start" : "flex-end",
                  maxWidth: "92%",
                  padding: "12px 16px",
                  borderRadius: m.role === "assistant" ? "20px 20px 20px 4px" : "20px 20px 4px 20px",
                  background: m.role === "assistant" 
                    ? (dark ? "rgba(255,255,255,0.08)" : "#f3f4f6") 
                    : "linear-gradient(135deg, #6366f1, #4f46e5)",
                  color: "#fff",
                  fontSize: "13.5px",
                  lineHeight: 1.6,
                  fontWeight: 500,
                  boxShadow: m.role === "user" ? "0 4px 12px rgba(99, 102, 241, 0.2)" : "none",
                  whiteSpace: "pre-wrap"
                }}
              >
                {/* Remove markdown bolding for cleaner look if AI sends it */}
                {m.text.replace(/\*\*/g, "")}
              </motion.div>
            ))}
            {loading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ 
                  alignSelf: "flex-start", 
                  padding: "12px 18px", 
                  borderRadius: "20px 20px 20px 4px", 
                  background: dark ? "rgba(255,255,255,0.08)" : "#f3f4f6", 
                  display: "flex", 
                  gap: 5 
                }}
              >
                {[0, 1, 2].map(dot => (
                  <motion.div
                    key={dot}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: dot * 0.2 }}
                    style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1" }}
                  />
                ))}
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "16px",
            background: dark ? "#0b1220" : "#ffffff",
            borderTop: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #f3f4f6",
          }}>
            <div style={{ 
              display: "flex", 
              gap: 8,
              background: dark ? "rgba(255,255,255,0.04)" : "#f9fafb",
              border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #e5e7eb",
              borderRadius: "16px",
              padding: "4px 4px 4px 14px",
              alignItems: "center"
            }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === "Enter" && sendMessage()}
                placeholder="Ask about stocks, staff, sales..."
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  padding: "10px 0",
                  fontSize: "14px",
                  color: dark ? "#fff" : "#1f2937",
                  outline: "none"
                }}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: loading || !input.trim() ? 0.5 : 1,
                  boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)"
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18" style={{ transform: "rotate(45deg) translate(-1px, 1px)" }}>
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </motion.button>
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminChat;
