import { useState, useRef, useEffect, useContext } from "react";
import { StoreContext } from "../../Context/StoreContext";
import { isRestaurantOpen, mergeRestaurantFromDirectory } from "../../utils/restaurantHours";
import { motion, AnimatePresence } from "framer-motion";
import "./FoodChat.css";

const FoodChat = () => {
  const { food_list, currency, addToCart, url, restaurantsById = {} } = useContext(StoreContext);
  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Yo! 👋 I'm Crave AI, your food bestie. Tell me what's on your mind — budget picks, spicy vibes, or what's actually good around here. I got the legit reviews too! 🍔✨" }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);

  const buildMenuContext = () => {
    if (!food_list.length) return "Menu is loading...";
    return food_list.slice(0, 150).map(f =>
      `- ${f.name} | ${f.category} | ${currency}${f.price} | "${f.description?.slice(0, 60)}"`
    ).join("\n");
  };

  const findFoodsFromResponse = (text) => {
    if (!text) return [];
    const lowerText = text.toLowerCase();
    
    // Detect active budget from the text reply
    const budgetMatch = text.match(/(?:under|below|budget|aed|for)\s*(\d+)/i);
    const budget = budgetMatch ? Number(budgetMatch[1]) : 10000;

    // Map through food_list and find indices of mentions
    const found = food_list
      .map(f => ({
        ...f,
        index: lowerText.indexOf(f.name.toLowerCase())
      }))
      .filter(f => f.index !== -1 && Number(f.price) <= budget)
      .sort((a, b) => a.index - b.index) // Sort by appearance in text
      .slice(0, 3);

    return found;
  };

  const sendMessage = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(url + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          menuContext: buildMenuContext(),
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.text }))
        })
      });
      const data = await res.json();
      const reply = data.reply || "Sorry, I couldn't find anything matching that!";
      setMessages(prev => [...prev, { role: "assistant", text: reply, foods: findFoodsFromResponse(reply) }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Oops! I'm having trouble connecting. Try again 🙏" }]);
    } finally { setLoading(false); }
  };

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const quickReplies = ["Something spicy 🌶️", "Under AED 40 💰", "Quick & easy ⚡", "Top picks 🔥"];

  return (
    <>
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`fc-bubble ${open ? "fc-bubble-open" : ""}`} 
        onClick={() => setOpen(o => !o)}
      >
        {open
          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        }
        {!open && <span className="fc-bubble-label">Ask Crave AI</span>}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fc-window"
          >
            <div className="fc-header">
              <div className="fc-header-left">
                <div className="fc-avatar">✨</div>
                <div>
                  <p className="fc-header-name">Crave AI</p>
                  <p className="fc-header-sub">Food assistant · Always on</p>
                </div>
              </div>
              <button className="fc-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="fc-messages">
              {messages.map((msg, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className={`fc-msg-wrap ${msg.role === "user" ? "fc-user" : "fc-bot"}`}
                >
                  <div className={`fc-msg ${msg.role === "user" ? "fc-msg-user" : "fc-msg-bot"}`}>{msg.text}</div>
                  {msg.foods?.length > 0 && (
                    <div className="fc-suggestions">
                      {msg.foods.map((food, idx) => {
                        const isOpen = isRestaurantOpen(mergeRestaurantFromDirectory(food, restaurantsById));
                        return (
                          <motion.div 
                            key={food._id} 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + (idx * 0.1) }}
                            className="fc-food-card"
                          >
                            <img src={url + "/images/" + food.image} alt={food.name}
                              onError={e => e.target.src="https://via.placeholder.com/48?text=🍽️"} />
                            <div className="fc-food-info">
                              <p className="fc-food-name">{food.name}</p>
                              <p className="fc-food-price">{currency}{food.price}</p>
                            </div>
                            {isOpen
                              ? <button className="fc-food-add" onClick={() => addToCart(food._id)}>Add</button>
                              : <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444",
                                  background: "#fef2f2", border: "1px solid #fecaca",
                                  borderRadius: 20, padding: "4px 10px", whiteSpace: "nowrap" }}>Closed</span>
                            }
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              ))}
              {loading && (
                <div className="fc-msg-wrap fc-bot">
                  <div className="fc-msg fc-msg-bot fc-typing">
                    <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} />
                    <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                    <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {messages.length <= 1 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="fc-quick"
              >
                {quickReplies.map(q => (
                  <button key={q} className="fc-quick-btn"
                    onClick={() => { setInput(q); setTimeout(sendMessage, 50); }}>{q}</button>
                ))}
              </motion.div>
            )}

            <div className="fc-input-row">
              <input ref={inputRef} className="fc-input" value={input}
                onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder="What are you craving?" disabled={loading} />
              <button className="fc-send" onClick={sendMessage} disabled={loading || !input.trim()}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FoodChat;