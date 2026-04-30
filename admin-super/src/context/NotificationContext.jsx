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
      return JSON.parse(localStorage.getItem("as_hidden_alerts") || "[]");
    } catch { return []; }
  });
  const [clearedAt, setClearedAt] = useState(() => {
    return parseInt(localStorage.getItem("as_notifications_cleared_at") || "0", 10);
  });
  const [loading, setLoading] = useState(true);

  const clearAll = () => {
    const currentIds = rawAlerts.map(a => a.id);
    const newHidden = [...new Set([...hiddenAlertIds, ...currentIds])];
    setHiddenAlertIds(newHidden);
    localStorage.setItem("as_hidden_alerts", JSON.stringify(newHidden));
    
    const now = Date.now();
    setClearedAt(now);
    localStorage.setItem("as_notifications_cleared_at", now.toString());
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/api/admin/stats");
      if (res.data.success) {
        const stats = res.data.data;
        
        // Derive Alerts
        const alertsArr = [];
        if (stats.upcomingRenewals && stats.upcomingRenewals.length > 0) {
          alertsArr.push({ 
            id: "renewals", type: "warning", title: "Upcoming Renewals", 
            desc: `${stats.upcomingRenewals.length} partner(s) have subscriptions expiring within 7 days.`, 
            icon: "⌛", cta: "View" 
          });
        }
        
        if (stats.idleRestaurants > 0) {
          alertsArr.push({ 
            id: "idle", type: "danger", title: "Idle Partners", 
            desc: `${stats.idleRestaurants} partner(s) appear to be inactive or offline.`, 
            icon: "⚠️", cta: "Review" 
          });
        }
        
        setRawAlerts(alertsArr);

        // Derive Activity Feed
        const activityArr = [];
        if (stats.recentRestaurants) {
          stats.recentRestaurants.forEach(r => {
            activityArr.push({
              id: `rest-${r._id}`,
              type: "system",
              category: "Deployments",
              title: "New Partner Deployed",
              desc: `${r.name} has just joined the platform.`,
              time: r.createdAt,
              color: "#10b981",
              icon: "🚀"
            });
          });
        }
        
        setRawActivities(activityArr.sort((a, b) => new Date(b.time) - new Date(a.time)));
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
    const interval = setInterval(fetchNotifications, 30000); // 30s
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
      fetchNotifications, loading,
      clearAll 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
