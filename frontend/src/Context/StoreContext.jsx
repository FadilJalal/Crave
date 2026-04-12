// frontend/src/Context/StoreContext.jsx
import { createContext, useEffect, useState, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { mergeRestaurantFromDirectory, isRestaurantOpen } from "../utils/restaurantHours.js";
export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  const url = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
  const [food_list, setFoodList] = useState([]);
  const [foodListLoading, setFoodListLoading] = useState(true);
  /** Canonical restaurant docs keyed by id — keeps menu cards in sync with /restaurant/list */
  const [restaurantsById, setRestaurantsById] = useState({});
  const [token, setToken] = useState("");
  const currency = "AED ";
  // cartItems: { cartKey -> { itemId, quantity, selections, extraPrice } }
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('crave_cart');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

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
    const merged = mergeRestaurantFromDirectory(food, restaurantsById);
    // Debug log for troubleshooting restaurant open status
    console.log('[addToCart] merged restaurant:', merged);
    if (!merged) {
      console.warn('[addToCart] No restaurant data found for item', itemId, '— allowing add to cart as fallback.');
    } else if (!isRestaurantOpen(merged)) {
      toast.error("This restaurant is not accepting orders right now.");
      return;
    }
    const extraPrice = calcExtraPrice(food, selections);
    const key = buildCartKey(itemId, selections);

    setCartItems((prev) => {
      const updated = {
        ...prev,
        [key]: {
          itemId,
          quantity: (prev[key]?.quantity || 0) + 1,
          selections,
          extraPrice,
        },
      };
      // Persist to localStorage for guests
      try { localStorage.setItem('crave_cart', JSON.stringify(updated)); } catch {}
      return updated;
    });

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
      let updated;
      if (entry.quantity <= 1) {
        updated = { ...prev };
        delete updated[key];
      } else {
        updated = { ...prev, [key]: { ...entry, quantity: entry.quantity - 1 } };
      }
      // Persist to localStorage for guests
      try { localStorage.setItem('crave_cart', JSON.stringify(updated)); } catch {}
      return updated;
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
    const now = Date.now();
    for (const key in cartItems) {
      const entry = cartItems[key];
      if (entry.quantity > 0) {
        const food = food_list.find((f) => f._id === entry.itemId);
        if (food) {
          // Use salePrice if Flash Deal is active (support bool or string "true")
          const isFlash = food.isFlashDeal === true || food.isFlashDeal === "true" || food.isFlashDeal === 1 || (food.category && /flash/i.test(food.category));
          // Bug 2 Fix: If no expiry is set, it's always valid. If set, check against current time.
          const isNotExpired = !food.flashDealExpiresAt || (new Date(food.flashDealExpiresAt).getTime() + 3600000) > now;
          const isFlashDealActive = isFlash && food.salePrice && isNotExpired;
          
          const effectivePrice = isFlashDealActive ? food.salePrice : food.price;
          total += (effectivePrice + (entry.extraPrice || 0)) * entry.quantity;
        }
      }
    }
    return total;
  };

  const [foodListError, setFoodListError] = useState(false);

  const fetchRestaurants = async () => {
    try {
      const response = await axios.get(`${url}/api/restaurant/list`);
      if (response.data?.success && Array.isArray(response.data.data)) {
        const m = {};
        response.data.data.forEach((r) => {
          m[String(r._id)] = r;
        });
        setRestaurantsById(m);
      }
    } catch {
      /* keep previous map */
    }
  };

  const fetchFoodList = async () => {
    try {
      setFoodListError(false);
      const response = await axios.get(url + "/api/food/list/public", {
        params: { t: Date.now() },
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (response.data?.data) {
        setFoodList(response.data.data);
        try {
          localStorage.setItem("crave_food_cache", JSON.stringify(response.data.data));
          localStorage.setItem("crave_food_cache_v", "11");
        } catch {}
      } else {
        setFoodListError(true);
        toast.error("Failed to load menu. Please refresh the page.");
        // Try cache
        try {
          const cacheOk = localStorage.getItem("crave_food_cache_v") === "11";
          const cached = cacheOk ? JSON.parse(localStorage.getItem("crave_food_cache") || "null") : null;
          if (cached?.length) {
            setFoodList(cached);
            setFoodListError(false);
          }
        } catch {}
      }
    } catch {
      setFoodListError(true);
      console.error(`[FETCH ERROR] Failed to fetch food list`);
      // Try cache on network failure
      try {
        const cacheOk2 = localStorage.getItem("crave_food_cache_v") === "11";
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
      await Promise.all([fetchFoodList(), fetchRestaurants()]);
      const savedToken = localStorage.getItem("token");
      if (savedToken) {
        setToken(savedToken);
        await loadCartData(savedToken);
      } else {
        // For guests, load cart from localStorage
        try {
          const savedCart = localStorage.getItem('crave_cart');
          if (savedCart) setCartItems(JSON.parse(savedCart));
        } catch {}
      }
    }
    loadData();

    // Refresh food + restaurants so open/closed stays accurate
    const foodPoll = setInterval(() => {
      fetchFoodList();
      fetchRestaurants();
    }, 15000); // Increased frequency to 15 seconds for faster stock updates
    return () => clearInterval(foodPoll);
  }, []);


  // ── Favourites Management ──────────────────────────────────────────
  const [favourites, setFavourites] = useState(() => {
    try {
      const fav = localStorage.getItem('crave_favourites');
      return fav ? JSON.parse(fav) : [];
    } catch {
      return [];
    }
  });

  const isFavourite = (itemId) => favourites.some(f => f._id === itemId);

  const addFavourite = (food) => {
    setFavourites(prev => {
      if (prev.some(f => f._id === food._id)) return prev;
      const updated = [...prev, food];
      localStorage.setItem('crave_favourites', JSON.stringify(updated));
      return updated;
    });
  };

  const removeFavourite = (itemId) => {
    setFavourites(prev => {
      const updated = prev.filter(f => f._id !== itemId);
      localStorage.setItem('crave_favourites', JSON.stringify(updated));
      return updated;
    });
  };

  // ── Address Management ─────────────────────────────────────────────
  const [addresses, setAddresses] = useState([]);
  const [defaultAddress, setDefaultAddress] = useState(null);

  const fetchAddresses = async () => {
    if (!token) return;
    try {
      const res = await axios.get(url + "/api/user/addresses", { headers: { token } });
      if (res.data.success) {
        setAddresses(res.data.addresses);
        const def = res.data.addresses.find(a => a.isDefault) || res.data.addresses[0] || null;
        setDefaultAddress(def);
      }
    } catch {}
  };

  const addAddress = async (address) => {
    if (!token) return;
    try {
      const res = await axios.post(url + "/api/user/addresses", { address }, { headers: { token } });
      if (res.data.success) {
        setAddresses(res.data.addresses);
        const def = res.data.addresses.find(a => a.isDefault) || res.data.addresses[0] || null;
        setDefaultAddress(def);
        toast.success("Address added");
      } else {
        toast.error(res.data.message || "Failed to add address");
      }
    } catch { toast.error("Failed to add address"); }
  };

  const deleteAddress = async (addressIndex) => {
    if (!token) return;
    try {
      const res = await axios.delete(url + "/api/user/addresses", { data: { addressIndex }, headers: { token } });
      if (res.data.success) {
        setAddresses(res.data.addresses);
        const def = res.data.addresses.find(a => a.isDefault) || res.data.addresses[0] || null;
        setDefaultAddress(def);
        toast.success("Address deleted");
      } else {
        toast.error(res.data.message || "Failed to delete address");
      }
    } catch { toast.error("Failed to delete address"); }
  };

  const setDefaultAddressIndex = async (addressIndex) => {
    if (!token) return;
    try {
      const res = await axios.post(url + "/api/user/addresses/default", { addressIndex }, { headers: { token } });
      if (res.data.success) {
        setAddresses(res.data.addresses);
        const def = res.data.addresses.find(a => a.isDefault) || res.data.addresses[0] || null;
        setDefaultAddress(def);
        toast.success("Default address updated");
      } else {
        toast.error(res.data.message || "Failed to set default address");
      }
    } catch { toast.error("Failed to set default address"); }
  };

  // Fetch addresses on login
  useEffect(() => {
    if (token) fetchAddresses();
  }, [token]);

  // Sync navbar location with default address on login or address change
  useEffect(() => {
    if (defaultAddress && defaultAddress.city) {
      const loc = {
        label: [defaultAddress.street, defaultAddress.area, defaultAddress.city].filter(Boolean).join(', '),
        lat: defaultAddress.location?.lat || '',
        lng: defaultAddress.location?.lng || ''
      };
      localStorage.setItem('crave_location', JSON.stringify(loc));
      window.dispatchEvent(new Event('crave_location_changed'));
    }
  }, [defaultAddress]);

  const contextValue = {
    url, food_list, foodListLoading, foodListError, restaurantsById,
    cartItems, addToCart, removeFromCart,
    getTotalCartAmount, getItemCount, buildCartKey,
    token, setToken, loadCartData, setCartItems,
    currency, deliveryCharge,
    fetchFoodList, // Expose for manual refresh
    // Favourites
    favourites, isFavourite, addFavourite, removeFavourite,
    // Address management
    addresses, defaultAddress, fetchAddresses, addAddress, deleteAddress, setDefaultAddressIndex, setDefaultAddress,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreContextProvider;