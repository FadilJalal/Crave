import React, { useEffect, useState, useMemo, useCallback } from "react";
import RestaurantLayout from "../components/RestaurantLayout";
import { api } from "../utils/api";
import { useTheme } from "../ThemeContext";
import { toast } from "react-toastify";
import { Clock, Play, CheckCircle, ChevronRight, AlertTriangle, Timer } from "lucide-react";
import "./KDS.css";

export default function KDS() {
    const { dark } = useTheme();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ avgPrep: 0, bottlenecks: [] });

    const fetchOrders = useCallback(async () => {
        try {
            const res = await api.get("/api/order/restaurant/list");
            if (res.data.success) {
                const allOrders = res.data.data;
                const active = allOrders.filter(o => o.status !== "Delivered" && o.status !== "Cancelled");
                setOrders(active);
                calculateAnalytics(allOrders);
            }
        } catch (err) {
            toast.error("Failed to sync kitchen data");
        } finally {
            setLoading(false);
        }
    }, []);

    const calculateAnalytics = (allOrders) => {
        const completed = allOrders.filter(o => o.prepStartedAt && o.prepCompletedAt);
        if (completed.length === 0) return;
        let totalMs = 0;
        const itemTimes = {};
        completed.forEach(o => {
            const prepTime = new Date(o.prepCompletedAt) - new Date(o.prepStartedAt);
            totalMs += prepTime;
            o.items.forEach(item => {
                if (!itemTimes[item.name]) itemTimes[item.name] = { total: 0, count: 0 };
                itemTimes[item.name].total += prepTime;
                itemTimes[item.name].count += 1;
            });
        });
        const avgPrep = Math.round(totalMs / completed.length / 60000);
        const bottlenecks = Object.entries(itemTimes)
            .map(([name, data]) => ({ name, avg: Math.round(data.total / data.count / 60000) }))
            .sort((a, b) => b.avg - a.avg).slice(0, 3);
        setStats({ avgPrep, bottlenecks });
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 3000);
        return () => clearInterval(interval);
    }, [fetchOrders]);

    const updateStatus = async (orderId, currentStatus) => {
        const nextStatusMap = {
            "Order Placed": "Order Accepted",
            "Order Accepted": "Food Processing",
            "Food Processing": "Ready",
            "Ready": "Out for Delivery"
        };
        const nextStatus = nextStatusMap[currentStatus];
        if (!nextStatus) return;
        try {
            const res = await api.post("/api/order/restaurant/status", { orderId, status: nextStatus });
            if (res.data.success) {
                toast.success(`Order moved to ${nextStatus}`);
                fetchOrders();
            }
        } catch (err) {
            toast.error("Status update failed");
        }
    };

    const activeGroups = useMemo(() => ({
        incoming: orders.filter(o => o.status === "Order Placed" || o.status === "Order Accepted"),
        processing: orders.filter(o => o.status === "Food Processing"),
        ready: orders.filter(o => o.status === "Ready")
    }), [orders]);

    return (
        <RestaurantLayout>
            <div className={`kds-root ${dark ? "kds-dark" : "kds-light"}`} style={{ height: 'calc(100vh - 150px)', width: '100%', margin: 0, display: 'flex', flexDirection: 'column' }}>
                <div className="kds-board">
                    <div className="kds-column">
                        <div className="kds-col-head">
                            <h2>INCOMING</h2>
                            <span className="count-tag">{activeGroups.incoming.length}</span>
                        </div>
                        <div className="kds-col-body kds-scrollbar">
                            {activeGroups.incoming.map(o => <OrderCard key={o._id} order={o} onAction={updateStatus} />)}
                        </div>
                    </div>
                    <div className="kds-column">
                        <div className="kds-col-head">
                            <h2>PREPARING</h2>
                            <span className="count-tag">{activeGroups.processing.length}</span>
                        </div>
                        <div className="kds-col-body kds-scrollbar">
                            {activeGroups.processing.map(o => <OrderCard key={o._id} order={o} onAction={updateStatus} />)}
                        </div>
                    </div>
                    <div className="kds-column">
                        <div className="kds-col-head">
                            <h2>READY</h2>
                            <span className="count-tag">{activeGroups.ready.length}</span>
                        </div>
                        <div className="kds-col-body kds-scrollbar">
                            {activeGroups.ready.map(o => <OrderCard key={o._id} order={o} onAction={updateStatus} isReady />)}
                        </div>
                    </div>
                </div>
            </div>
        </RestaurantLayout>
    );
}

function OrderCard({ order, onAction, isReady }) {
    const elapsed = Math.floor((new Date() - new Date(order.createdAt)) / 60000);
    const isCritical = elapsed > 25;
    const isWarning = elapsed > 15;
    
    // AI Predicted Time (Simulation based on item complexity)
    const predictedTime = useMemo(() => {
        const base = 8;
        const itemPenalty = order.items.length * 2;
        return base + itemPenalty;
    }, [order.items.length]);

    return (
        <div className={`kds-card ${isCritical ? 'is-critical' : isWarning ? 'is-warning' : ''} ${isReady ? 'is-ready' : ''}`}>
            <div className="card-top">
                <div>
                   <span className="card-ref">#{order._id.slice(-5).toUpperCase()}</span>
                   <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--kds-accent)', marginTop: 2 }}>EST. {predictedTime} MIN</div>
                </div>
                <span className="card-timer">{elapsed}m</span>
            </div>
            <div className="card-main">
                {order.items.map((item, i) => (
                    <div key={i} className="order-item">
                        <span className="item-qty">{item.quantity}x</span>
                        <div className="item-info">
                            <span className="item-name">{item.name}</span>
                            {item.selections && Object.values(item.selections).some(v => v && v.length > 0) && (
                                <div className="item-selections">
                                    {Object.entries(item.selections)
                                        .map(([k, v]) => Array.isArray(v) ? v.join(", ") : v)
                                        .filter(v => v)
                                        .join(" · ")}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="card-foot">
                <button 
                    className={`action-btn ${order.status === "Ready" ? 'btn-ready' : ''}`}
                    onClick={() => onAction(order._id, order.status)}
                >
                    {order.status === "Order Placed" && "Accept"}
                    {order.status === "Order Accepted" && "Start Prep"}
                    {order.status === "Food Processing" && "Mark Ready"}
                    {order.status === "Ready" && "Dispatch"}
                </button>
            </div>
        </div>
    );
}
