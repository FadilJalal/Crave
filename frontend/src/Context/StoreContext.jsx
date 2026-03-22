// frontend/src/Context/StoreContext.jsx
import { createContext, useEffect, useState, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  const url = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
  const [food_list, setFoodList] = useState([]);
  const [foodListLoading, setFoodListLoading] = useState(true);
  const [token, setToken] = useState("");
  const currency = "AED ";
  // cartItems: { cartKey -> { itemId, quantity, selections, extraPrice } }
  const [cartItems, setCartItems] = useState({});

  // Calculate delivery fee dynamically from restaurant tiers + customer location
  const deliveryCharge = useMemo(() => {
    const firstEntry = Object.values(cartItems).find(e => e.quantity > 0);
    if (!firstEntry) return 5;
    const food = food_list.find(f => f._id === firstEntry.itemId);
    const restaurant = food?.restaurantId;
    if (!restaurant?.deliveryTiers?.length) return 5;

    // Get customer location
    let customerLoc = null;
    try {
      const saved = JSON.parse(localStorage.getItem('crave_location'));
      if (saved?.lat && saved?.lng) customerLoc = saved;
    } catch {}
    if (!customerLoc || !restaurant.location?.lat) return restaurant.deliveryTiers[restaurant.deliveryTiers.length - 1]?.fee ?? 5;

    // Haversine distance
    const R = 6371;
    const dLat = (customerLoc.lat - restaurant.location.lat) * Math.PI / 180;
    const dLng = (customerLoc.lng - restaurant.location.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(restaurant.location.lat * Math.PI/180) * Math.cos(customerLoc.lat * Math.PI/180) * Math.sin(dLng/2)**2;
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    // Find matching tier
    const sorted = [...restaurant.deliveryTiers].sort((a, b) => {
      if (a.upToKm === null) return 1;
      if (b.upToKm === null) return -1;
      return a.upToKm - b.upToKm;
    });
    for (const tier of sorted) {
      if (tier.upToKm === null || distKm <= tier.upToKm) return tier.fee;
    }
    return sorted[sorted.length - 1]?.fee ?? 5;
  }, [cartItems, food_list]);

  // cartKey = "itemId" for plain items, "itemId::Size:Large|Drink:Pepsi" for customized

  const buildCartKey = (itemId, selections = {}) => {
    const selStr = Object.entries(selections)
      .filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : true))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${Array.isArray(v) ? [...v].sort().join(",") : v}`)
      .join("|");
    return selStr ? `${itemId}::${selStr}` : itemId;
  };

  const calcExtraPrice = (food, selections = {}) => {
    if (!food?.customizations?.length) return 0;
    let extra = 0;
    food.customizations.forEach((group, gi) => {
      // Support title-keyed (current) and index-keyed (legacy) selections
      const sel = selections[group.title] !== undefined ? selections[group.title] : selections[gi];
      group.options.forEach((opt) => {
        const selected = Array.isArray(sel) ? sel.includes(opt.label) : sel === opt.label;
        if (selected) extra += opt.extraPrice || 0;
      });
    });
    return extra;
  };

  const addToCart = async (itemId, selections = {}) => {
    const food = food_list.find((f) => f._id === itemId);
    const extraPrice = calcExtraPrice(food, selections);
    const key = buildCartKey(itemId, selections);

    setCartItems((prev) => ({
      ...prev,
      [key]: {
        itemId,
        quantity: (prev[key]?.quantity || 0) + 1,
        selections,
        extraPrice,
      },
    }));

    if (token) {
      try {
        await axios.post(url + "/api/cart/add", { itemId }, { headers: { token } });
      } catch {
        // cart sync failed silently — local state already updated
      }
    }
  };

  const removeFromCart = async (key) => {
    setCartItems((prev) => {
      const entry = prev[key];
      if (!entry) return prev;
      if (entry.quantity <= 1) {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      }
      return { ...prev, [key]: { ...entry, quantity: entry.quantity - 1 } };
    });

    const itemId = key.split("::")[0];
    if (token) {
      try {
        await axios.post(url + "/api/cart/remove", { itemId }, { headers: { token } });
      } catch {
        // cart sync failed silently — local state already updated
      }
    }
  };

  // Total count of a food item across all its variations
  const getItemCount = (itemId) => {
    let count = 0;
    for (const key in cartItems) {
      if (cartItems[key].itemId === itemId) count += cartItems[key].quantity;
    }
    return count;
  };

  const getTotalCartAmount = () => {
    let total = 0;
    for (const key in cartItems) {
      const entry = cartItems[key];
      if (entry.quantity > 0) {
        const food = food_list.find((f) => f._id === entry.itemId);
        if (food) total += (food.price + (entry.extraPrice || 0)) * entry.quantity;
      }
    }
    return total;
  };

  const [foodListError, setFoodListError] = useState(false);

  const fetchFoodList = async () => {
    try {
      setFoodListError(false);
      const response = await axios.get(url + "/api/food/list/public");
      if (response.data?.data) {
        setFoodList(response.data.data);
        // Cache for cart fallback
        try { localStorage.setItem("crave_food_cache", JSON.stringify(response.data.data)); localStorage.setItem("crave_food_cache_v", "2"); } catch {}
      } else {
        setFoodListError(true);
        toast.error("Failed to load menu. Please refresh the page.");
        // Try cache
        try {
          const cacheOk = localStorage.getItem("crave_food_cache_v") === "2";
          const cached = cacheOk ? JSON.parse(localStorage.getItem("crave_food_cache") || "null") : null;
          if (cached?.length) { setFoodList(cached); setFoodListError(false); }
        } catch {}
      }
    } catch {
      setFoodListError(true);
      // Try cache on network failure
      try {
        const cacheOk2 = localStorage.getItem("crave_food_cache_v") === "2";
        const cached = cacheOk2 ? JSON.parse(localStorage.getItem("crave_food_cache") || "null") : null;
        if (cached?.length) {
          setFoodList(cached);
          setFoodListError(false);
          toast.warn("Using cached menu data.", { toastId: "food-cache-warn" });
        } else {
          toast.error("Could not reach server. Please check your connection.", { toastId: "food-fetch-err" });
        }
      } catch {
        toast.error("Could not reach server. Please check your connection.", { toastId: "food-fetch-err" });
      }
    } finally {
      setFoodListLoading(false);
    }
  };

  // ✅ mergeWithCurrent=true keeps guest cart items when logging in
  const loadCartData = async (token, mergeWithCurrent = false) => {
    let response;
    try {
      response = await axios.post(url + "/api/cart/get", {}, { headers: { token } });
    } catch {
      // Cart sync failed — keep local cart as-is
      return;
    }
    const raw = response.data.cartData || {};
    const converted = {};
    for (const itemId in raw) {
      if (raw[itemId] > 0) {
        converted[itemId] = { itemId, quantity: raw[itemId], selections: {}, extraPrice: 0 };
      }
    }
    if (mergeWithCurrent) {
      // Guest cart takes priority, server cart fills in anything missing
      setCartItems((prev) => ({ ...converted, ...prev }));
    } else {
      setCartItems(converted);
    }
  };

  useEffect(() => {
    async function loadData() {
      await fetchFoodList();
      const savedToken = localStorage.getItem("token");
      if (savedToken) {
        setToken(savedToken);
        await loadCartData(savedToken);
      }
    }
    loadData();

    // Refresh food list every 60s so menu changes appear without reload
    const foodPoll = setInterval(() => fetchFoodList(), 60000);
    return () => clearInterval(foodPoll);
  }, []);

  const contextValue = {
    url, food_list, foodListLoading, foodListError,
    cartItems, addToCart, removeFromCart,
    getTotalCartAmount, getItemCount, buildCartKey,
    token, setToken, loadCartData, setCartItems,
    currency, deliveryCharge,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreContextProvider;