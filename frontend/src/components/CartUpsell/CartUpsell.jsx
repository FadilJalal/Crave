import { useContext, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { StoreContext } from '../../Context/StoreContext';
import './CartUpsell.css';

const CartUpsell = () => {
  const { cartItems, food_list, addToCart, getItemCount, url, currency } = useContext(StoreContext);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const cartFoodIds = new Set(
    Object.values(cartItems || {}).filter(e => e.quantity > 0).map(e => e.itemId)
  );

  // Get restaurant ID from cart
  const cartRestId = useMemo(() => {
    const first = Object.values(cartItems || {}).find(e => e.quantity > 0);
    if (!first) return null;
    const food = food_list.find(f => f._id === first.itemId);
    return food?.restaurantId?._id || food?.restaurantId || null;
  }, [cartItems, food_list]);

  // Fetch AI upsell suggestions
  useEffect(() => {
    if (cartFoodIds.size === 0 || !cartRestId) return;
    axios.post(url + '/api/ai/upsell', { cartItemIds: [...cartFoodIds], restaurantId: cartRestId })
      .then(res => { if (res.data.success && res.data.data?.length) setAiSuggestions(res.data.data); })
      .catch(() => {});
  }, [cartRestId, cartItems, url]);

  // Fallback to category-based if AI returns nothing
  const suggestions = useMemo(() => {
    if (aiSuggestions.length > 0) return aiSuggestions.filter(f => !cartFoodIds.has(String(f._id))).slice(0, 3);
    if (cartFoodIds.size === 0) return [];
    const cartFoods = food_list.filter(f => cartFoodIds.has(f._id));
    const cartCategories = [...new Set(cartFoods.map(f => f.category))];
    return food_list
      .filter(f => !cartFoodIds.has(f._id) && cartCategories.includes(f.category))
      .sort(() => Math.random() - 0.5).slice(0, 3);
  }, [cartItems, food_list, aiSuggestions]);

  if (suggestions.length === 0) return null;

  return (
    <div className='cu-wrap'>
      <p className='cu-title'><span>🛍️</span> People also ordered</p>
      <div className='cu-list'>
        {suggestions.map(food => {
          const count = getItemCount(food._id);
          return (
            <div key={food._id} className='cu-card'>
              <img src={url + '/images/' + food.image} alt={food.name} className='cu-img'
                onError={e => e.target.src='https://via.placeholder.com/52'} />
              <div className='cu-info'>
                <p className='cu-name'>{food.name}</p>
                <p className='cu-price'>{currency}{food.price}</p>
              </div>
              {count === 0
                ? <button className='cu-add' onClick={() => addToCart(food._id)}>+ Add</button>
                : <span className='cu-added'>✓ {count}</span>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default CartUpsell;