import React, { useContext, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StoreContext } from '../../Context/StoreContext';
import './CategoryReel.css';

// Asset mapping
import catBurger from '../../assets/cat_burger.png';
import catPizza from '../../assets/cat_pizza.png';
import catSushi from '../../assets/cat_sushi.png';
import catSalad from '../../assets/cat_salad.png';
import catPasta from '../../assets/cat_pasta.png';
import catDessert from '../../assets/cat_dessert.png';

const IMAGE_MAP = {
  'Burger': catBurger,
  'Pizza': catPizza,
  'Sushi': catSushi,
  'Salad': catSalad,
  'Pasta': catPasta,
  'Dessert': catDessert,
  'Cake': catDessert,
  'Rolls': catSushi,
  'Sandwich': catBurger,
};

const CategoryReel = ({ category, setCategory }) => {
  const { t } = useTranslation();
  const { food_list = [] } = useContext(StoreContext);
  const scrollRef = useRef(null);

  const categoryData = useMemo(() => {
    const map = {};
    food_list.forEach(item => {
      if (item.category) map[item.category] = (map[item.category] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({
        name,
        count,
        img: IMAGE_MAP[name] || null,
      }))
      .sort((a, b) => b.count - a.count);
  }, [food_list]);

  const handleCategoryClick = (name) => {
    setCategory(prev => (prev === name ? 'All' : name));
    // Smooth scroll to food display
    const el = document.getElementById('food-display');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="category-reel" id="explore-menu">
      <div className="reel-inner">
        <div className="reel-header">
          <h2 className="reel-title">{t("what_are_you_craving")}</h2>
          <div className="reel-controls">
            <button className="reel-dot-nav" onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}>←</button>
            <button className="reel-dot-nav" onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}>→</button>
          </div>
        </div>

        <div className="reel-track" ref={scrollRef}>
          {categoryData.map((cat) => (
            <button
              key={cat.name}
              className={`reel-item ${category === cat.name ? 'active' : ''}`}
              onClick={() => handleCategoryClick(cat.name)}
            >
              <div className="reel-circle">
                {cat.img ? (
                  <img src={cat.img} alt={cat.name} className="reel-img" />
                ) : (
                  <div className="reel-placeholder">🍽️</div>
                )}
                <div className="reel-overlay" />
              </div>
              <span className="reel-name">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryReel;
