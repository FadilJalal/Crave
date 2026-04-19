import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './PlaceOrder.css';
import { StoreContext } from '../../Context/StoreContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import SplitPayment from '../../components/SplitPayment/SplitPayment.jsx';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const PlaceOrder = () => {
  const { t } = useTranslation();
  const [payment, setPayment] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [savedCards, setSavedCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [useNewCard, setUseNewCard] = useState(false);
  const [newCardName, setNewCardName] = useState("");
  const [newCardError, setNewCardError] = useState("");
  const [saveNewCard, setSaveNewCard] = useState(true);
  const stripe = useStripe();
  const elements = useElements();
  const [distanceWarning, setDistanceWarning] = useState('');
  const [eta, setEta] = useState(null);
  const [deliveryMode, setDeliveryMode] = useState('standard');
  const [sharedQuote, setSharedQuote] = useState(null);
  const [sharedQuoteLoading, setSharedQuoteLoading] = useState(false);
  const [splitStatus, setSplitStatus] = useState({
    paidCardAmount: 0,
    plannedCardAmount: 0,
    plannedCashAmount: 0,
    cashAmount: 0,
    paidAmounts: {},
  });
  const baseData = { firstName: '', lastName: '', email: '', street: '', apartment: '', area: '', building: '', city: '', state: '', zipcode: '', country: 'UAE', phone: '', deliveryNotes: '' };

  const parseLocation = (base) => {
    try {
      const saved = JSON.parse(localStorage.getItem('crave_location'));
      if (saved?.label) {
        const parts = saved.label.split(',').map(s => s.trim());
        return { ...base, area: parts[0] || '', city: parts[1] || parts[0] || '' };
      }
    } catch {}
    return base;
  };

  const [data, setData] = useState(() => parseLocation(baseData));

  const withSavedCoords = (address) => {
    try {
      const saved = JSON.parse(localStorage.getItem('crave_location') || '{}');
      const lat = Number(saved?.lat);
      const lng = Number(saved?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { ...address, lat, lng };
      }
    } catch {}
    return address;
  };

  useEffect(() => {
    const onLocChange = () => setData(prev => parseLocation({ ...prev }));
    window.addEventListener('crave_location_changed', onLocChange);
    return () => window.removeEventListener('crave_location_changed', onLocChange);
  }, []);

  const { getTotalCartAmount, token, food_list, foodListLoading, cartItems, url, setCartItems, currency, deliveryCharge, addresses, defaultAddress } = useContext(StoreContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Load saved profile and cards from backend
  useEffect(() => {
    if (!token) return;
    axios.get(url + '/api/user/profile', { headers: { token } })
      .then(res => {
        if (res.data.success) {
          const user = res.data.user;
          // Use default address if available
          let selected = user.savedAddresses?.find(a => a.isDefault) || user.savedAddresses?.[0] || {};
          setData(prev => ({
            ...prev,
            phone: user.phone || prev.phone,
            street:    selected.street    || prev.street,
            building:  selected.building  || prev.building,
            apartment: selected.apartment || prev.apartment,
            area:      selected.area      || prev.area,
            city:      selected.city      || prev.city,
            country:   selected.country   || prev.country,
            zipcode:   selected.zipcode   || prev.zipcode,
          }));
        }
      })
      .catch(() => {});

    // Fetch saved cards from backend using token (GET)
    axios.get(url + '/api/cards/list', { headers: { token } })
      .then(res => setSavedCards(res.data.cards || []))
      .catch(() => setSavedCards([]));

    setUseNewCard(false);
  }, [token]);

  // Fetch AI ETA
  useEffect(() => {
    if (!food_list.length || !Object.keys(cartItems).length) return;
    const first = Object.values(cartItems).find(e => e.quantity > 0);
    if (!first) return;
    const food = food_list.find(f => f._id === first.itemId);
    const rid = food?.restaurantId?._id || food?.restaurantId;
    if (!rid) return;
    let loc = null;
    try { loc = JSON.parse(localStorage.getItem('crave_location')); } catch {}
    axios.post(url + '/api/ai/eta', { restaurantId: rid, userLat: loc?.lat, userLng: loc?.lng })
      .then(res => { if (res.data.success) setEta(res.data.data); })
      .catch(() => {});
  }, [food_list, cartItems, url]);

  const promo = location.state?.promo || null;
  const discount = promo ? promo.discount : 0;
  const subtotal = getTotalCartAmount();
  const standardDeliveryFee = Number(sharedQuote?.standardFee ?? deliveryCharge ?? 0);
  
  // At checkout: shared delivery charges the same fee as standard.
  // The real discount kicks in AFTER matching on the waiting screen.
  // If there's already a match found at checkout time, apply the shared fee immediately.
  let selectedDeliveryFee = standardDeliveryFee;
  if (deliveryMode === 'shared' && sharedQuote?.eligible) {
    selectedDeliveryFee = Number(sharedQuote.sharedFee);
  }

  const finalTotal = Math.max(0, subtotal - discount + selectedDeliveryFee);

  const onChange = (e) => setData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  useEffect(() => {
    const city = data.city || data.state || '';
    const area = data.area || '';
    if (!city && !area) { setDistanceWarning(''); return; }

    const timer = setTimeout(async () => {
      try {
        const firstItem = Object.values(cartItems).find(e => e.quantity > 0);
        if (!firstItem) return;
        const food = food_list.find(f => f._id === firstItem.itemId);
        if (!food) return;
        const restaurant = food.restaurantId;
        if (!restaurant?.location?.lat || restaurant?.deliveryRadius === undefined || restaurant?.deliveryRadius === null) return;

        const radius = restaurant.deliveryRadius;
        if (radius === 0) { setDistanceWarning(''); return; }

        const res = await fetch(`${url}/api/geocode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: data }),
        });
        const geocoded = await res.json();
        if (!geocoded.success) {
          setDistanceWarning("⚠️ We couldn't verify your address. Please check your area and city fields.");
          return;
        }

        const dist = haversine(
          restaurant.location.lat, restaurant.location.lng,
          geocoded.lat, geocoded.lon
        );

        if (dist > radius) {
          setDistanceWarning(`🚫 This restaurant only delivers within ${radius} km. Your address is ${dist.toFixed(1)} km away.`);
        } else {
          setDistanceWarning('');
        }
      } catch { setDistanceWarning(''); }
    }, 800);

    return () => clearTimeout(timer);
  }, [data.city, data.area, data.street, data.state]);

  const buildOrderItems = () => {
    const orderItems = [];
    for (const key in cartItems) {
      const entry = cartItems[key];
      if (entry.quantity > 0) {
        const food = food_list.find(f => f._id === entry.itemId);
        if (food) {
          orderItems.push({
            ...food,
            quantity: entry.quantity,
            selections: entry.selections || {},
            extraPrice: entry.extraPrice || 0,
          });
        }
      }
    }
    return orderItems;
  };

  useEffect(() => {
    if (!token || !food_list.length) return;

    const orderItems = buildOrderItems();
    if (!orderItems.length) {
      setSharedQuote(null);
      setDeliveryMode('standard');
      return;
    }

    if (!data.street || !(data.city || data.state) || !data.area) {
      setSharedQuote(null);
      setDeliveryMode('standard');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSharedQuoteLoading(true);
        const res = await axios.post(
          url + '/api/order/shared-delivery/quote',
          { items: orderItems, address: withSavedCoords(data) },
          { headers: { token } }
        );

        const quote = res?.data?.data || null;
        setSharedQuote(quote);

        if (!quote?.eligible && deliveryMode === 'shared') {
          setDeliveryMode('standard');
        }
      } catch {
        setSharedQuote(null);
        setDeliveryMode('standard');
      } finally {
        setSharedQuoteLoading(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [token, url, food_list, cartItems, data.street, data.area, data.city, data.state]);

  const placeOrder = async (e) => {
    e.preventDefault();
    if (distanceWarning) {
      toast.error(distanceWarning, { autoClose: 6000 });
      return;
    }
    setLoading(true);
    const orderItems = buildOrderItems();
    if (!orderItems.length) { toast.error('Cart is empty'); setLoading(false); return; }

    const getResId = (it) => it.restaurantId?._id || it.restaurantId || null;
    const restaurantId = getResId(orderItems[0]);
    if (!restaurantId) { toast.error('Restaurant info missing. Refresh and try again.'); setLoading(false); return; }
    if (orderItems.some(it => getResId(it) !== restaurantId)) { toast.error('You can only order from one restaurant at a time.'); setLoading(false); return; }

    const restaurant = orderItems[0]?.restaurantId;
    const minOrder = restaurant?.minimumOrder || 0;
    if (minOrder > 0 && subtotal < minOrder) {
      toast.error(`🛒 Minimum order for this restaurant is AED ${minOrder}. Add AED ${(minOrder - subtotal).toFixed(2)} more.`, { autoClose: 6000 });
      setLoading(false); return;
    }

    if (payment === 'split' && splitStatus.plannedCardAmount <= 0) {
      toast.error('Please set a valid split plan before placing the order.');
      setLoading(false);
      return;
    }

    if (payment === 'split' && splitStatus.paidCardAmount + 0.01 < splitStatus.plannedCardAmount) {
      toast.error('Please complete all planned card payments before placing the split order.');
      setLoading(false);
      return;
    }

    const splitCashDue = payment === 'split'
      ? Math.max(0, splitStatus.plannedCashAmount || (finalTotal - (splitStatus.plannedCardAmount || 0)))
      : 0;

    const splitCardCount = Object.values(splitStatus.paidAmounts || {}).filter(v => v > 0).length;

    const orderData = {
      address: withSavedCoords(data),
      items: orderItems,
      amount: finalTotal,
      deliveryFee: selectedDeliveryFee,
      restaurantId,
      promoCode: promo?.code || null,
      discount: discount || 0,
      paymentMethod: payment,
      deliveryPreference: deliveryMode === 'shared' ? 'shared' : 'express',
      sharedDelivery: {
        enabled: deliveryMode === 'shared' && !!sharedQuote?.eligible,
        sharedFee: selectedDeliveryFee,
        matchedOrderId: sharedQuote?.matchedOrderId || null,
      },
      ...(payment === 'split' && {
        splitCardTotal: splitStatus.paidCardAmount || 0,
        splitCashDue: splitCashDue,
        splitCardCount: splitCardCount || 1,
      }),
    };

    try {
      if (payment === 'stripe') {
        let paymentMethodId = selectedCardId;
        if (useNewCard) {
          setNewCardError("");
          if (!stripe || !elements) { setNewCardError("Stripe not loaded"); setLoading(false); return; }
          if (!newCardName) { setNewCardError("Name on card required"); setLoading(false); return; }
          const cardElement = elements.getElement(CardElement);
          const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
            billing_details: { name: newCardName }
          });
          if (stripeError) {
            setNewCardError(stripeError.message);
            setLoading(false);
            return;
          }
          paymentMethodId = paymentMethod.id;
          if (saveNewCard) {
            try {
              const res = await axios.post(
                url + '/api/cards/save',
                { paymentMethodId: paymentMethod.id },
                { headers: { token } }
              );
              if (res.data.success) {
                setSavedCards(prev => [...prev, res.data.card]);
              }
            } catch {}
          }
        }
        if (!paymentMethodId) {
          toast.error('Please select or enter a card for payment.');
          setLoading(false);
          return;
        }
        const res = await axios.post(url + '/api/order/place', { ...orderData, paymentMethodId }, { headers: { token } });
        if (res.data.success && res.data.paid) {
          toast.success('Payment successful! Order placed.');
          setCartItems({});
          const newOrderId = res.data.order?._id || res.data.orderId;
          if (newOrderId && deliveryMode === 'shared') navigate(`/order/shared-waiting/${newOrderId}`);
          else if (newOrderId) navigate(`/order/track/${newOrderId}`);
          else navigate('/myorders');
        } else if (res.data.success && res.data.session_url) {
          window.location.replace(res.data.session_url);
        } else if (res.data.outOfRange) {
          toast.error('🚫 ' + res.data.message, { autoClose: 6000 });
        } else {
          toast.error(res.data.message || 'Something went wrong');
        }
      } else {
        const res = await axios.post(url + '/api/order/placecod', orderData, { headers: { token } });
        if (res.data.success) {
          if (promo?.code) { try { await axios.post(url + '/api/promo/use', { code: promo.code, restaurantId: promo.restaurantId }, { headers: { token } }); } catch {} }
          try {
            await axios.put(url + '/api/user/profile', {
              phone: data.phone,
              address: { street: data.street, building: data.building, apartment: data.apartment, area: data.area, city: data.city, country: data.country, zipcode: data.zipcode }
            }, { headers: { token } });
          } catch {}
          toast.success('Order placed successfully!'); 
          setCartItems({}); 
          const newOrderId = res.data.order?._id || res.data.orderId;
          if (newOrderId && deliveryMode === 'shared') navigate(`/order/shared-waiting/${newOrderId}`);
          else if (newOrderId) navigate(`/order/track/${newOrderId}`);
          else navigate('/myorders');
        }
        else if (res.data.outOfRange) toast.error('🚫 ' + res.data.message, { autoClose: 6000 });
        else toast.error(res.data.message || 'Something went wrong');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Network error');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!token) { toast.error('Please sign in to place an order'); navigate('/cart'); }
    else if (!foodListLoading && subtotal === 0) navigate('/cart');
  }, [token, foodListLoading, subtotal]);

  return (
    <div className='po-page'>
      <div className='po-header'>
        <button className='po-back' onClick={() => navigate('/cart')}>{t("back_to_cart")}</button>
        <h1 className='po-title'>{t("checkout")}</h1>
      </div>

      <form onSubmit={placeOrder} className='po-layout'>
        <div className='po-left'>
          <div className='po-card'>
            <h3 className='po-card-title'><span className='po-step'>1</span> {t("delivery_details")}</h3>
            <div className='po-grid-2'>
              <div className='po-field'><label>{t("first_name")}</label><input name='firstName' value={data.firstName} onChange={onChange} placeholder='John' required /></div>
              <div className='po-field'><label>{t("last_name")}</label><input name='lastName' value={data.lastName} onChange={onChange} placeholder='Doe' required /></div>
            </div>
            <div className='po-grid-2'>
              <div className='po-field'><label>{t("email_address")}</label><input name='email' type='email' value={data.email} onChange={onChange} placeholder='john@example.com' required /></div>
              <div className='po-field'><label>{t("phone_number")}</label><input name='phone' value={data.phone} onChange={onChange} placeholder='+971 50 000 0000' required /></div>
            </div>
            <div className='po-field'><label>{t("street_address")}</label><input name='street' value={data.street} onChange={onChange} placeholder='e.g. Al Nahda Street, Sheikh Zayed Road' required /></div>
            <div className='po-grid-2'>
              <div className='po-field'><label>{t("building_villa")}</label><input name='building' value={data.building} onChange={onChange} placeholder='e.g. Al Reef Tower, Villa 12' /></div>
              <div className='po-field'><label>{t("apartment_room")}</label><input name='apartment' value={data.apartment} onChange={onChange} placeholder='e.g. Apt 401, Floor 4' /></div>
            </div>
            <div className='po-grid-2'>
              <div className='po-field'><label>{t("area_neighbourhood")}</label><input name='area' value={data.area} onChange={onChange} placeholder='e.g. Downtown, JBR, Deira' required /></div>
              <div className='po-field'><label>{t("city")}</label><input name='city' value={data.city} onChange={onChange} placeholder='Dubai' required /></div>
            </div>
            <div className='po-grid-2'>
              <div className='po-field'><label>{t("country")}</label><input name='country' value={data.country} onChange={onChange} placeholder='UAE' required /></div>
              <div className='po-field'><label>{t("zip_code")} <span style={{fontWeight:400,color:'#9ca3af'}}>{t("optional")}</span></label><input name='zipcode' value={data.zipcode} onChange={onChange} placeholder='00000' /></div>
            </div>
            <div className='po-field'>
              <label>{t("delivery_notes")} <span style={{fontWeight:400,color:'#9ca3af'}}>{t("optional")}</span></label>
              <input name='deliveryNotes' value={data.deliveryNotes} onChange={onChange} placeholder='e.g. Ring doorbell, leave at door, call on arrival...' />
            </div>
          </div>

          <div className='po-card'>
            <h3 className='po-card-title'><span className='po-step'>2</span> {t("payment_method")}</h3>
            <div className='po-payment-opts'>
              <div className={`po-payment-opt ${payment === 'cod' ? 'po-pay-active' : ''}`} onClick={() => setPayment('cod')}>
                <div className='po-pay-radio'>{payment === 'cod' && <div className='po-pay-dot'/>}</div>
                <div className='po-pay-icon'>💵</div>
                <div><p className='po-pay-name'>{t("cash_on_delivery")}</p><p className='po-pay-sub'>{t("pay_when_arrives")}</p></div>
              </div>
              <div className={`po-payment-opt ${payment === 'stripe' ? 'po-pay-active' : ''}`} onClick={() => setPayment('stripe')}>
                <div className='po-pay-radio'>{payment === 'stripe' && <div className='po-pay-dot'/>}</div>
                <div className='po-pay-icon'>💳</div>
                <div><p className='po-pay-name'>{t("credit_debit_card")}</p><p className='po-pay-sub'>{t("secure_payment_stripe")}</p></div>
              </div>
              <div className={`po-payment-opt ${payment === 'split' ? 'po-pay-active' : ''}`} onClick={() => setPayment('split')}>
                <div className='po-pay-radio'>{payment === 'split' && <div className='po-pay-dot'/>}</div>
                <div className='po-pay-icon'>🧮</div>
                <div><p className='po-pay-name'>{t("split_by_card")}</p><p className='po-pay-sub'>{t("multiple_cards_custom")}</p></div>
              </div>
            </div>

            {payment === 'stripe' && (
              <div style={{ marginTop: 32 }}>
                <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 12, letterSpacing: 0.3, color: '#1e293b' }}>{t("choose_a_card")}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {savedCards.map(card => {
                    const isSelected = !useNewCard && selectedCardId === card.paymentMethodId;
                    const cardIcon = card.brand?.toLowerCase().includes('visa')
                      ? '🟦'
                      : card.brand?.toLowerCase().includes('master')
                        ? '🟥'
                        : '💳';
                    return (
                      <label
                        key={card.paymentMethodId}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                          border: isSelected ? '2px solid #ff4e2a' : '1.5px solid #e5e7eb',
                          borderRadius: 14,
                          background: isSelected ? '#fff6f0' : '#fff',
                          boxShadow: isSelected ? '0 2px 8px 0 #ffedd5' : '0 1px 4px 0 #f3f4f6',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'border 0.18s, box-shadow 0.18s, background 0.18s',
                          minHeight: 48,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = isSelected ? '#fff6f0' : '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = isSelected ? '#fff6f0' : '#fff'}
                      >
                        <input
                          type="radio"
                          name="selectedCard"
                          value={card.paymentMethodId}
                          checked={isSelected}
                          onChange={() => { setSelectedCardId(card.paymentMethodId); setUseNewCard(false); }}
                          style={{ accentColor: '#ff4e2a', marginRight: 2, width: 18, height: 18 }}
                        />
                        <span style={{ fontSize: 22, marginRight: 2 }}>{cardIcon}</span>
                        <span style={{ fontWeight: 800, letterSpacing: 1, fontSize: 16, color: '#222' }}>{card.brand?.toUpperCase()} ****{card.last4}</span>
                        <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 10 }}>Exp: {card.expMonth}/{card.expYear}</span>
                        {isSelected && (
                          <span style={{ position: 'absolute', right: 18, top: 18, fontSize: 18, color: '#ff4e2a' }}>✔</span>
                        )}
                      </label>
                    );
                  })}
                  <label
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                      border: useNewCard ? '2px solid #ff4e2a' : '1.5px dashed #e5e7eb',
                      borderRadius: 14,
                      background: useNewCard ? '#fff6f0' : '#fff',
                      boxShadow: useNewCard ? '0 2px 8px 0 #ffedd5' : '0 1px 4px 0 #f3f4f6',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'border 0.18s, box-shadow 0.18s, background 0.18s',
                      minHeight: 48,
                    }}
                    onClick={() => { setUseNewCard(true); setSelectedCardId(""); }}
                  >
                    <input
                      type="radio"
                      name="selectedCard"
                      checked={useNewCard}
                      onChange={() => { setUseNewCard(true); setSelectedCardId(""); }}
                      style={{ accentColor: '#ff4e2a', marginRight: 2, width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 22, marginRight: 2 }}>➕</span>
                    <span style={{ fontWeight: 800, letterSpacing: 1, fontSize: 16, color: '#222' }}>{t("pay_with_new_card")}</span>
                  </label>
                </div>
                {useNewCard && (
                  <div style={{ marginTop: 16, background: '#fff', borderRadius: 14, padding: '14px 14px 10px', boxShadow: '0 1px 6px 0 #f3f4f6' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8, color: '#1e293b' }}>{t("enter_card_details")}</div>
                    <div style={{ marginBottom: 10 }}>
                      <input
                        type="text"
                        placeholder="Name on Card"
                        value={newCardName}
                        onChange={e => setNewCardName(e.target.value)}
                        style={{ width: '100%', padding: 10, borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, marginBottom: 8 }}
                      />
                      <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 8, padding: 10, background: '#f9fafb' }}>
                        <CardElement options={{ style: { base: { fontSize: '15px', color: '#222', fontFamily: 'DM Sans, sans-serif', '::placeholder': { color: '#bdbdbd' } }, invalid: { color: '#dc2626' } } }} />
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8 }}>
                      <input type="checkbox" checked={saveNewCard} onChange={e => setSaveNewCard(e.target.checked)} style={{ accentColor: '#ff4e2a' }} /> {t("save_card_for_future")}
                    </label>
                    {newCardError && <div style={{ color: '#dc2626', fontWeight: 700, marginBottom: 8 }}>{newCardError}</div>}
                  </div>
                )}
              </div>
            )}
          </div>

          {payment === 'split' && (
            <SplitPayment
              total={finalTotal}
              apiBaseUrl={url}
              currency={currency}
              onComplete={(status) => {
                setSplitStatus(s => ({
                  ...s,
                  paidCardAmount: status?.paidCardAmount || 0,
                  cashAmount: status?.cashAmount || 0,
                  paidAmounts: status?.paidAmounts || {},
                }));
                toast.success('Card payment confirmed.');
              }}
              onPlanUpdate={(plan) => {
                setSplitStatus(s => ({
                  ...s,
                  plannedCardAmount: plan?.plannedCardAmount || 0,
                  plannedCashAmount: plan?.plannedCashAmount || 0,
                }));
              }}
            />
          )}
        </div>

        <div className='po-right'>
          <div className='po-card po-summary-card'>
            <h3 className='po-card-title'>{t("order_summary")}</h3>
            <div className='po-sum-rows'>
              <div className='po-sum-row'><span>{t("subtotal")}</span><span>{currency}{subtotal.toFixed(2)}</span></div>
              {discount > 0 && <div className='po-sum-row' style={{ color: '#16a34a', fontWeight: 700 }}><span>{t("discount_label")} ({promo.code})</span><span>- {currency}{discount.toFixed(2)}</span></div>}
              <div className='po-sum-row'><span>{t("delivery_fee")}</span><span>{currency}{selectedDeliveryFee.toFixed(2)}</span></div>
              <div className='po-sum-row po-sum-total'><span>{t("total")}</span><span>{currency}{finalTotal.toFixed(2)}</span></div>
            </div>
            <div className='po-delivery-mode-box'>
                <p className='po-delivery-mode-title'>{t("delivery_type")}</p>
                <div className='po-delivery-pills'>
                  <button
                    type='button'
                    className={`po-pill ${deliveryMode === 'standard' ? 'po-pill-active' : ''}`}
                    onClick={() => setDeliveryMode('standard')}
                  >
                    ⚡ Express
                  </button>
                  <button
                    type='button'
                    className={`po-pill ${deliveryMode === 'shared' ? 'po-pill-active' : ''}`}
                    onClick={() => setDeliveryMode('shared')}
                  >
                    🤝 Shared
                    {sharedQuote?.eligible && <span className='po-pill-badge'>MATCH</span>}
                  </button>
                </div>

                {deliveryMode === 'shared' && (
                  <p className='po-shared-hint'>
                    {sharedQuote?.eligible 
                      ? `🎉 Match found! Save ${currency}${Number(sharedQuote.savings).toFixed(2)}`
                      : `🔍 We'll search for a partner for 2 min after you place your order`
                    }
                  </p>
                )}
              </div>
            {eta && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 12,
                background: 'var(--card)', border: '1.5px solid var(--border)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: 'var(--brand-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    {t("est_delivery", { min: eta.estimatedMinutes })}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
                    {t("away_km", { km: eta.distanceKm })}
                  </p>
                </div>
              </div>
            )}
            {distanceWarning && (
              <div style={{
                padding: '12px 16px', borderRadius: 10, marginBottom: 12,
                background: '#fef2f2', border: '1.5px solid #fecaca',
                fontSize: 13, fontWeight: 700, color: '#dc2626', lineHeight: 1.5,
              }}>
                {distanceWarning}
              </div>
            )}
            <button className='po-submit' type='submit' disabled={loading || !!distanceWarning}
              style={distanceWarning ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
              {loading ? t("placing_order") : payment === 'cod' ? t("place_order") : payment === 'split' ? t("place_split_order") : t("proceed_to_payment")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PlaceOrder;