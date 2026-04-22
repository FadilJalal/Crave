import { useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import './FoodDisplay.css';
import FoodItem from '../FoodItem/FoodItem';
import { StoreContext } from '../../Context/StoreContext';
import { isRestaurantOpen, mergeRestaurantFromDirectory } from '../../utils/restaurantHours';
import { Sparkles, ArrowRight } from 'lucide-react';

const computeTags = (food_list, t) => {
  const tags = {};
  const byCategory = {};
  food_list.forEach(f => {
    if (!byCategory[f.category]) byCategory[f.category] = [];
    byCategory[f.category].push(f);
  });
  Object.entries(byCategory).forEach(([cat, items]) => {
    if (items.length < 2) return;
    const sorted = [...items].sort((a, b) => a.price - b.price);
    tags[sorted[0]._id] = { label: `💰 ${t('budget_pick')}`, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' };
    const top = sorted[sorted.length - 1];
    if (top.price > sorted[0].price * 1.5)
      tags[top._id] = { label: `⭐ ${t('premium_tag')}`, color: '#92400e', bg: '#fefce8', border: '#fde68a' };
  });
  const allSorted = [...food_list].sort((a, b) => a.price - b.price);
  const cheapest = allSorted.find(f => !tags[f._id]);
  if (cheapest) tags[cheapest._id] = { label: `🏷️ ${t('best_value')}`, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' };
  const newest = [...food_list].sort((a, b) => String(b._id).localeCompare(String(a._id))).slice(0, 2);
  newest.forEach(f => { if (!tags[f._id]) tags[f._id] = { label: `🆕 ${t('just_added')}`, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' }; });
  return tags;
};

const FoodDisplay = ({ category }) => {
  const { t } = useTranslation();
  const { food_list = [], restaurantsById = {}, healthGoal, nutritionMatches } = useContext(StoreContext);
  const dealTags = useMemo(() => computeTags(food_list, t), [food_list, t]);
  const filtered = food_list.filter(item => category === 'All' || item.category === category);

  const processedList = useMemo(() => {
    let list = [...filtered];
    
    // If health goal is active, prioritize high scores
    if (healthGoal !== "None" && Object.keys(nutritionMatches || {}).length > 0) {
      list.sort((a, b) => {
        const scoreA = nutritionMatches[a._id]?.score || 0;
        const scoreB = nutritionMatches[b._id]?.score || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return 0.5 - Math.random(); // Randomize for items with same score
      });
    } else {
      list.sort(() => 0.5 - Math.random());
    }
    
    return list;
  }, [filtered, healthGoal, nutritionMatches]);

  const hasMatches = useMemo(() => {
    if (healthGoal === "None") return true;
    return Object.values(nutritionMatches || {}).some(m => m.score > 50);
  }, [healthGoal, nutritionMatches]);

  return (
    <div className='fd-wrap' id='food-display'>
      <div className='fd-container'>
        <div className='fd-header'>
          <div className='fd-title-wrap'>
            <span className='fd-badge'>{t('curated_selection')}</span>
            <h2 className='fd-title'>
              {category === 'All' ? (
                <>TOP <span style={{ color: '#ff0000' }}>PICKS</span> NEAR YOU</>
              ) : category}
            </h2>
            <p className='fd-count'>{processedList.length} {t("items_available")}</p>
          </div>
          <Link to="/restaurants" className="fd-view-all">
            <span>{t('explore_all')}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        {healthGoal !== "None" && !hasMatches && (
          <div className="fd-no-match-alert">
            <div className="fd-no-match-icon">🧬</div>
            <div className="fd-no-match-text">
              <h4>No direct {healthGoal} matches here.</h4>
              <p>The AI suggests exploring other categories or customizing these items to fit your goal.</p>
            </div>
            <button className="fd-ai-help-btn" onClick={() => window.scrollTo(0, 0)}>Change Goal <ArrowRight size={14} /></button>
          </div>
        )}

        {processedList.length === 0 ? (
          <div className='fd-empty'><div className='fd-empty-icon'>🍽️</div><p>{t("no_items_in_category")}</p></div>
        ) : (
          <div className='fd-grid'>
            {processedList.map(item => {
              const merged = mergeRestaurantFromDirectory(item, restaurantsById);
              const nMatch = nutritionMatches?.[item._id];
              return (
              <div key={item._id} className={`fd-item-wrapper ${healthGoal !== "None" && nMatch?.score > 70 ? 'fd-hot-match' : ''}`}>
                {healthGoal !== "None" && nMatch?.score > 80 && (
                  <div className="fd-best-match-ribbon"><Sparkles size={10} /> BEST FOR {healthGoal.toUpperCase()}</div>
                )}
                <FoodItem id={item._id} name={item.name} description={item.description}
                  price={item.price} image={item.image} restaurantId={item.restaurantId}
                  customizations={item.customizations || []} dealTag={dealTags[item._id] || null}
                  restaurantOpen={isRestaurantOpen(merged)}
                  restaurantActive={merged?.isActive !== false}
                  avgRating={item.avgRating || 0} ratingCount={item.ratingCount || 0}
                  inStock={item.inStock !== false} />
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodDisplay;