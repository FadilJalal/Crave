
import Stripe from "stripe";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import restaurantModel from "../models/restaurantModel.js";
import foodModel from "../models/foodModel.js";
import { isRestaurantOpen } from "../utils/restaurantHours.js";
import { deductInventoryForOrder, restoreInventoryForCancelledOrder } from "./inventoryController.js";
import { emitToUser, emitToRestaurant } from "../utils/socketManager.js";

// ✅ FIXED: lazy-init Stripe so a missing key doesn't crash the server at startup
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set in .env");
  return new Stripe(key);
};

const currency = "aed";
const FLAT_DELIVERY = 5; // fallback if no tiers set

function calcDeliveryFee(tiers, distKm) {
  if (!tiers || tiers.length === 0) return FLAT_DELIVERY;
  // Sort tiers by upToKm (nulls last)
  const sorted = [...tiers].sort((a, b) => {
    if (a.upToKm === null) return 1;
    if (b.upToKm === null) return -1;
    return a.upToKm - b.upToKm;
  });
  for (const tier of sorted) {
    if (tier.upToKm === null || distKm <= tier.upToKm) return tier.fee;
  }
  return sorted[sorted.length - 1]?.fee ?? FLAT_DELIVERY;
}
const frontend_URL = process.env.FRONTEND_URL || "http://localhost:5174";
const SHARED_MAX_DROP_DISTANCE_KM = Number(process.env.SHARED_MAX_DROP_DISTANCE_KM ?? 5);
const SHARED_MAX_PICKUP_DISTANCE_KM = Number(process.env.SHARED_MAX_PICKUP_DISTANCE_KM ?? 5);
const SHARED_MATCH_WINDOW_MIN = Number(process.env.SHARED_MATCH_WINDOW_MIN ?? 20);
const SHARED_MIN_FEE = Number(process.env.SHARED_MIN_FEE ?? 2);
const DEBUG_RADIUS_LOGS = process.env.DEBUG_RADIUS_LOGS === "true";
const DEBUG_ORDER_LOGS = process.env.DEBUG_ORDER_LOGS === "true";

// ── Haversine distance (km) ──────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const round2 = (v) => Math.round(v * 100) / 100;

const extractAddressCoords = (address) => {
  if (!address || typeof address !== "object") return null;
  const lat = toNum(address.lat ?? address.latitude ?? address?.location?.lat ?? address?.coords?.lat);
  const lon = toNum(address.lng ?? address.lon ?? address.longitude ?? address?.location?.lng ?? address?.coords?.lng);
  if (lat === null || lon === null) return null;
  return { lat, lon };
};

const getRestaurantIdFromItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  const raw = items[0]?.restaurantId;
  if (!raw) return null;
  return raw?._id ? String(raw._id) : String(raw);
};

const applySharedFeeIfValid = (standardFee, sharedDelivery) => {
  if (!sharedDelivery?.enabled) {
    return { finalFee: round2(standardFee), isShared: false, savings: 0, matchedOrderId: null };
  }

  const requestedSharedFee = Number(sharedDelivery.sharedFee);
  if (!Number.isFinite(requestedSharedFee)) {
    return { finalFee: round2(standardFee), isShared: false, savings: 0, matchedOrderId: null };
  }

  const boundedFee = Math.max(SHARED_MIN_FEE, Math.min(round2(standardFee), round2(requestedSharedFee)));
  const savings = round2(Math.max(0, round2(standardFee) - boundedFee));

  return {
    finalFee: boundedFee,
    isShared: (savings > 0) || (!!sharedDelivery.matchedOrderId), 
    savings,
    matchedOrderId: sharedDelivery.matchedOrderId || null,
  };
};

// ── Geocode an address object (smart multi-fallback, matches frontend logic) ─
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const GEO_HEADERS = { "Accept-Language": "en", "User-Agent": "CraveApp/1.0 (contact@crave.ae)" };

function isInUAE(lat, lon) {
  return lat >= 22 && lat <= 26.5 && lon >= 51 && lon <= 56.5;
}

function normalizeArea(area) {
  if (!area) return [];
  const a = area.trim();
  const map = {
    majaz:      ["Al Majaz", "Majaz"],
    mujarrah:   ["Al Mujarrah", "Mujarrah"],
    khalidiyah: ["Al Khalidiyah", "Khalidiyah"],
    nahda:      ["Al Nahda", "Nahda"],
    qasimia:    ["Al Qasimia", "Qasimia"],
    taawun:     ["Al Taawun", "Taawun"],
    mamzar:     ["Al Mamzar", "Mamzar"],
    rolla:      ["Rolla", "Al Rolla"],
    butina:     ["Al Butina", "Butina"],
    yarmuk:     ["Al Yarmuk", "Yarmuk"],
    khan:       ["Al Khan", "Khan"],
    ghuwair:    ["Al Ghuwair", "Ghuwair"],
    barsha:     ["Al Barsha", "Barsha"],
    karama:     ["Al Karama", "Karama"],
    quoz:       ["Al Quoz", "Quoz"],
    qusais:     ["Al Qusais", "Qusais"],
    muraqqabat: ["Al Muraqqabat", "Muraqqabat"],
    rigga:      ["Al Rigga", "Rigga"],
  };
  const lower = a.toLowerCase().replace(/^al[\s-]/, "");
  for (const [key, vals] of Object.entries(map)) {
    if (lower.includes(key) || key.includes(lower)) return [...new Set([a, ...vals])];
  }
  return [a];
}

async function tryGeoFetch(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { headers: GEO_HEADERS, signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      if (isInUAE(lat, lon)) return { lat, lon };
    }
  } catch (_) {}
  return null;
}

async function geocodeAddress(address) {
  const city    = address.city || address.state || "";
  const area    = address.area || "";
  const street  = address.street || "";
  const building= address.building || "";
  const areaVariants = normalizeArea(area);

  for (const av of areaVariants) {
    // Structured query
    const p = new URLSearchParams({ format: "json", limit: "1", countrycodes: "ae" });
    const sp = [building, street, av].filter(Boolean).join(" ");
    if (sp)   p.set("street", sp);
    if (city) p.set("city", city);
    p.set("country", "United Arab Emirates");
    let result = await tryGeoFetch(`${NOMINATIM}?${p}`);
    if (result) return result;

    // Free-text fallback
    result = await tryGeoFetch(`${NOMINATIM}?q=${encodeURIComponent(`${av}, ${city}, UAE`)}&format=json&limit=1&countrycodes=ae`);
    if (result) return result;
  }

  // Street + city fallback
  if (street && city) {
    const result = await tryGeoFetch(`${NOMINATIM}?q=${encodeURIComponent(`${street}, ${city}, UAE`)}&format=json&limit=1&countrycodes=ae`);
    if (result) return result;
  }

  // City-only last resort
  if (city) {
    const result = await tryGeoFetch(`${NOMINATIM}?q=${encodeURIComponent(`${city}, UAE`)}&format=json&limit=1&countrycodes=ae`);
    if (result) return result;
  }

  return null;
}

// ── Check if address is within restaurant's delivery radius ─────────────────
async function checkDeliveryRadius(restaurantId, address) {
  const restaurant = await restaurantModel.findById(restaurantId);
  if (!restaurant) return { ok: false, message: "Restaurant not found" };

  // 0 = unlimited radius
  const radius = restaurant.deliveryRadius ?? 10;
  if (DEBUG_RADIUS_LOGS) {
    console.log(`[radius] restaurant="${restaurant.name}" radius=${radius} location=`, restaurant.location);
  }

  if (radius === 0) return { ok: true };

  if (!restaurant.location?.lat || !restaurant.location?.lng) {
    if (DEBUG_RADIUS_LOGS) {
      console.log(`[radius] no location set — blocking order to enforce safety`);
    }
    // Restaurant has no location set — block orders if radius is set
    return { ok: false, message: "This restaurant hasn't set up delivery yet. Please try again later." };
  }

  const coords = extractAddressCoords(address) || await geocodeAddress(address);
  if (DEBUG_RADIUS_LOGS) {
    console.log(`[radius] customer geocode result:`, coords);
  }

  if (!coords) {
    if (DEBUG_RADIUS_LOGS) {
      console.warn(`[radius] geocode failed for address — blocking order`);
    }
    return {
      ok: false,
      message: "We couldn't verify your delivery address. Please double-check your area and city, then try again.",
    };
  }

  const distKm = haversine(
    restaurant.location.lat, restaurant.location.lng,
    coords.lat, coords.lon
  );

  if (DEBUG_RADIUS_LOGS) {
    console.log(`[radius] distance=${distKm.toFixed(2)}km radius=${radius}km — ${distKm > radius ? 'BLOCKED' : 'allowed'}`);
  }

  if (distKm > radius) {
    return {
      ok: false,
      message: `Sorry, this restaurant only delivers within ${radius} km. Your address is ${distKm.toFixed(1)} km away.`,
      distKm: Math.round(distKm * 10) / 10,
      radius,
    };
  }

  return { ok: true, distKm: Math.round(distKm * 10) / 10 };
}

// =====================================
// PLACE ORDER (Stripe Payment)
// =====================================
const placeOrder = async (req, res) => {
  try {
    if (!req.body.items || req.body.items.length === 0) {
      return res.json({ success: false, message: "Cart is empty" });
    }

    const raw = req.body.items[0].restaurantId;
    const restaurantId = raw?._id ? String(raw._id) : String(raw);
    if (DEBUG_ORDER_LOGS) {
      console.log(`[placeOrder] restaurantId="${restaurantId}" address city="${req.body.address?.city}"`);
    }
    if (!restaurantId) {
      return res.json({ success: false, message: "restaurantId missing in items" });
    }

    const restaurantDoc = await restaurantModel
      .findById(restaurantId)
      .select("isActive openingHours deliveryTiers deliveryRadius")
      .lean();
    if (!restaurantDoc) {
      return res.json({ success: false, message: "Restaurant not found" });
    }
    if (!isRestaurantOpen(restaurantDoc)) {
      return res.json({
        success: false,
        message: "This restaurant is not accepting orders right now.",
      });
    }

    // ── Delivery radius check ──────────────────────────────────────────────
    const radiusCheck = await checkDeliveryRadius(restaurantId, req.body.address);
    if (DEBUG_ORDER_LOGS) {
      console.log(`[placeOrder] radiusCheck:`, radiusCheck);
    }
    if (!radiusCheck.ok) {
      return res.json({ success: false, message: radiusCheck.message, outOfRange: true });
    }

    const standardDeliveryFee = calcDeliveryFee(restaurantDoc?.deliveryTiers, radiusCheck.distKm ?? 0);
    const sharedDeliveryApplied = applySharedFeeIfValid(standardDeliveryFee, req.body.sharedDelivery);
    const actualDeliveryFee = sharedDeliveryApplied.finalFee;

    // ── 🛡️ SECURE PRICE VERIFICATION ───────────────────────────────────────
    // Re-verify all item prices from the database to prevent tampering and support Flash Deals.
    const foodIds = req.body.items.map(i => i._id);
    const foodDocs = await foodModel.find({ _id: { $in: foodIds } });
    const foodMap = new Map(foodDocs.map(f => [String(f._id), f]));

    let calculatedSubtotal = 0;
    const now = Date.now();
    const verifiedItems = req.body.items.map(item => {
      const dbFood = foodMap.get(String(item._id));
      if (!dbFood) throw new Error(`Food item ${item.name} no longer available`);
      
      // Bug 2 Fix: Check if flash is active. Treat missing expiry as "valid"
      const isFlashActive = dbFood.isFlashDeal && dbFood.salePrice && (!dbFood.flashDealExpiresAt || (new Date(dbFood.flashDealExpiresAt).getTime() + 3600000) > now);
      const unitPrice = isFlashActive ? dbFood.salePrice : dbFood.price;
      const totalItemPrice = unitPrice + (item.extraPrice || 0);
      calculatedSubtotal += totalItemPrice * item.quantity;
      
      return { ...item, price: unitPrice, isFlashDeal: isFlashActive }; // Bug 3: Save flash status to item
    });

    const newOrder = new orderModel({
      userId: req.body.userId,
      restaurantId,
      items: verifiedItems,
      amount: calculatedSubtotal, // Use our trusted calculation
      deliveryFee: actualDeliveryFee,
      isSharedDelivery: sharedDeliveryApplied.isShared,
      sharedMatchedOrderId: sharedDeliveryApplied.matchedOrderId,
      sharedSavings: sharedDeliveryApplied.savings,
      address: req.body.address,
      paymentMethod: "stripe",
      promoCode: req.body.promoCode || null,
      discount: req.body.discount || 0,
      deliveryPreference: req.body.deliveryPreference || "express",
      sharedRole: req.body.deliveryPreference === "shared" ? (sharedDeliveryApplied.isShared ? "matcher" : "pioneer") : null,
      distanceFromRestaurant: radiusCheck.distKm || 0,
      deliverySequence: 1, // Default to 1 (will be updated if matched and farther)
    });

    await newOrder.save();
    await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

    const line_items = verifiedItems.map((item) => ({
      price_data: {
        currency,
        product_data: { name: item.name },
        unit_amount: Math.round((item.price + (item.extraPrice || 0)) * 100),
      },
      quantity: item.quantity,
    }));

    line_items.push({
      price_data: {
        currency,
        product_data: { name: "Delivery Charge" },
        unit_amount: Math.round(actualDeliveryFee * 100),
      },
      quantity: 1,
    });

    const stripe = getStripe();
    if (req.body.paymentMethodId) {
      // --- Pay with saved card (Payment Intents API) ---
      // Always include the customer parameter to avoid Stripe errors
      const orderUser = await userModel.findById(req.body.userId);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round((req.body.amount || 0) * 100),
        currency,
        payment_method: req.body.paymentMethodId,
        customer: orderUser?.stripeCustomerId || undefined,
        confirmation_method: 'automatic',
        confirm: true,
        return_url: `${frontend_URL}/verify?success=true&orderId=${newOrder._id}`,
        metadata: { orderId: newOrder._id.toString() },
      });
      if (paymentIntent.status === 'succeeded') {
        newOrder.payment = true;
        newOrder.stripeSessionId = paymentIntent.id;
        
        // ── ⚡ Inventory Deduction (Real-time for saved card) ─────────────
        try {
          const invRes = await deductInventoryForOrder(restaurantId, verifiedItems, String(newOrder._id));
          if (invRes.success) newOrder.inventoryDeducted = true;
        } catch (invErr) {
          console.error("[placeOrder][savedCard] Inventory deduction failed:", invErr.message);
        }

        // ── 🤝 Retroactive Pioneer Discount ──────────────────────────────
        if (sharedDeliveryApplied.isShared && sharedDeliveryApplied.matchedOrderId) {
          try {
            const pioneerOrder = await orderModel.findById(sharedDeliveryApplied.matchedOrderId);
            if (pioneerOrder && !pioneerOrder.isSharedDelivery) {
              const originalFee = pioneerOrder.deliveryFee || 0;
              const pioneerSavings = round2(originalFee / 2); // Split the pioneer's original fee
              
              pioneerOrder.isSharedDelivery = true;
              pioneerOrder.sharedMatchedOrderId = newOrder._id;
              pioneerOrder.sharedRole = 'pioneer'; // Explicitly set role when matched
              pioneerOrder.sharedSavings = pioneerSavings;
              pioneerOrder.deliveryFee = originalFee / 2; // Reduce their fee in DB for records
              
              // Nearest Order First Logic
              const pioneerDist = pioneerOrder.distanceFromRestaurant || 0;
              const matcherDist = newOrder.distanceFromRestaurant || 0;
              if (matcherDist < pioneerDist) {
                 newOrder.deliverySequence = 1;
                 pioneerOrder.deliverySequence = 2;
              } else {
                 pioneerOrder.deliverySequence = 1;
                 newOrder.deliverySequence = 2;
              }

              await pioneerOrder.save();
              await newOrder.save(); // Save the sequence change to matcher too
              
              if (pioneerSavings > 0) {
                 await userModel.findByIdAndUpdate(pioneerOrder.userId, {
                    $inc: { walletBalance: pioneerSavings },
                    $push: {
                        walletHistory: { 
                          type: 'credit', 
                          amount: pioneerSavings, 
                          description: 'Shared Delivery Match — Wallet Refund' 
                        }
                    }
                 });
              }
              
              console.log(`[placeOrder] Pioneer order ${pioneerOrder._id} matched with ${newOrder._id}. Credited ${pioneerSavings} to wallet.`);
            }
          } catch (e) {
            console.error("[placeOrder] Pioneer match update failed:", e);
          }
        }

        await newOrder.save();
        emitToRestaurant(String(newOrder.restaurantId), "newOrder", {
          orderId: newOrder._id,
          items: newOrder.items,
          amount: newOrder.amount,
          address: newOrder.address,
          createdAt: newOrder.createdAt,
        });
        return res.json({ success: true, paid: true, orderId: newOrder._id });
      } else {
        return res.json({ success: false, message: 'Card payment failed', paymentIntentStatus: paymentIntent.status });
      }
    } else {
      // --- Pay with new card (Stripe Checkout) ---
      const session = await stripe.checkout.sessions.create({
        success_url: `${frontend_URL}/verify?success=true&orderId=${newOrder._id}`,
        cancel_url: `${frontend_URL}/verify?success=false&orderId=${newOrder._id}`,
        line_items,
        mode: "payment",
      });
      newOrder.stripeSessionId = session.id;
      await newOrder.save();
      return res.json({ success: true, session_url: session.url });
    }
  } catch (error) {
    console.error("[placeOrder] Error:", error.message);
    res.status(500).json({ success: false, message: error.message || "Error placing order" });
  }
};

// =====================================
// PLACE ORDER (Cash On Delivery)
// =====================================
const placeOrderCod = async (req, res) => {
  try {
    if (!req.body.items || req.body.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const raw = req.body.items[0].restaurantId;
    const restaurantId = raw?._id ? String(raw._id) : String(raw);
    if (DEBUG_ORDER_LOGS) {
      console.log(`[placeOrderCod] restaurantId="${restaurantId}" address city="${req.body.address?.city}"`);
    }
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "restaurantId missing in items" });
    }

    const restaurantDocCod = await restaurantModel
      .findById(restaurantId)
      .select("isActive openingHours deliveryTiers deliveryRadius")
      .lean();
    if (!restaurantDocCod) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }
    if (!isRestaurantOpen(restaurantDocCod)) {
      return res.status(400).json({
        success: false,
        message: "This restaurant is not accepting orders right now.",
      });
    }

    // ── Delivery radius check ──────────────────────────────────────────────
    const radiusCheck = await checkDeliveryRadius(restaurantId, req.body.address);
    if (DEBUG_ORDER_LOGS) {
      console.log(`[placeOrderCod] radiusCheck:`, radiusCheck);
    }
    if (!radiusCheck.ok) {
      return res.status(400).json({ success: false, message: radiusCheck.message, outOfRange: true });
    }

    const standardDeliveryFee = calcDeliveryFee(restaurantDocCod?.deliveryTiers, radiusCheck.distKm ?? 0);
    const sharedDeliveryApplied = applySharedFeeIfValid(standardDeliveryFee, req.body.sharedDelivery);
    const actualDeliveryFee = sharedDeliveryApplied.finalFee;

    // ── 🛡️ SECURE PRICE VERIFICATION ───────────────────────────────────────
    const foodIds = req.body.items.map(i => i._id);
    const foodDocs = await foodModel.find({ _id: { $in: foodIds } });
    const foodMap = new Map(foodDocs.map(f => [String(f._id), f]));

    let calculatedSubtotal = 0;
    const now = Date.now();
    const verifiedItems = req.body.items.map(item => {
      const dbFood = foodMap.get(String(item._id));
      if (!dbFood) throw new Error(`Food item ${item.name} no longer available`);
      
      // Bug 2 Fix: Check if flash is active. Treat missing expiry as "valid"
      const isFlashActive = dbFood.isFlashDeal && dbFood.salePrice && (!dbFood.flashDealExpiresAt || (new Date(dbFood.flashDealExpiresAt).getTime() + 3600000) > now);
      const unitPrice = isFlashActive ? dbFood.salePrice : dbFood.price;
      calculatedSubtotal += (unitPrice + (item.extraPrice || 0)) * item.quantity;
      return { ...item, price: unitPrice, isFlashDeal: isFlashActive }; // Bug 3: Save flash status
    });

    const newOrder = new orderModel({
      userId: req.body.userId,
      restaurantId,
      items: verifiedItems,
      amount: calculatedSubtotal, // Use trusted calculation
      deliveryFee: actualDeliveryFee,
      isSharedDelivery: sharedDeliveryApplied.isShared,
      sharedMatchedOrderId: sharedDeliveryApplied.matchedOrderId,
      sharedSavings: sharedDeliveryApplied.savings,
      address: req.body.address,
      payment: true,
      paymentMethod: req.body.paymentMethod || "cod",
      promoCode: req.body.promoCode || null,
      discount: req.body.discount || 0,
      splitCardTotal: req.body.splitCardTotal || 0,
      splitCashDue:   req.body.splitCashDue   || 0,
      splitCardCount: req.body.splitCardCount  || 0,
      deliveryPreference: req.body.deliveryPreference || "express",
      sharedRole: req.body.deliveryPreference === "shared" ? (sharedDeliveryApplied.isShared ? "matcher" : "pioneer") : null,
      distanceFromRestaurant: radiusCheck.distKm || 0,
      deliverySequence: 1,
    });

    await newOrder.save();
    await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

    // ── ⚡ Inventory Deduction (Real-time on Order) ──────────────────────
    try {
      const inventoryResult = await deductInventoryForOrder(restaurantId, verifiedItems, String(newOrder._id));
      if (inventoryResult.success) {
        newOrder.inventoryDeducted = true;
        await newOrder.save();
      }
    } catch (invErr) {
      console.error("[placeOrderCod] Inventory deduction failed:", invErr.message);
    }
    try {
      for (const item of verifiedItems) {
        if (item.isFlashDeal) {
          await foodModel.findByIdAndUpdate(item._id, { $inc: { flashDealClaimed: item.quantity } });
        }
      }
    } catch (e) {
      console.error("[placeOrderCod] Flash deal claiming failed:", e);
    }

    // ── 🤝 Retroactive Pioneer Discount ──────────────────────────────────
    // If this order matched with a pioneer (Customer A), update their order too
    if (sharedDeliveryApplied.isShared && sharedDeliveryApplied.matchedOrderId) {
      try {
        const pioneerOrder = await orderModel.findById(sharedDeliveryApplied.matchedOrderId);
        if (pioneerOrder && !pioneerOrder.isSharedDelivery) {
          const originalFee = pioneerOrder.deliveryFee || 0;
          const pioneerSavings = round2(originalFee / 2);
          
          pioneerOrder.isSharedDelivery = true;
          pioneerOrder.sharedMatchedOrderId = newOrder._id;
          pioneerOrder.sharedRole = 'pioneer'; 
          pioneerOrder.sharedSavings = pioneerSavings;
          pioneerOrder.deliveryFee = originalFee / 2;
          
          // Nearest Order First Logic
          const pioneerDist = pioneerOrder.distanceFromRestaurant || 0;
          const matcherDist = newOrder.distanceFromRestaurant || 0;
          if (matcherDist < pioneerDist) {
             newOrder.deliverySequence = 1;
             pioneerOrder.deliverySequence = 2;
          } else {
             pioneerOrder.deliverySequence = 1;
             newOrder.deliverySequence = 2;
          }

          await pioneerOrder.save();
          await newOrder.save();
          
          // For COD, if they haven't paid, we still credit wallet as an incentive 
          // (or they just pay the halved fee upon delivery). 
          // User redesign: "Customer A pays full and waits... Customer A gets other half credited to Crave Wallet"
          if (pioneerSavings > 0) {
              await userModel.findByIdAndUpdate(pioneerOrder.userId, {
                  $inc: { walletBalance: pioneerSavings },
                  $push: { 
                    walletHistory: { 
                      type: 'credit', 
                      amount: pioneerSavings, 
                      description: 'Shared Delivery Match — Wallet Refund' 
                    } 
                  }
              });
          }
          console.log(`[placeOrderCod] Pioneer order ${pioneerOrder._id} matched. Wallet Credited.`);
        }
      } catch (e) {
        console.error("[placeOrderCod] Pioneer matching update failed:", e);
      }
    }

    emitToRestaurant(String(newOrder.restaurantId), "newOrder", {
      orderId: newOrder._id,
      items: newOrder.items,
      amount: newOrder.amount,
      address: newOrder.address,
      createdAt: newOrder.createdAt,
    });
    res.json({ success: true, message: "Order Placed Successfully", orderId: newOrder._id });
  } catch (error) {
    console.error("[placeOrderCod] Error:", error.message);
    res.status(500).json({ success: false, message: error.message || "Error placing order" });
  }
};

// =====================================
// SHARED DELIVERY QUOTE (Double Opt-In)
// =====================================
const quoteSharedDelivery = async (req, res) => {
  try {
    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }
    if (!req.body.address) {
      return res.status(400).json({ success: false, message: "Address is required" });
    }

    const userId = req.body.userId;
    const restaurantId = getRestaurantIdFromItems(req.body.items);
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "restaurantId missing in items" });
    }

    const restaurantDoc = await restaurantModel
      .findById(restaurantId)
      .select("name location deliveryTiers deliveryRadius sharedDelivery")
      .lean();

    if (!restaurantDoc) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    const radiusCheck = await checkDeliveryRadius(restaurantId, req.body.address);
    if (!radiusCheck.ok) {
      return res.json({
        success: true,
        data: {
          eligible: false,
          reason: radiusCheck.message,
          standardFee: null,
          sharedFee: null,
          savings: 0,
        },
      });
    }

    const standardFee = round2(calcDeliveryFee(restaurantDoc.deliveryTiers, radiusCheck.distKm ?? 0));

    if (standardFee <= 0) {
      return res.json({
        success: true,
        data: {
          eligible: false,
          reason: "Delivery is already free for this order.",
          standardFee,
          sharedFee: null,
          savings: 0,
        },
      });
    }

    const sharedConfig = {
      maxDropDistanceKm: Number(restaurantDoc?.sharedDelivery?.maxDropDistanceKm ?? SHARED_MAX_DROP_DISTANCE_KM),
      maxPickupDistanceKm: Number(restaurantDoc?.sharedDelivery?.maxPickupDistanceKm ?? SHARED_MAX_PICKUP_DISTANCE_KM),
      matchWindowMin: Number(restaurantDoc?.sharedDelivery?.matchWindowMin ?? SHARED_MATCH_WINDOW_MIN),
    };

    // Try coordinates from payload first, fallback to geocoding.
    let customerCoords = extractAddressCoords(req.body.address);
    if (!customerCoords) customerCoords = await geocodeAddress(req.body.address);
    if (!customerCoords) {
      return res.json({
        success: true,
        data: {
          eligible: false,
          reason: "Could not verify delivery location for shared delivery.",
          standardFee,
          sharedFee: null,
          savings: 0,
        },
      });
    }

    // Match against orders that are currently waiting (either just placed or being prepared)
    // Both must have opted into shared delivery (deliveryPreference: "shared")
    const matchSince = new Date(Date.now() - sharedConfig.matchWindowMin * 60 * 1000);
    const candidates = await orderModel
      .find({
        restaurantId: restaurantId, // Bug 3 Fix: Match same restaurant only
        _id: { $ne: req.body.orderId || null },
        userId: { $ne: userId },
        status: { $in: ["Order Placed", "Food Processing"] }, // Redesign: Both placed and accepted can match
        deliveryPreference: "shared",
        payment: true,
        isBatched: false,
        isSharedDelivery: false,
        createdAt: { $gte: matchSince },
      })
      .select("_id restaurantId userId address deliveryFee createdAt")
      .lean();

    if (DEBUG_ORDER_LOGS) {
      console.log(`[quoteSharedDelivery] Found ${candidates.length} potential matches for restaurant ${restaurantId}`);
    }

    if (!candidates.length) {
      return res.json({
        success: true,
        data: {
          eligible: false,
          reason: "No nearby shared delivery orders found right now. You'll still save by opting in!",
          standardFee,
          sharedFee: null,
          savings: 0,
        },
      });
    }

    const restaurantIds = [...new Set(candidates.map((c) => String(c.restaurantId)).concat([String(restaurantId)]))];
    const restaurants = await restaurantModel
      .find({ _id: { $in: restaurantIds } })
      .select("_id location")
      .lean();
    const restaurantMap = new Map(restaurants.map((r) => [String(r._id), r]));

    const currentRestaurantCoords = restaurantMap.get(String(restaurantId))?.location;
    if (!currentRestaurantCoords?.lat || !currentRestaurantCoords?.lng) {
      return res.json({
        success: true,
        data: {
          eligible: false,
          reason: "Restaurant pickup location missing for shared delivery.",
          standardFee,
          sharedFee: null,
          savings: 0,
        },
      });
    }

    let best = null;

    for (const c of candidates) {
      const candidateRestaurant = restaurantMap.get(String(c.restaurantId));
      if (!candidateRestaurant?.location?.lat || !candidateRestaurant?.location?.lng) continue;

      let candidateCoords = extractAddressCoords(c.address);
      if (!candidateCoords) candidateCoords = await geocodeAddress(c.address || {});
      if (!candidateCoords) continue;

      const dropDistanceKm = haversine(
        customerCoords.lat,
        customerCoords.lon,
        candidateCoords.lat,
        candidateCoords.lon
      );
      
      const pickupDistanceKm = haversine(
        currentRestaurantCoords.lat, currentRestaurantCoords.lng,
        candidateRestaurant.location.lat, candidateRestaurant.location.lng
      );

      if (DEBUG_ORDER_LOGS) {
        console.log(`[quoteSharedDelivery] Candidate ${c._id} distances: dropDist=${dropDistanceKm.toFixed(2)}km (max: ${sharedConfig.maxDropDistanceKm}km), pickupDist=${pickupDistanceKm.toFixed(2)}km`);
      }

      if (dropDistanceKm > sharedConfig.maxDropDistanceKm) continue;
      if (pickupDistanceKm > sharedConfig.maxPickupDistanceKm) continue;

      // 50/50 split rule: Each customer pays half of their own standard fee
      const sharedFee = round2(standardFee / 2);
      const savings = round2(standardFee - sharedFee);
      if (savings <= 0) continue;

      const score = savings - (dropDistanceKm * 0.5) - (pickupDistanceKm * 0.35);
      if (!best || score > best.score) {
        best = {
          score,
          matchedOrderId: c._id,
          sharedFee,
          savings,
          dropDistanceKm: round2(dropDistanceKm),
          pickupDistanceKm: round2(pickupDistanceKm),
          etaExtraMin: Math.max(4, Math.round(dropDistanceKm * 3 + pickupDistanceKm * 2)),
        };
      }
    }

    if (!best) {
      return res.json({
        success: true,
        data: {
          eligible: false,
          reason: `No compatible route within ${sharedConfig.maxDropDistanceKm} km found. Opt in to save when a neighbor orders!`,
          standardFee,
          sharedFee: null,
          savings: 0,
        },
      });
    }

    res.json({
      success: true,
      data: {
        eligible: true,
        standardFee,
        sharedFee: best.sharedFee,
        savings: best.savings,
        matchedOrderId: best.matchedOrderId,
        constraints: {
          maxDropDistanceKm: sharedConfig.maxDropDistanceKm,
          maxPickupDistanceKm: sharedConfig.maxPickupDistanceKm,
          matchWindowMin: sharedConfig.matchWindowMin,
        },
        diagnostics: {
          dropDistanceKm: best.dropDistanceKm,
          pickupDistanceKm: best.pickupDistanceKm,
          etaExtraMin: best.etaExtraMin,
        },
      },
    });
  } catch (error) {
    console.error("[quoteSharedDelivery]", error);
    res.status(500).json({ success: false, message: "Failed to generate shared delivery quote" });
  }
};

// =====================================
// LIST ALL ORDERS (SUPER ADMIN ONLY)
// =====================================
const listOrders = async (req, res) => {
  try {
    if (req.admin?.role && req.admin.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const total = await orderModel.countDocuments({});

    const orders = await orderModel
      .find({})
      .populate("restaurantId", "name address location logo")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ 
      success: true, 
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Error fetching orders" });
  }
};

// =====================================
// USER ORDERS
// =====================================
const userOrders = async (req, res) => {
  try {
    const orders = await orderModel
      .find({ userId: req.body.userId })
      .populate("restaurantId", "name address location logo")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error fetching user orders" });
  }
};

// =====================================
// UPDATE STATUS (SUPER ADMIN ONLY)
// =====================================
const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (req.admin?.role && req.admin.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const order = await orderModel.findById(orderId);
    if (!order) return res.json({ success: false, message: "Order not found" });

    // ── Handle Inventory Restoration if status becomes Cancelled ──
    if (status === "Cancelled" && order.inventoryDeducted) {
        try {
            await restoreInventoryForCancelledOrder(order.restaurantId, order.items, String(order._id));
            order.inventoryDeducted = false;
        } catch (invErr) {
            console.error("[super/updateStatus] Inventory restoration failed:", invErr.message);
        }
    }

    order.status = status;

    // ── KDS: Track Prep Times ──
    if ((status === "Order Accepted" || status === "Food Processing") && !order.prepStartedAt) {
      order.prepStartedAt = new Date();
    }
    if ((status === "Ready" || status === "Out for Delivery" || status === "Delivered") && order.prepStartedAt && !order.prepCompletedAt) {
      order.prepCompletedAt = new Date();
    }

    await order.save();
    emitToUser(String(order.userId), "order:statusUpdate", {
      orderId: order._id,
      status: order.status,
      updatedAt: new Date(),
    });

    res.json({ success: true, message: "Status Updated" });
  } catch (error) {
    res.json({ success: false, message: "Error updating status" });
  }
};

