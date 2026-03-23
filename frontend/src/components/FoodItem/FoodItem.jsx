import { useState, useContext } from 'react';
import './FoodItem.css';
import { StoreContext } from '../../Context/StoreContext';

const FoodItem = ({ image, name, price, description, id, restaurantId, customizations = [], dealTag = null, restaurantOpen = true, avgRating = 0, ratingCount = 0, inStock = true }) => {
  const { cartItems, addToCart, removeFromCart, getItemCount, url, currency } = useContext(StoreContext);

  const count = getItemCount(id);
  const restName = restaurantId?.name || '';
  const restLogo = restaurantId?.logo ? `${url}/images/${restaurantId.logo}` : null;
  const hasCustomizations = customizations && customizations.length > 0;

  const [showCustomize, setShowCustomize] = useState(false);
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
        if (selected) extra += opt.extraPrice || 0;
      });
    });
    return extra;
  };

  const handleAddToCart = () => {
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
    setSelections({});
    setShowCustomize(true);
  };

  const extraPrice = getExtraPrice();
  const totalPrice = price + extraPrice;

  return (
    <>
      <div className='fi-card'>
        <div className='fi-img-wrap'>
          {dealTag && (
            <div className='fi-deal-tag' style={{ background: dealTag.bg, border: `1px solid ${dealTag.border}`, color: dealTag.color }}>
              {dealTag.label}
            </div>
          )}
          <img className='fi-img' src={url + '/images/' + image} alt={name}
            onError={e => { e.target.src = 'https://via.placeholder.com/300x200?text=Food'; }} />

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
                Out of Stock
              </span>
            </div>
          )}

          {/* Closed overlay */}
          {!restaurantOpen && inStock && (
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
                Closed
              </span>
            </div>
          )}

          <div className='fi-cart-ctrl'>
            {(!restaurantOpen || !inStock) ? null : count === 0 ? (
              hasCustomizations ? (
                <button className='fi-customize-btn' onClick={openCustomize}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41"/>
                  </svg>
                  CUSTOMIZE
                </button>
              ) : (
                <button className='fi-add-btn' onClick={() => addToCart(id)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  ADD
                </button>
              )
            ) : (
              <div className='fi-counter'>
                <button onClick={() => {
                  const keys = Object.keys(cartItems).filter(k => cartItems[k].itemId === id);
                  if (keys.length) removeFromCart(keys[keys.length - 1]);
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
                <span>{count}</span>
                <button onClick={() => hasCustomizations ? openCustomize() : addToCart(id)}>
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
            <p className='fi-name'>{name}</p>
            <div className='fi-rating'>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>{ratingCount > 0 ? avgRating.toFixed(1) : 'New'}</span>
              {ratingCount > 0 && <span style={{fontSize:10, opacity:0.6}}>({ratingCount})</span>}
            </div>
          </div>
          <p className='fi-desc'>{description}</p>
          <div className='fi-footer'>
            <p className='fi-price'>{currency}{price}</p>
            <div className='fi-footer-right'>
              {hasCustomizations && <span className='fi-customizable-badge'>Customizable</span>}
              <p className='fi-delivery'>🕐 20-30 min</p>
            </div>
          </div>
        </div>
      </div>

      {showCustomize && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCustomize(false)}>
          <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 460, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid #f3f4f6', position: 'sticky', top: 0, background: '#fff', borderRadius: '24px 24px 0 0', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#111827' }}>{name}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>Customize your order</p>
                </div>
                <button onClick={() => setShowCustomize(false)}
                  style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {customizations.map((group, gi) => (
                <div key={gi} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>{group.title}</span>
                    {group.required && <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#fff1f1', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: 20 }}>Required</span>}
                    {group.multiSelect && <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 20 }}>Choose multiple</span>}
                  </div>
                  {group.options.map((opt, oi) => {
                    const sel = selections[gi];
                    const isSelected = group.multiSelect ? (sel || []).includes(opt.label) : sel === opt.label;
                    return (
                      <div key={oi} onClick={() => handleSelect(gi, opt.label, group.multiSelect)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, marginBottom: 8, border: `2px solid ${isSelected ? '#ff4e2a' : '#e5e7eb'}`, background: isSelected ? '#fff5f3' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 18, height: 18, borderRadius: group.multiSelect ? 4 : '50%', border: `2px solid ${isSelected ? '#ff4e2a' : '#d1d5db'}`, background: isSelected ? '#ff4e2a' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                            {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{opt.label}</span>
                        </div>
                        {opt.extraPrice > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>+{currency}{opt.extraPrice}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div style={{ padding: '0 24px 24px', position: 'sticky', bottom: 0, background: '#fff' }}>
              {extraPrice > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #f3f4f6', marginBottom: 12, fontSize: 14, fontWeight: 700, color: '#374151' }}>
                  <span>Total</span>
                  <span>{currency}{totalPrice.toFixed(2)}</span>
                </div>
              )}
              <button onClick={handleAddToCart}
                style={{ width: '100%', padding: '14px', borderRadius: 50, background: 'linear-gradient(135deg, #ff4e2a, #ff6a3d)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 20px rgba(255,78,42,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                ADD TO CART{extraPrice > 0 ? ` · ${currency}${totalPrice.toFixed(2)}` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FoodItem;