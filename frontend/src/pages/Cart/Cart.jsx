import React, { useContext, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './Cart.css';
import { StoreContext } from '../../Context/StoreContext';
import { useNavigate } from 'react-router-dom';
import CartUpsell from '../../components/CartUpsell/CartUpsell';
import PromoSection from '../../components/PromoSection/PromoSection';

const Cart = () => {
  const { t, i18n } = useTranslation();
  const { cartItems, food_list, foodListLoading, removeFromCart, addToCart, getTotalCartAmount, url, token, currency, deliveryCharge } = useContext(StoreContext);
  const navigate = useNavigate();

  // Build cart rows from the new cartItems format
  // Each key is a unique cart entry (same food + different options = separate rows)
  const cartRows = Object.entries(cartItems)
    .filter(([, entry]) => entry.quantity > 0)
    .map(([key, entry]) => {
      const food = food_list.find(f => f._id === entry.itemId);
      if (!food) return null;
      return { key, food, entry };
    })
    .filter(Boolean);

  const subtotal = getTotalCartAmount();
  // Get restaurant from first cart item
  const cartRestaurantId = useMemo(() => {
    if (foodListLoading || food_list.length === 0) return null;
    const firstEntry = Object.values(cartItems).find(e => e.quantity > 0);
    if (!firstEntry) return null;
    const food = food_list.find(f => f._id === firstEntry.itemId);
    const rid = food?.restaurantId?._id || food?.restaurantId || null;
    return rid ? String(rid) : null;
  }, [cartItems, food_list, foodListLoading]);

  const cartMinimumOrder = useMemo(() => {
    const firstEntry = Object.values(cartItems).find(e => e.quantity > 0);
    if (!firstEntry) return 0;
    const food = food_list.find(f => f._id === firstEntry.itemId);
    return food?.restaurantId?.minimumOrder || 0;
  }, [cartItems, food_list]);
  const [availablePromos, setAvailablePromos] = useState([]);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const discount = appliedPromo ? appliedPromo.discount : 0;
  const grandTotal = subtotal === 0 ? 0 : Math.max(0, subtotal - discount + deliveryCharge);

  // Fetch available promos for this restaurant
  React.useEffect(() => {
    if (!cartRestaurantId) return;
    axios.get(url + '/api/promo/public/' + cartRestaurantId)
      .then(res => {
        if (res.data.success) setAvailablePromos(res.data.data);
      })
      .catch(() => {});
  }, [cartRestaurantId, url]);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    if (!token) { setPromoError(t("please_sign_in_promo")); return; }
    setPromoLoading(true);
    setPromoError('');
    try {
      const res = await axios.post(url + '/api/promo/validate', { code: promoInput, subtotal, restaurantId: cartRestaurantId }, { headers: { token } });
      if (res.data.success) {
        setAppliedPromo({ ...res.data, code: promoInput });
      } else {
        setPromoError(res.data.message);
      }
    } catch { setPromoError(t("could_not_apply_promo")); }
    finally { setPromoLoading(false); }
  };

  const handleRemovePromo = () => { setAppliedPromo(null); setPromoInput(''); setPromoError(''); };
  const handlePickPromoCode = (code) => { setPromoInput(code); setPromoError(''); };

  // Parse selections into pills
  const parseSelections = (selections = {}) => {
    return Object.entries(selections)
      .filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : true))
      .map(([k, v]) => ({ label: k, value: Array.isArray(v) ? v.join(', ') : v }));
  };

  return (
    <div className='cart-page'>
      <h1 className='cart-title'>{t("your_cart")}</h1>

      {foodListLoading ? (
        <div className='cart-empty'>
          <div className='cart-empty-icon'>⏳</div>
          <p className='cart-empty-title'>{t("loading_cart")}</p>
        </div>
      ) : cartRows.length === 0 ? (
        <div className='cart-empty'>
          <div className='cart-empty-icon'>🛒</div>
          <p className='cart-empty-title'>{t("cart_is_empty")}</p>
          <p className='cart-empty-sub'>{t("add_items_delicious")}</p>
          <button className='cart-empty-btn' onClick={() => navigate('/')}>{t("browse_menu")}</button>
        </div>
      ) : (
        <div className='cart-layout'>
          <div className='cart-items-section'>
            <div className='cart-items-header'>
              <span>{t("items_in_your_cart_count", { count: cartRows.length })}</span>
            </div>

            {cartRows.map(({ key, food, entry }) => {
              const now = Date.now();
              const isFlash = food.isFlashDeal === true || food.isFlashDeal === "true";
              const isNotExpired = food.flashDealExpiresAt && (new Date(food.flashDealExpiresAt).getTime() + 3600000) > now;
              const isFlashDealActive = isFlash && food.salePrice && isNotExpired;
              const effectivePrice = isFlashDealActive ? food.salePrice : food.price;
              const itemTotal = (effectivePrice + (entry.extraPrice || 0)) * entry.quantity;
              const selPills = parseSelections(entry.selections);

              return (
                <div key={key} className='cart-row'>
                  <img
                    src={url + '/images/' + food.image}
                    alt={food.name}
                    className='cart-row-img'
                    onError={e => e.target.src = 'https://via.placeholder.com/80'}
                  />
                  <div className='cart-row-info'>
                    <p className='cart-row-name'>{food.name}</p>
                    {selPills.length > 0 ? (
                      <div className='cart-row-customizations'>
                        {selPills.map(({ label, value }) => (
                          <span key={label} className='cart-sel-pill'>
                            <span className='cart-sel-label'>{label}</span>
                            <span className='cart-sel-value'>{value}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className='cart-row-cat'>{food.category}</p>
                    )}
                    {/* ✅ Show per-item price if there's an extra charge */}
                    {entry.extraPrice > 0 && (
                      <p className='cart-row-unit-price'>
                        {currency}{effectivePrice.toFixed(2)} + {currency}{entry.extraPrice.toFixed(2)} {t("extra")}
                      </p>
                    )}
                  </div>

                  <div className='cart-row-ctrl'>
                    <button onClick={() => removeFromCart(key)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <span>{entry.quantity}</span>
                    <button onClick={() => addToCart(food._id, entry.selections)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>

                  {/* ✅ Shows correct price including extras */}
                  <p className='cart-row-price'>{currency}{itemTotal.toFixed(2)}</p>

                  <button className='cart-row-remove' onClick={() => {
                    // Remove all quantity of this specific variation
                    for (let i = 0; i < entry.quantity; i++) removeFromCart(key);
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              );
            })}
            <CartUpsell />
            <PromoSection
              availablePromos={availablePromos}
              promoInput={promoInput}
              setPromoInput={(value) => { setPromoInput(value); setPromoError(''); }}
              appliedPromo={appliedPromo}
              promoLoading={promoLoading}
              promoError={promoError}
              onApply={handleApplyPromo}
              onRemove={handleRemovePromo}
              onPickCode={handlePickPromoCode}
            />
          </div>

          <div className='cart-summary'>
            <h3 className='cart-summary-title'>{t("order_summary")}</h3>
            <div className='cart-summary-rows'>
              <div className='cart-sum-row'><span>{t("subtotal")}</span><span>{currency}{subtotal.toFixed(2)}</span></div>
              {discount > 0 && <div className='cart-sum-row' style={{ color: '#16a34a', fontWeight: 700 }}><span>{t("discount_label")} ({appliedPromo.code})</span><span>- {currency}{discount.toFixed(2)}</span></div>}
              <div className='cart-sum-row'><span>{t("delivery_fee")}</span><span>{subtotal === 0 ? `${currency}0.00` : `${currency}${deliveryCharge}.00`}</span></div>
              <div className='cart-sum-row cart-sum-row-total'><span>{t("total")}</span><span>{currency}{grandTotal.toFixed(2)}</span></div>
            </div>

            <button className='cart-checkout-btn'
              disabled={cartMinimumOrder > 0 && subtotal < cartMinimumOrder}
              style={cartMinimumOrder > 0 && subtotal < cartMinimumOrder ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              onClick={() => { if (cartMinimumOrder > 0 && subtotal < cartMinimumOrder) return; navigate('/order', { state: { promo: appliedPromo ? { ...appliedPromo, restaurantId: cartRestaurantId } : null } }); }}>
              {t("proceed_to_checkout")}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            {cartMinimumOrder > 0 && subtotal < cartMinimumOrder && (
              <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: '#fff7ed', border: '1px solid #fed7aa', fontSize: 13, color: '#92400e', fontWeight: 600 }}>
                {t("min_order_msg", { minOrder: cartMinimumOrder, diff: (cartMinimumOrder - subtotal).toFixed(2) })}
              </div>
            )}
            <button className='cart-continue-btn' onClick={() => navigate('/')}>
              {i18n.language === 'ar' ? t("continue_shopping").replace("←", "→") : t("continue_shopping")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;