import { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { StoreContext } from '../../Context/StoreContext';
import './PersonalisedBanner.css';

const GREETINGS = {
  morning:   { text: 'Good morning', emoji: '☀️' },
  afternoon: { text: 'Good afternoon', emoji: '🌤️' },
  evening:   { text: 'Good evening', emoji: '🌙' },
};
const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

const PersonalisedBanner = () => {
  const { url, token, currency, addToCart, food_list } = useContext(StoreContext);
  const [userName,   setUserName]   = useState('');
  const [topFood,    setTopFood]    = useState(null);
  const [totalSpent, setTotalSpent] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [added,      setAdded]      = useState(false);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    const fetchData = async () => {
      try {
        const ordersRes = await axios.post(url + '/api/order/userorders', {}, { headers: { token } });
        if (!ordersRes.data.success) { setLoading(false); return; }
        const orders = ordersRes.data.data || [];
        if (orders.length === 0) { setLoading(false); return; }

        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.name) setUserName(payload.name.split(' ')[0]);
        } catch {}

        const paidOrders = orders.filter(o => o.payment);
        setOrderCount(paidOrders.length);
        setTotalSpent(paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0));

        const itemCounts = {};
        paidOrders.forEach(order => {
          (order.items || []).forEach(item => {
            const id = String(item._id);
            itemCounts[id] = (itemCounts[id] || 0) + (item.quantity || 1);
          });
        });
        const topId = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (topId) {
          const food = food_list.find(f => String(f._id) === topId);
          if (food) setTopFood(food);
        }
      } catch (err) {
        console.error('PersonalisedBanner error:', err);
      } finally { setLoading(false); }
    };
    fetchData();
  }, [token, food_list]);

  const handleReorder = () => {
    if (!topFood) return;
    addToCart(topFood._id);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (!token || loading || orderCount === 0) return null;
  const { text: greeting, emoji } = GREETINGS[getTimeOfDay()];

  return (
    <div className='pb-wrap'>
      <div className='pb-left'>
        <div className='pb-emoji'>{emoji}</div>
        <div>
          <p className='pb-greeting'>{greeting}{userName ? `, ${userName}` : ''}!</p>
          <p className='pb-sub'>{orderCount} order{orderCount !== 1 ? 's' : ''} · {currency}{totalSpent.toFixed(0)} spent · We know what you like 😉</p>
        </div>
      </div>
      {topFood && (
        <div className='pb-favourite'>
          <img src={url + '/images/' + topFood.image} alt={topFood.name} className='pb-food-img'
            onError={e => e.target.src='https://via.placeholder.com/48'}/>
          <div className='pb-food-info'>
            <p className='pb-food-label'>Your usual</p>
            <p className='pb-food-name'>{topFood.name}</p>
          </div>
          <button className={`pb-reorder ${added ? 'pb-added' : ''}`} onClick={handleReorder}>
            {added ? '✓ Added!' : `Reorder · ${currency}${topFood.price}`}
          </button>
        </div>
      )}
    </div>
  );
};
export default PersonalisedBanner;