// =====================================
// VERIFY STRIPE PAYMENT
// =====================================
const verifyOrder = async (req, res) => {
  const { orderId, success } = req.body;
  try {
    if (success === "true") {
      const order = await orderModel.findById(orderId);
      if (order && !order.payment) {
        // ── ⚡ Inventory Deduction (Real-time on Order) ──────────────────────
        if (!order.inventoryDeducted) {
          try {
            const inventoryResult = await deductInventoryForOrder(order.restaurantId, order.items, String(order._id));
            if (inventoryResult.success) {
              order.inventoryDeducted = true;
            }
          } catch (invErr) {
            console.error("[verifyOrder] Inventory deduction failed:", invErr.message);
          }
        }

        // ── ⚡ Bug 3: Increment Flash Deal Claimed Counter ────────────────────
        try {
          for (const item of order.items) {
            if (item.isFlashDeal) {
              await foodModel.findByIdAndUpdate(item._id, { $inc: { flashDealClaimed: item.quantity } });
            }
          }
        } catch (e) {
          console.error("[verifyOrder] Flash deal claiming failed:", e);
        }

        await orderModel.findByIdAndUpdate(orderId, { payment: true, inventoryDeducted: order.inventoryDeducted });
        
        // ── 🤝 Retroactive Pioneer Wallet Credit for Stripe Checkout ──────────────
        if (order.isSharedDelivery && order.sharedMatchedOrderId) {
            try {
                const pioneerOrder = await orderModel.findById(order.sharedMatchedOrderId);
                if (pioneerOrder && !pioneerOrder.isSharedDelivery) {
                    const originalFee = pioneerOrder.deliveryFee || 0;
                    const pioneerSharedFee = round2(originalFee / 2); // Split the pioneer's original fee
                    const pioneerSavings = round2(Math.max(0, originalFee - pioneerSharedFee));
                    
                    pioneerOrder.isSharedDelivery = true;
                    pioneerOrder.sharedMatchedOrderId = order._id;
                    pioneerOrder.sharedSavings = pioneerSavings;
                    pioneerOrder.deliveryFee = pioneerSharedFee;
                    await pioneerOrder.save();
                    
                    if (pioneerOrder.payment && pioneerSavings > 0) {
                         await userModel.findByIdAndUpdate(pioneerOrder.userId, {
                            $inc: { walletBalance: pioneerSavings },
                            $push: { 
                              walletHistory: { 
                                type: 'credit', 
                                amount: pioneerSavings, 
                                description: 'Shared Delivery Match — Wallet Refund' 
                              } 
                            }
                         });
                    }
                    console.log(`[verifyOrder] Pioneer order ${pioneerOrder._id} retroactively discounted. Credited ${pioneerSavings} to wallet.`);
                }
            } catch (e) {
                console.error("[verifyOrder] Pioneer retroactive update failed:", e);
            }
        }
        emitToRestaurant(String(order.restaurantId), "newOrder", {
          orderId: order._id,
          items: order.items,
          amount: order.amount,
          address: order.address,
          createdAt: order.createdAt,
        });
      }
      res.json({ success: true, message: "Payment Successful" });
    } else {
      await orderModel.findByIdAndDelete(orderId);
      res.json({ success: false, message: "Payment Failed" });
    }
  } catch (error) {
    res.json({ success: false, message: "Verification Failed" });
  }
};

