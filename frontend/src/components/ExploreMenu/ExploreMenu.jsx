import React, { useContext, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './ExploreMenu.css';
import { StoreContext } from '../../Context/StoreContext';

const EMOJI_MAP = [
  { keywords: ['chicken', 'wing', 'poultry', 'hen'], emoji: '🍗' },
  { keywords: ['burger', 'hamburger'], emoji: '🍔' },
  { keywords: ['pizza'], emoji: '🍕' },
  { keywords: ['sushi', 'japanese', 'maki', 'roll'], emoji: '🍣' },
  { keywords: ['taco', 'mexican', 'burrito', 'nacho'], emoji: '🌮' },
  { keywords: ['pasta', 'noodle', 'spaghetti', 'mac'], emoji: '🍝' },
  { keywords: ['salad', 'green', 'vegan', 'vegetable', 'veggie'], emoji: '🥗' },
  { keywords: ['steak', 'beef', 'meat', 'grill', 'bbq', 'barbecue'], emoji: '🥩' },
  { keywords: ['seafood', 'fish', 'shrimp', 'prawn', 'lobster', 'crab'], emoji: '🦐' },
  { keywords: ['sandwich', 'sub', 'wrap', 'panini'], emoji: '🥪' },
  { keywords: ['dessert', 'cake', 'sweet', 'pastry', 'bakery'], emoji: '🍰' },
  { keywords: ['ice cream', 'gelato', 'frozen'], emoji: '🍦' },
  { keywords: ['donut', 'doughnut'], emoji: '🍩' },
  { keywords: ['coffee', 'cafe', 'latte', 'espresso'], emoji: '☕' },
  { keywords: ['drink', 'juice', 'smoothie', 'shake', 'beverage'], emoji: '🥤' },
  { keywords: ['soup', 'broth', 'stew', 'chowder'], emoji: '🍲' },
  { keywords: ['rice', 'biryani', 'fried rice', 'pulao'], emoji: '🍚' },
  { keywords: ['curry', 'indian', 'masala', 'tikka', 'dal'], emoji: '🍛' },
  { keywords: ['chinese', 'wok', 'dim sum', 'dumpling'], emoji: '🥡' },
  { keywords: ['fries', 'potato', 'chips', 'snack', 'finger food', 'appetizer', 'starter'], emoji: '🍟' },
  { keywords: ['bread', 'toast', 'baguette', 'croissant'], emoji: '🥖' },
  { keywords: ['egg', 'omelette', 'breakfast'], emoji: '🍳' },
  { keywords: ['hot dog', 'sausage', 'frank'], emoji: '🌭' },
  { keywords: ['pie', 'quiche'], emoji: '🥧' },
  { keywords: ['chili', 'spicy', 'hot', 'pepper'], emoji: '🌶️' },
  { keywords: ['combo', 'meal', 'bucket', 'box', 'platter', 'feast', 'family'], emoji: '🍱' },
  { keywords: ['kebab', 'shawarma', 'gyro', 'doner'], emoji: '🥙' },
  { keywords: ['waffle', 'pancake', 'crepe'], emoji: '🧇' },
  { keywords: ['chocolate', 'brownie', 'cocoa'], emoji: '🍫' },
  { keywords: ['cookie', 'biscuit'], emoji: '🍪' },
];

const CARD_COLORS = [
  { bg: '#FFF1EF', accent: '#FF3008', ring: '#FFD5CC' },
  { bg: '#FFF8EB', accent: '#E8860C', ring: '#FFE8BE' },
  { bg: '#EEFBF4', accent: '#16A34A', ring: '#BBF7D0' },
  { bg: '#EFF6FF', accent: '#2563EB', ring: '#BFDBFE' },
  { bg: '#FDF4FF', accent: '#A855F7', ring: '#E9D5FF' },
  { bg: '#FFF1F2', accent: '#E11D48', ring: '#FECDD3' },
  { bg: '#ECFEFF', accent: '#0891B2', ring: '#A5F3FC' },
  { bg: '#FEF9EC', accent: '#CA8A04', ring: '#FDE68A' },
];

function getCategoryEmoji(name) {
  const lower = name.toLowerCase();
  for (const e of EMOJI_MAP) {
    if (e.keywords.some(kw => lower.includes(kw))) return e.emoji;
  }
  return '🍽️';
}

const ExploreMenu = ({ category, setCategory }) => {
  const { t } = useTranslation();
  const { food_list = [] } = useContext(StoreContext);
  const scrollRef = useRef(null);

  const categoryData = useMemo(() => {
    const map = {};
    food_list.forEach(item => {
      if (item.category) map[item.category] = (map[item.category] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count], i) => ({
        name,
        count,
        emoji: getCategoryEmoji(name),
        color: CARD_COLORS[i % CARD_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [food_list]);

  const scroll = (dir) => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 260, behavior: 'smooth' });
  };

  return (
    <div className='em-wrap' id='explore-menu'>
      <div className='em-header'>
        <div className="em-title-group">
          <span className="em-badge">{t("browse_by_category")}</span>
          <h2 className='em-title'>{t("what_are_you_craving")}</h2>
        </div>
        <div className='em-nav'>
          {category !== 'All' && (
            <button className='em-clear' onClick={() => setCategory('All')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              {t("clear")}
            </button>
          )}
          <button className='em-arrow' onClick={() => scroll(-1)} aria-label="Scroll left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button className='em-arrow' onClick={() => scroll(1)} aria-label="Scroll right">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
          </button>
        </div>
      </div>

      <div className='em-track' ref={scrollRef}>
        {/* All card */}
        <button
          className={`em-card ${category === 'All' ? 'em-card-active' : ''}`}
          onClick={() => setCategory('All')}
          style={{ '--c-bg': 'var(--brand-soft)', '--c-accent': 'var(--brand)', '--c-ring': 'var(--brand-mid)' }}
        >
          <div className='em-card-icon'>
            <span>🍽️</span>
          </div>
          <span className='em-card-name'>{t("all")}</span>
          <span className='em-card-count'>{food_list.length} {t("items")}</span>
        </button>

        {categoryData.map(cat => (
          <button
            key={cat.name}
            className={`em-card ${category === cat.name ? 'em-card-active' : ''}`}
            onClick={() => setCategory(prev => (prev === cat.name ? 'All' : cat.name))}
            style={{ '--c-bg': cat.color.bg, '--c-accent': cat.color.accent, '--c-ring': cat.color.ring }}
          >
            <div className='em-card-icon'>
              <span>{cat.emoji}</span>
            </div>
            <span className='em-card-name'>{cat.name}</span>
            <span className='em-card-count'>{cat.count} {t("items")}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExploreMenu;