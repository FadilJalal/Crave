import { useMemo } from 'react';
import './OrderInsights.css';

const OrderInsights = ({ orders, currency }) => {
  const stats = useMemo(() => {
    if (!orders || orders.length === 0) return null;
    const paid = orders.filter(o => o.payment);
    if (paid.length === 0) return null;
    const totalSpent = paid.reduce((s, o) => s + (o.amount || 0), 0);
    const avgOrder   = totalSpent / paid.length;
    const itemCounts = {};
    paid.forEach(o => (o.items || []).forEach(item => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1);
    }));
    const favourite = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const catCounts = {};
    paid.forEach(o => (o.items || []).forEach(item => {
      if (item.category) catCounts[item.category] = (catCounts[item.category] || 0) + 1;
    }));
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = paid.filter(o => new Date(o.createdAt || o.date).getTime() > weekAgo).length;
    const delivered = paid.filter(o => (o.status || '').toLowerCase() === 'delivered').length;
    return { totalSpent, avgOrder, favourite, topCat, thisWeek, delivered, totalOrders: paid.length };
  }, [orders]);

  if (!stats) return null;

  const tiles = [
    { icon: '💰', label: 'Total Spent',  value: `${currency}${stats.totalSpent.toFixed(0)}` },
    { icon: '🧾', label: 'Avg. Order',   value: `${currency}${stats.avgOrder.toFixed(0)}` },
    { icon: '❤️', label: 'Favourite',    value: stats.favourite, small: true },
    { icon: '🍽️', label: 'Top Category', value: stats.topCat },
    { icon: '📅', label: 'This Week',    value: `${stats.thisWeek} order${stats.thisWeek !== 1 ? 's' : ''}` },
    { icon: '✅', label: 'Delivered',    value: `${stats.delivered} / ${stats.totalOrders}` },
  ];

  return (
    <div className='oi-wrap'>
      <div className='oi-header'>
        <span className='oi-spark'>📊</span>
        <div>
          <h3 className='oi-title'>Your Order Insights</h3>
          <p className='oi-sub'>A look at your ordering habits</p>
        </div>
      </div>
      <div className='oi-grid'>
        {tiles.map((t, i) => (
          <div key={i} className='oi-tile' style={{ animationDelay: `${i * 60}ms` }}>
            <span className='oi-tile-icon'>{t.icon}</span>
            <p className={`oi-tile-value ${t.small ? 'oi-small' : ''}`}>{t.value}</p>
            <p className='oi-tile-label'>{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
export default OrderInsights;