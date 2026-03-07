// frontend/src/Context/StoreContext.jsx
import { createContext, useEffect, useState } from "react";
import { menu_list } from "../assets/assets";
import axios from "axios";
import { toast } from "react-toastify";
export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  const url = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
  const [food_list, setFoodList] = useState([]);
  const [foodListLoading, setFoodListLoading] = useState(true);
  const [token, setToken] = useState("");
  const currency = "AED ";
  const deliveryCharge = 5;

  // cartItems: { cartKey -> { itemId, quantity, selections, extraPrice } }
  // cartKey = "itemId" for plain items, "itemId::Size:Large|Drink:Pepsi" for customized
  const [cartItems, setCartItems] = useState({});

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
        try { localStorage.setItem("crave_food_cache", JSON.stringify(response.data.data)); } catch {}
      } else {
        setFoodListError(true);
        toast.error("Failed to load menu. Please refresh the page.");
        // Try cache
        try {
          const cached = JSON.parse(localStorage.getItem("crave_food_cache") || "null");
          if (cached?.length) { setFoodList(cached); setFoodListError(false); }
        } catch {}
      }
    } catch {
      setFoodListError(true);
      // Try cache on network failure
      try {
        const cached = JSON.parse(localStorage.getItem("crave_food_cache") || "null");
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
  }, []);

  const contextValue = {
    url, food_list, menu_list, foodListLoading, foodListError,
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