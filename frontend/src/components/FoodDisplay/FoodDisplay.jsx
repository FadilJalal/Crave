import { useContext, useMemo } from 'react';
import './FoodDisplay.css';
import FoodItem from '../FoodItem/FoodItem';
import { StoreContext } from '../../Context/StoreContext';
import { isRestaurantOpen } from '../../utils/restaurantHours';

const computeTags = (food_list) => {
  const tags = {};
  const byCategory = {};
  food_list.forEach(f => {
    if (!byCategory[f.category]) byCategory[f.category] = [];
    byCategory[f.category].push(f);
  });
  Object.entries(byCategory).forEach(([cat, items]) => {
    if (items.length < 2) return;
    const sorted = [...items].sort((a, b) => a.price - b.price);
    tags[sorted[0]._id] = { label: '💰 Budget Pick', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' };
    const top = sorted[sorted.length - 1];
    if (top.price > sorted[0].price * 1.5)
      tags[top._id] = { label: '⭐ Premium', color: '#92400e', bg: '#fefce8', border: '#fde68a' };
  });
  const allSorted = [...food_list].sort((a, b) => a.price - b.price);
  const cheapest = allSorted.find(f => !tags[f._id]);
  if (cheapest) tags[cheapest._id] = { label: '🏷️ Best Value', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' };
  const newest = [...food_list].sort((a, b) => String(b._id).localeCompare(String(a._id))).slice(0, 2);
  newest.forEach(f => { if (!tags[f._id]) tags[f._id] = { label: '🆕 Just Added', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' }; });
  return tags;
};

const FoodDisplay = ({ category }) => {
  const { food_list = [] } = useContext(StoreContext);
  const dealTags = useMemo(() => computeTags(food_list), [food_list]);
  const filtered = food_list.filter(item => category === 'All' || item.category === category);

  return (
    <div className='fd-wrap' id='food-display'>
      <div className='fd-header'>
        <div>
          <h2 className='fd-title'>{category === 'All' ? 'Top Picks Near You' : category}</h2>
          <p className='fd-count'>{filtered.length} item{filtered.length !== 1 ? 's' : ''} available</p>
        </div>
        {category !== 'All' && <span className='fd-category-tag'>{category}</span>}
      </div>
      {filtered.length === 0 ? (
        <div className='fd-empty'><div className='fd-empty-icon'>🍽️</div><p>No items in this category yet.</p></div>
      ) : (
        <div className='fd-grid'>
          {filtered.map(item => (
            <FoodItem key={item._id} id={item._id} name={item.name} description={item.description}
              price={item.price} image={item.image} restaurantId={item.restaurantId}
              customizations={item.customizations || []} dealTag={dealTags[item._id] || null}
              restaurantOpen={isRestaurantOpen(item.restaurantId)}
              avgRating={item.avgRating || 0} ratingCount={item.ratingCount || 0}
              inStock={item.inStock !== false} />
          ))}
        </div>
      )}
    </div>
  );
};

export default FoodDisplay;