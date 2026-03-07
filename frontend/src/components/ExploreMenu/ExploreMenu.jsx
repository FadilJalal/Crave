import React, { useContext, useMemo } from 'react';
import './ExploreMenu.css';
import { StoreContext } from '../../Context/StoreContext';

const ExploreMenu = ({ category, setCategory }) => {
  const { food_list = [] } = useContext(StoreContext);

  // Build categories dynamically from foods the admin uploaded.
  const dynamicCategories = useMemo(() => {
    const set = new Set();
    food_list.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [food_list]);

  return (
    <div className='em-wrap' id='explore-menu'>
      <div className='em-header'>
        <h2 className='em-title'>What are you craving?</h2>
        <p className='em-sub'>Filter by category</p>
      </div>

      <div className='em-scroll'>
        <button
          className={`em-pill ${category === 'All' ? 'em-pill-active' : ''}`}
          onClick={() => setCategory('All')}
        >
          <span className='em-pill-emoji'>🍽️</span>
          <span>All</span>
        </button>

        {dynamicCategories.map(cat => (
          <button
            key={cat}
            className={`em-pill ${category === cat ? 'em-pill-active' : ''}`}
            onClick={() => setCategory(prev => (prev === cat ? 'All' : cat))}
          >
            <span className='em-pill-emoji'>🍴</span>
            <span>{cat}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExploreMenu;