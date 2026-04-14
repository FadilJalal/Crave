import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { api } from '../utils/api';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [activities, setActivities] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [rawActivities, setRawActivities] = useState([]);
  const [rawAlerts, setRawAlerts] = useState([]);
  const [hiddenAlertIds, setHiddenAlertIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ra_hidden_alerts") || "[]");
    } catch { return []; }
  });
  const [clearedAt, setClearedAt] = useState(() => {
    return parseInt(localStorage.getItem("ra_notifications_cleared_at") || "0", 10);
  });
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);

  const [foods, setFoods] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState({ data: [], avgRating: 0, total: 0 });

  const clearAll = () => {
    const currentIds = rawAlerts.map(a => a.id);
    const newHidden = [...new Set([...hiddenAlertIds, ...currentIds])];
    setHiddenAlertIds(newHidden);
    localStorage.setItem("ra_hidden_alerts", JSON.stringify(newHidden));
    
    const now = Date.now();
    setClearedAt(now);
    localStorage.setItem("ra_notifications_cleared_at", now.toString());
  };

  const fetchNotifications = async () => {
    try {
      const [o, s, r, i, f, m, p] = await Promise.all([
        api.get("/api/order/restaurant/list"),
        api.get("/api/subscription/mine"),
        api.get("/api/review/restaurant-admin/list"),
        api.get("/api/inventory"),
        api.get("/api/restaurantadmin/foods"),
        api.get("/api/messages/restaurant/unread"),
        api.get("/api/promo/list"),
      ]);

      const subData = s.data?.success ? s.data.data : null;
      setSub(subData);

      const ordersList = o.data?.success ? (o.data.data || []) : [];
      setOrders(ordersList);

      const reviewsList = r.data?.success ? (r.data.data || []) : [];
      setReviews({
        data: reviewsList,
        avgRating: r.data?.avgRating || 0,
        total: r.data?.total || 0,
      });

      const inventoryList = i.data?.success ? (i.data.data || []) : [];
      setInventory(inventoryList);

      const foodsList = f.data?.success ? (f.data.data || []) : [];
      setFoods(foodsList);

      // Derive Alerts
      const alertsArr = [];
      if (subData && subData.isActive === false) {
        alertsArr.push({ id: "status", type: "danger", title: "Restaurant Offline", desc: "Your store is currently hidden from customers.", icon: "🏪", cta: "Fix" });
      }
      const missingImage = foodsList.filter(f => !f.image || f.image === "").length;
      if (missingImage > 0) {
        alertsArr.push({ id: "menu", type: "info", title: "Missing Photos", desc: `${missingImage} dishes have no image.`, icon: "📸", cta: "Fix" });
      }

      const unreadMsgs = m.data?.success ? m.data.count : 0;
      if (unreadMsgs > 0) {
        alertsArr.push({ id: "messages", type: "warning", title: "New Messages", desc: `You have ${unreadMsgs} unread message${unreadMsgs > 1 ? 's' : ''}.`, icon: "💬", cta: "Read" });
      }

      if (subData?.status === "trial" && subData?.trialEndsAt) {
        const daysLeft = Math.ceil((new Date(subData.trialEndsAt) - new Date()) / 86400000);
        if (daysLeft <= 3 && daysLeft >= 0) {
          alertsArr.push({ id: "sub", type: "danger", title: "Trial Expiring", desc: `Your trial ends in ${daysLeft === 0 ? 'today' : daysLeft + ' days'}.`, icon: "⌛", cta: "Renew" });
        }
      }

      const pendingCount = ordersList.filter(ord => ord.status === "Food Processing").length;
      if (pendingCount > 10) {
        alertsArr.push({ id: "orders", type: "danger", title: "Order Backlog", desc: `${pendingCount} pending orders.`, icon: "🔥", cta: "Queue" });
      }

      const promoList = p.data?.success ? (p.data.promos || p.data.data || []) : [];
      const expiringSoon = promoList.filter(p => p.isActive && p.expiresAt && new Date(p.expiresAt) > new Date() && new Date(p.expiresAt) < new Date(Date.now() + 86400000 * 2));
      if (expiringSoon.length > 0) {
        alertsArr.push({ id: "promo", type: "info", title: "Promo Expiring", desc: `${expiringSoon.length} promo${expiringSoon.length > 1 ? 's' : ''} expiring soon.`, icon: "🎟️", cta: "View" });
      }

      const lowStock = inventoryList.filter(it => it.currentStock <= it.minimumStock && it.isActive);
      if (lowStock.length > 0) {
        const critical = lowStock.filter(it => it.currentStock === 0).length;
        if (critical > 0) {
          alertsArr.push({ id: "stock-critical", type: "danger", title: "Out of Stock", desc: `${critical} items are completely out!`, icon: "🚫", cta: "Items" });
        } else {
          alertsArr.push({ id: "stock", type: "warning", title: "Low Stock Alert", desc: `${lowStock.length} items running low.`, icon: "📉", cta: "Items" });
        }
      }
      setRawAlerts(alertsArr);

      // Derive Activity Feed
      const activityArr = [];
      ordersList.slice(0, 15).forEach(ord => {
        const name = ord.address?.firstName || ord.userName || "Customer";
        activityArr.push({
          id: `order-${ord._id}-${ord.status}`, // Include status in ID to trigger fresh notification on update
          type: "order",
          title: ord.status === "Delivered" ? "Order Delivered" : "New Order Received",
          desc: `Order #${(ord._id || "").slice(-6).toUpperCase()} by ${name} (AED ${ord.amount || 0})`,
          time: ord.updatedAt || ord.createdAt,
          color: ord.status === "Delivered" ? "#10b981" : "#3b82f6",
          icon: ord.status === "Delivered" ? "✅" : "📦"
        });
      });
      reviewsList.slice(0, 5).forEach(rv => {
        const name = rv.userName || "A Customer";
        activityArr.push({
          id: `review-${rv._id}`,
          type: "review",
          title: `${rv.rating}-Star Review`,
          desc: rv.comment ? `"${rv.comment.slice(0, 60)}..." by ${name}` : `Received a ${rv.rating} star rating.`,
          time: rv.createdAt,
          color: "#f59e0b",
          icon: "⭐"
        });
      });
      
      // Sort: Latest Time First. If time is same, Orders beat Reviews.
      setRawActivities(activityArr.sort((a, b) => {
        const diff = new Date(b.time) - new Date(a.time);
        if (diff !== 0) return diff;
        if (a.type === "order" && b.type !== "order") return -1;
        if (b.type === "order" && a.type !== "order") return 1;
        return 0;
      }));

      // Browser Notification for new orders
      const latestOrder = ordersList[0];
      if (latestOrder && latestOrder.status === "Food Processing" && new Date(latestOrder.createdAt) > new Date(Date.now() - 30000)) {
        if (Notification.permission === "granted") {
          new Notification("New Order Received", { body: `Order #${latestOrder._id.slice(-6).toUpperCase()} is waiting.` });
        }
      }

    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Notification.permission !== "granted") Notification.requestPermission();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const visibleAlerts = useMemo(() => {
    return rawAlerts.filter(a => !hiddenAlertIds.includes(a.id));
  }, [rawAlerts, hiddenAlertIds]);

  const visibleActivities = useMemo(() => {
    return rawActivities.filter(act => {
      if (!clearedAt) return true;
      return new Date(act.time).getTime() > clearedAt;
    });
  }, [rawActivities, clearedAt]);

  return (
    <NotificationContext.Provider value={{ 
      activities: visibleActivities, 
      alerts: visibleAlerts, 
      sub, fetchNotifications, loading,
      foods, inventory, orders, reviews, clearAll 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