// =====================================
// RESTAURANT ADMIN: LIST OWN ORDERS
// =====================================
const listRestaurantOrders = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) {
      return res.json({ success: false, message: "restaurantId missing in token" });
    }

    const orders = await orderModel
      .find({ restaurantId })
      .populate("restaurantId", "name address location logo")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error fetching restaurant orders" });
  }
};

// =====================================
// RESTAURANT ADMIN: UPDATE STATUS
// =====================================
const restaurantUpdateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const restaurantId = req.restaurantId;

    if (!restaurantId) {
      return res.json({ success: false, message: "restaurantId missing in token" });
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    if (String(order.restaurantId) !== String(restaurantId)) {
      return res.status(403).json({ success: false, message: "Not your order" });
    }

    // ── Unified Operations: Deduct inventory when accepted or started ──
    // ── Unified Operations: Deduct inventory ──
    if ((status === "Order Accepted" || status === "Food Processing") && !order.inventoryDeducted) {
      try {
        const invResult = await deductInventoryForOrder(restaurantId, order.items, String(order._id));
        if (invResult.success) order.inventoryDeducted = true;
      } catch (e) {
        console.error("[restaurantUpdateStatus] Deduction error:", e);
      }
    }

    // ── Handle Restoration ──
    if (status === "Cancelled" && order.inventoryDeducted) {
      try {
        await restoreInventoryForCancelledOrder(restaurantId, order.items, String(order._id));
        order.inventoryDeducted = false;
      } catch (e) {
        console.error("[restaurantUpdateStatus] Restoration error:", e);
      }
    }

    order.status = status;

    // ── KDS: Track Prep Times ──
    if ((status === "Order Accepted" || status === "Food Processing") && !order.prepStartedAt) {
      order.prepStartedAt = new Date();
    }
    if ((status === "Ready" || status === "Out for Delivery" || status === "Delivered") && order.prepStartedAt && !order.prepCompletedAt) {
      order.prepCompletedAt = new Date();
    }

    await order.save();
    emitToUser(String(order.userId), "order:statusUpdate", {
      orderId: order._id,
      status: order.status,
      updatedAt: new Date(),
    });

    res.json({ success: true, message: "Status Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error updating status" });
  }
};

// =====================================
// GET SINGLE ORDER BY ID (owner only)
// =====================================
const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderModel
      .findById(orderId)
      .populate("restaurantId", "name address location image");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Only the order owner can view it
    if (String(order.userId) !== String(req.body.userId)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error fetching order" });
  }
};

export {
  placeOrder,
  placeOrderCod,
  quoteSharedDelivery,
  listOrders,
  userOrders,
  updateStatus,
  verifyOrder,
  listRestaurantOrders,
  restaurantUpdateStatus,
  getOrderById,
  cancelOrder,
  calcDeliveryFee,
  applySharedFeeIfValid,
  haversine,
};

// ── CANCEL ORDER (customer) ────────────────────────────────────────────────
async function cancelOrder(req, res) {
  try {
    const { orderId } = req.body;
    const userId = req.body.userId;

    const order = await orderModel.findById(orderId);
    if (!order) return res.json({ success: false, message: "Order not found." });

    if (String(order.userId) !== String(userId))
      return res.status(403).json({ success: false, message: "Not your order." });

    if (order.status !== "Order Placed" && order.status !== "Food Processing")
      return res.json({ success: false, message: "Order cannot be cancelled — it has already advanced beyond the preparation stage." });

    const minutesElapsed = (Date.now() - new Date(order.createdAt).getTime()) / 60000;
    if (minutesElapsed > 5)
      return res.json({ success: false, message: "Cancellation window has passed. Orders can only be cancelled within 5 minutes of placing." });

    // ── Stripe refund if paid by card ──────────────────────────────────────
    let refundStatus = null;
    if (order.paymentMethod === "stripe" && order.payment && order.stripeSessionId) {
      try {
        const stripe = getStripe();
        // Get the payment intent from the session
        const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
        if (session.payment_intent) {
          await stripe.refunds.create({ payment_intent: session.payment_intent });
          refundStatus = "refunded";
          console.log(`[cancelOrder] Stripe refund issued for order ${orderId}`);
        }
      } catch (err) {
        console.error("[cancelOrder] Stripe refund failed:", err.message);
        refundStatus = "refund_failed";
      }
    }

    order.status = "Cancelled";
    await order.save();
    emitToUser(String(order.userId), "order:statusUpdate", {
      orderId: order._id,
      status: order.status,
      updatedAt: new Date(),
    });

    // ── Restore inventory for cancelled order ────────────────────────────────
    try {
      const inventoryResult = await restoreInventoryForCancelledOrder(
        order.restaurantId,
        order.items,
        order._id
      );
      
      if (!inventoryResult.success) {
        console.error("[cancelOrder] Failed to restore inventory:", inventoryResult.message);
      } else {
        console.log(`[cancelOrder] Restored inventory for order ${orderId}:`, inventoryResult.message);
      }
    } catch (invError) {
      console.error("[cancelOrder] Inventory restoration error:", invError);
    }

    const message = refundStatus === "refunded"
      ? "Order cancelled. Your refund will appear within 5-10 business days."
      : refundStatus === "refund_failed"
      ? "Order cancelled. Refund could not be processed automatically — please contact support."
      : "Order cancelled successfully.";

    res.json({ success: true, message, refundStatus });
  } catch (err) {
    console.error("[cancelOrder]", err);
    res.json({ success: false, message: "Failed to cancel order." });
  }
}