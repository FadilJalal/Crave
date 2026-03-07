// frontend/src/components/FoodDisplay/FoodDisplay.jsx
import React, { useContext } from 'react';
import './FoodDisplay.css';
import { StoreContext } from '../../Context/StoreContext';
import FoodItem from '../FoodItem/FoodItem';

const FoodDisplay = ({ category }) => {
  const { food_list = [] } = useContext(StoreContext);
  const filtered = food_list.filter(item => category === 'All' || item.category === category);

  return (
    <div className='fd-wrap' id='food-display'>
      <div className='fd-header'>
        <div>
          <h2 className='fd-title'>
            {category === 'All' ? 'Top Picks Near You' : category}
          </h2>
          <p className='fd-count'>{filtered.length} item{filtered.length !== 1 ? 's' : ''} available</p>
        </div>
        {category !== 'All' && <span className='fd-category-tag'>{category}</span>}
      </div>

      {filtered.length === 0 ? (
        <div className='fd-empty'>
          <div className='fd-empty-icon'>🍽️</div>
          <p>No items in this category yet.</p>
        </div>
      ) : (
        <div className='fd-grid'>
          {filtered.map(item => (
            <FoodItem
              key={item._id}
              id={item._id}
              name={item.name}
              description={item.description}
              price={item.price}
              image={item.image}
              restaurantId={item.restaurantId}
              customizations={item.customizations || []}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FoodDisplay;