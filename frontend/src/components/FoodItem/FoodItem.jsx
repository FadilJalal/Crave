import { useState, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import './FoodItem.css';
import { StoreContext } from '../../Context/StoreContext';
import { useTheme } from '../../Context/ThemeContext';

const DIET_RULES = {
  vegan:      { m: /vegan|plant.?based|tofu|falafel|hummus|lentil|chickpea/i, x: /chicken|beef|lamb|meat|fish|shrimp|egg|cheese|cream|butter|milk|honey/i },
  vegetarian: { m: /veg|vegetarian|paneer|cheese|mushroom|spinach|potato|corn|beans|falafel/i, x: /chicken|beef|lamb|meat|fish|shrimp|pepperoni|bacon|ham|sausage/i },
  glutenFree: { m: /gluten.?free|rice|salad|grilled|bowl/i, x: /bread|bun|wrap|tortilla|pasta|noodle|pizza|flour|naan|cake|pastry/i },
  keto:       { m: /keto|grilled|steak|wings|kebab|salad|egg/i, x: /rice|bread|pasta|noodle|potato|fries|pizza|tortilla|sugar|cake|sweet/i },
};
const DIET_COLORS = {
  vegan: { bg: "#dcfce7", color: "#15803d" }, vegetarian: { bg: "#d1fae5", color: "#047857" },
  glutenFree: { bg: "#fef3c7", color: "#92400e" }, keto: { bg: "#ede9fe", color: "#6d28d9" },
  spicy: { bg: "#fee2e2", color: "#dc2626" }, healthy: { bg: "#ecfdf5", color: "#059669" },
};
function getDietTags(name, desc, cat) {
  const t = `${name} ${desc} ${cat}`.toLowerCase();
  const tags = [];
  for (const [d, { m, x }] of Object.entries(DIET_RULES)) { if (m.test(t) && !x.test(t)) tags.push(d); }
  if (/spicy|chilli|chili|pepper|jalapeño|sriracha|buffalo|masala|vindaloo/i.test(t)) tags.push("spicy");
  if (/grilled|baked|steamed|fresh|salad|light|lean/i.test(t)) tags.push("healthy");
  return tags;
}

const FoodItem = (props) => {
  const { t, i18n } = useTranslation();
  const {
    image, name, name_en, name_ar, price, regularPrice, description, desc_en, desc_ar, id, restaurantId, customizations = [], dealTag = null, isFlashDeal = false, restaurantOpen = true, restaurantActive = true, avgRating = 0, ratingCount = 0, inStock = true, forceFavourite
  } = props;
  const { cartItems, addToCart, removeFromCart, getItemCount, url, currency, favourites = [], isFavourite, addFavourite, removeFavourite, food_list } = useContext(StoreContext);

  // Support forceFavourite prop for Favourites page
  // (already destructured above)
    // Find the full food object for this item (for favouriting)
    const foodObj = useMemo(() => {
      if (food_list && food_list.length) {
        return food_list.find(f => f._id === id) || { _id: id, name, image, category: restaurantId?.category || '', price };
      }
      return { _id: id, name, image, category: restaurantId?.category || '', price };
    }, [food_list, id, name, image, restaurantId, price]);

  const { dark } = useTheme();

  const count = getItemCount(id);
  const restName = restaurantId?.name || '';
  const restLogo = restaurantId?.logo ? `${url}/images/${restaurantId.logo}` : null;
  const restActive = restaurantActive;
  const hasCustomizations = customizations && customizations.length > 0;
  const category = restaurantId?.category || '';
  // Pick name/description based on language
  const lang = t('language') === 'اللغة' && i18n.language === 'ar' ? 'ar' : i18n.language;
  const displayName = lang === 'ar' ? (name_ar || name) : (name_en || name);
  const displayDesc = lang === 'ar' ? (desc_ar || description) : (desc_en || description);
  const dietTags = useMemo(() => getDietTags(displayName, displayDesc, category), [displayName, displayDesc, category]);

  const [showCustomize, setShowCustomize] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [selections, setSelections] = useState({});

  const handleSelect = (groupIndex, optionLabel, multiSelect) => {
    setSelections((prev) => {
      if (multiSelect) {
        const current = prev[groupIndex] || [];
        return {
          ...prev,
          [groupIndex]: current.includes(optionLabel)
            ? current.filter((x) => x !== optionLabel)
            : [...current, optionLabel],
        };
      }
      return { ...prev, [groupIndex]: prev[groupIndex] === optionLabel ? null : optionLabel };
    });
  };

  const getExtraPrice = () => {
    let extra = 0;
    customizations.forEach((group, gi) => {
      const sel = selections[gi];
      group.options.forEach((opt) => {
        const selected = Array.isArray(sel) ? sel.includes(opt.label) : sel === opt.label;
        if (selected) {
          extra += Number(opt.extraPrice || 0);
        }
      });
    });
    return extra;
  };

  const handleAddToCart = () => {
    if (!restaurantOpen || !inStock || !restActive) return;
    for (const [gi, group] of customizations.entries()) {
      if (group.required) {
        const sel = selections[gi];
        if (!sel || (Array.isArray(sel) && sel.length === 0)) {
          alert(`Please select an option for "${group.title}"`);
          return;
        }
      }
    }
    const namedSelections = {};
    customizations.forEach((group, gi) => {
      const sel = selections[gi];
      if (sel !== null && sel !== undefined && sel !== '' && !(Array.isArray(sel) && sel.length === 0)) {
        namedSelections[group.title] = sel;
      }
    });
    addToCart(id, namedSelections);
    setShowCustomize(false);
    setSelections({});
  };

  const openCustomize = () => {
    if (!restaurantOpen || !inStock || !restActive) return;
    setSelections({});
    setShowCustomize(true);
  };

  const extraPrice = getExtraPrice();
  const totalPrice = Number(price || 0) + extraPrice;
  const modalSurface = dark ? '#111827' : '#fff';
  const modalBorder = dark ? 'rgba(255,255,255,0.10)' : '#f3f4f6';
  const modalText = dark ? '#f8fafc' : '#111827';
  const modalMuted = dark ? '#94a3b8' : '#9ca3af';
  const optionBg = dark ? '#1f2937' : '#fff';
  const optionBorder = dark ? 'rgba(255,255,255,0.14)' : '#e5e7eb';
  const optionSelectedBg = dark ? 'rgba(255,78,42,0.18)' : '#fff5f3';

  return (
    <>
      <div className='fi-card'>
        <div className='fi-img-wrap'>
          {dealTag && (
            <div className='fi-deal-tag' style={{ background: dealTag.bg, border: `1px solid ${dealTag.border}`, color: dealTag.color }}>
              {dealTag.label}
            </div>
          )}

          <img className='fi-img' src={image?.startsWith('http') ? image : url + '/images/' + image} alt={name}
            onError={e => { e.target.src = 'https://via.placeholder.com/300x200?text=Food'; }} />

          {/* Heart icon for favourites */}
          <button
            type="button"
            className='fi-heart-btn'
            style={{
              position: 'absolute', top: 12, right: 12, zIndex: 2, background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px #0001', cursor: 'pointer', padding: 0
            }}
            aria-label={isFavourite?.(id) ? 'Remove from favourites' : 'Add to favourites'}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              if (isFavourite?.(id)) {
                removeFavourite?.(id);
              } else {
                addFavourite?.(foodObj);
              }
            }}
          >
            <Heart
              size={22}
              stroke="#ff3a0a"
              fill={forceFavourite || isFavourite?.(id) ? '#ff3a0a' : 'none'}
              style={{ transition: 'fill 0.2s, stroke 0.2s' }}
            />
          </button>

          {restName && (
            <div className='fi-rest-badge'>
              {restLogo
                ? <img src={restLogo} alt={restName} className='fi-rest-logo' onError={e => e.target.style.display = 'none'} />
                : <span className='fi-rest-initial'>{restName[0]}</span>
              }
              <span>{restName}</span>
            </div>
          )}

          {/* Out of stock overlay */}
          {!inStock && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 6, backdropFilter: 'blur(2px)',
              borderRadius: 'inherit',
            }}>
              <div style={{ fontSize: 28 }}>🚫</div>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 13,
                background: 'rgba(0,0,0,0.5)', padding: '4px 12px',
                borderRadius: 20, letterSpacing: '0.5px' }}>
                {t('not_available')}
              </span>
            </div>
          )}

          {/* Unavailable — restaurant disabled */}
          {!restActive && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 6, backdropFilter: 'blur(2px)',
              borderRadius: 'inherit',
            }}>
              <div style={{ fontSize: 28 }}>⚠️</div>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 13,
                background: 'rgba(0,0,0,0.5)', padding: '4px 12px',
                borderRadius: 20, letterSpacing: '0.5px' }}>
                {t('unavailable')}
              </span>
            </div>
          )}

          {/* Closed overlay */}
          {!restaurantOpen && restActive && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 6, backdropFilter: 'blur(2px)',
              borderRadius: 'inherit',
            }}>
              <div style={{ fontSize: 28 }}>🔒</div>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 13,
                background: 'rgba(0,0,0,0.5)', padding: '4px 12px',
                borderRadius: 20, letterSpacing: '0.5px' }}>
                {t('closed')}
              </span>
            </div>
          )}

          <div className='fi-cart-ctrl'>
            {(!restaurantOpen || !inStock || !restActive) ? null : count === 0 ? (
              hasCustomizations ? (
                <button type="button" className='fi-customize-btn' onClick={openCustomize}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41"/>
                  </svg>
                  {t('customize')}
                </button>
              ) : (
                <button type="button" className='fi-add-btn' onClick={() => addToCart(id)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  {t('add')}
                </button>
              )
            ) : (
              <div className='fi-counter'>
                <button type="button" onClick={() => {
                  const keys = Object.keys(cartItems).filter(k => cartItems[k].itemId === id);
                  if (keys.length) removeFromCart(keys[keys.length - 1]);
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
                <span>{count}</span>
                <button type="button" onClick={() => hasCustomizations ? openCustomize() : addToCart(id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className='fi-body'>
          <div className='fi-top'>
            <p className='fi-name'>{displayName}</p>
            <div className='fi-rating'>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>{ratingCount > 0 ? avgRating.toFixed(1) : 'New'}</span>
              {ratingCount > 0 && <span style={{fontSize:10, opacity:0.6}}>({ratingCount})</span>}
            </div>
          </div>
          <p className={`fi-desc ${showFullDesc ? 'fi-desc-full' : ''}`}>
            {displayDesc}
            {(displayDesc || '').length > 70 && (
              <button 
                type="button" 
                className='fi-more-btn'
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowFullDesc(!showFullDesc);
                }}
              >
                {showFullDesc ? t('show_less') : t('more')}
              </button>
            )}
          </p>
          {dietTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '2px 0 6px' }}>
              {dietTags.map(t => (
                <span key={t} style={{
                  padding: '2px 8px', borderRadius: 50, fontSize: 9.5, fontWeight: 600,
                  background: DIET_COLORS[t]?.bg || 'var(--bg)',
                  color: DIET_COLORS[t]?.color || 'var(--text-2)',
                  letterSpacing: '0.2px',
                }}>{t}</span>
              ))}
            </div>
          )}
          <div className='fi-footer'>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <p className='fi-price'>{currency}{price}</p>
              {isFlashDeal && regularPrice > price && (
                <span style={{ fontSize: 13, textDecoration: 'line-through', opacity: 0.5, fontWeight: 700, color: dark ? '#cbd5e1' : '#64748b' }}>
                    {currency}{regularPrice}
                </span>
              )}
            </div>
            <div className='fi-footer-right'>
              {hasCustomizations && <span className='fi-customizable-badge'>{t('customizable')}</span>}
              <p className='fi-delivery'>🕐 20-30 {t('min')}</p>
            </div>
          </div>
        </div>
      </div>

      {showCustomize && createPortal(
        <div 
          style={{ 
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 99999, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(8px)' 
          }}
          onClick={() => setShowCustomize(false)}
        >
          <div 
            className="fi-modal-content"
            style={{ 
              background: modalSurface, borderRadius: 24, width: '100%', maxWidth: 460, 
              maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.45)', 
              border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'transparent'}`, 
              animation: 'modalFadeUp 0.3s ease' 
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '24px 24px 16px', borderBottom: `1px solid ${modalBorder}`, position: 'sticky', top: 0, background: modalSurface, borderRadius: '24px 24px 0 0', zIndex: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: modalText, letterSpacing: '-0.5px' }}>{displayName}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: modalMuted }}>{t('customize_your_order') || 'Customize your order'}</p>
                </div>
                <button 
                  onClick={() => setShowCustomize(false)}
                  style={{ background: dark ? '#1f2937' : '#f3f4f6', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: dark ? '#cbd5e1' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              {customizations.map((group, gi) => (
                <div key={gi} style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{ fontWeight: 900, fontSize: 16, color: modalText }}>{group.title}</span>
                    {group.required && <span style={{ fontSize: 10, fontWeight: 900, color: '#dc2626', background: '#ffebeb', border: '1px solid rgba(220,38,38,0.2)', padding: '2px 10px', borderRadius: 20, textTransform: 'uppercase' }}>Required</span>}
                    {group.multiSelect && <span style={{ fontSize: 10, fontWeight: 900, color: '#1d4ed8', background: '#eff6ff', border: '1px solid rgba(29,78,216,0.2)', padding: '2px 10px', borderRadius: 20, textTransform: 'uppercase' }}>Choose Many</span>}
                  </div>
                  {group.options.map((opt, oi) => {
                    const sel = selections[gi];
                    const isSelected = group.multiSelect ? (sel || []).includes(opt.label) : sel === opt.label;
                    return (
                      <div 
                        key={oi} 
                        onClick={() => handleSelect(gi, opt.label, group.multiSelect)}
                        style={{ 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                          padding: '14px 18px', borderRadius: 16, marginBottom: 10, 
                          border: `2px solid ${isSelected ? '#ff4e2a' : optionBorder}`, 
                          background: isSelected ? optionSelectedBg : optionBg, cursor: 'pointer', transition: 'all 0.2s' 
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 20, height: 20, borderRadius: group.multiSelect ? 6 : '50%', border: `2px solid ${isSelected ? '#ff4e2a' : (dark ? '#475569' : '#d1d5db')}`, background: isSelected ? '#ff4e2a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                            {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 15, color: modalText }}>{opt.label}</span>
                        </div>
                        {opt.extraPrice > 0 && <span style={{ fontSize: 14, fontWeight: 800, color: isSelected ? '#ff4e2a' : modalMuted }}>+{currency}{opt.extraPrice}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '0 24px 24px', position: 'sticky', bottom: 0, background: modalSurface, zIndex: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderTop: `1px solid ${modalBorder}`, marginBottom: 16, fontSize: 16, fontWeight: 900, color: modalText }}>
                <span>Total</span>
                <span>{currency}{totalPrice.toFixed(2)}</span>
              </div>
              <button 
                onClick={handleAddToCart}
                className="fi-modal-submit"
                style={{ width: '100%', padding: '16px', borderRadius: 50, background: 'linear-gradient(135deg, #ff3008, #ff6b35)', color: '#fff', border: 'none', fontWeight: 900, fontSize: 16, cursor: 'pointer', boxShadow: '0 10px 25px rgba(255,48,8,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.3s' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {t('add_to_cart_btn')} · {currency}{totalPrice.toFixed(2)}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes modalFadeUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .fi-modal-submit:hover { transform: scale(1.02); filter: brightness(1.1); box-shadow: 0 14px 32px rgba(255,48,8,0.45); }
            .fi-modal-submit:active { transform: scale(0.98); }
            
            /* Hide scrollbar for the modal content */
            .fi-modal-content {
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            .fi-modal-content::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        </div>,
        document.body
      )}
    </>
  );
};

export default FoodItem;