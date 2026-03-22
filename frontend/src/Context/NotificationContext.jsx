import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { StoreContext } from './StoreContext';

export const NotificationContext = createContext({});

const POLL_INTERVAL = 10000;

const NOTIF_CONFIG = {
  'Food Processing':  { emoji: '👨‍🍳', msg: (r) => `Your order from ${r} is being prepared!`, color: '#f59e0b', bg: '#fffbeb' },
  'Out for Delivery': { emoji: '🛵', msg: (r) => `Your order from ${r} is on its way!`,       color: '#3b82f6', bg: '#eff6ff' },
  'Out for delivery': { emoji: '🛵', msg: (r) => `Your order from ${r} is on its way!`,       color: '#3b82f6', bg: '#eff6ff' },
  'Delivered':        { emoji: '✅', msg: (r) => `Your order from ${r} has been delivered!`,   color: '#16a34a', bg: '#f0fdf4' },
};

function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.setValueAtTime(680, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(820, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

export function NotificationProvider({ children }) {
  const { token, url } = useContext(StoreContext);
  const prevStatusRef    = useRef({});
  const initialLoadDone  = useRef(false);
  const pollRef          = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);

  const addNotification = (notif) => {
    setNotifications(prev => [notif, ...prev].slice(0, 20));
    setUnreadCount(c => c + 1);
  };

  const markAllRead = () => setUnreadCount(0);
  const clearAll    = () => { setNotifications([]); setUnreadCount(0); };

  const poll = async () => {
    if (!token) return;
    try {
      const res = await axios.post(url + '/api/order/userorders', {}, { headers: { token } });
      if (!res.data.success) return;
      const orders = res.data.data || [];

      const statusMap = {};
      orders.forEach(o => { statusMap[String(o._id)] = o.status; });

      if (initialLoadDone.current && Object.keys(prevStatusRef.current).length > 0) {
        orders.forEach(order => {
          const prev = prevStatusRef.current[String(order._id)];
          const curr = order.status;
          if (!prev || prev === curr) return;

          const cfg = NOTIF_CONFIG[curr];
          if (!cfg) return;

          const restaurantName = order.restaurantId?.name || 'Restaurant';
          const message = cfg.msg(restaurantName);

          // Play sound
          playNotifSound();

          // Add to bell history
          addNotification({
            id:      String(order._id) + curr,
            message,
            emoji:   cfg.emoji,
            color:   cfg.color,
            bg:      cfg.bg,
            time:    new Date(),
            orderId: order._id,
          });

          // Show custom toast
          toast(
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {cfg.emoji}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#111827', marginBottom: 2 }}>Order Update</div>
                <div style={{ fontSize: 13, color: '#374151' }}>{message}</div>
              </div>
            </div>,
            {
              autoClose: 7000,
              style: { background: 'white', border: `2px solid ${cfg.color}33`, borderRadius: 16, padding: '12px 16px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' },
              progressStyle: { background: cfg.color },
            }
          );
        });
      }

      prevStatusRef.current   = statusMap;
      initialLoadDone.current = true;
    } catch {}
  };

  useEffect(() => {
    if (!token) {
      clearInterval(pollRef.current);
      prevStatusRef.current   = {};
      initialLoadDone.current = false;
      return;
    }
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [token]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}