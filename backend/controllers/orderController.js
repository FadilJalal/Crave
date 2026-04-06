import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import restaurantModel from "../models/restaurantModel.js";
import { isRestaurantOpen } from "../utils/restaurantHours.js";
import { deductInventoryForOrder, restoreInventoryForCancelledOrder } from "./inventoryController.js";
import Stripe from "stripe";

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
  console.log(`[radius] restaurant="${restaurant.name}" radius=${radius} location=`, restaurant.location);

  if (radius === 0) return { ok: true };

  if (!restaurant.location?.lat || !restaurant.location?.lng) {
    console.log(`[radius] no location set — blocking order to enforce safety`);
    // Restaurant has no location set — block orders if radius is set
    return { ok: false, message: "This restaurant hasn't set up delivery yet. Please try again later." };
  }

  const coords = await geocodeAddress(address);
  console.log(`[radius] customer geocode result:`, coords);

  if (!coords) {
    console.warn(`[radius] geocode failed for address — blocking order`);
    return {
      ok: false,
      message: "We couldn't verify your delivery address. Please double-check your area and city, then try again.",
    };
  }

  const distKm = haversine(
    restaurant.location.lat, restaurant.location.lng,
    coords.lat, coords.lon
  );

  console.log(`[radius] distance=${distKm.toFixed(2)}km radius=${radius}km — ${distKm > radius ? 'BLOCKED' : 'allowed'}`);

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
    console.log(`[placeOrder] restaurantId="${restaurantId}" address city="${req.body.address?.city}"`);
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
    console.log(`[placeOrder] radiusCheck:`, radiusCheck);
    if (!radiusCheck.ok) {
      return res.json({ success: false, message: radiusCheck.message, outOfRange: true });
    }

    const actualDeliveryFee = calcDeliveryFee(restaurantDoc?.deliveryTiers, radiusCheck.distKm ?? 0);

    const newOrder = new orderModel({
      userId: req.body.userId,
      restaurantId,
      items: req.body.items,
      amount: req.body.amount,
      deliveryFee: actualDeliveryFee,
      address: req.body.address,
      paymentMethod: "stripe",
      promoCode: req.body.promoCode || null,
      discount: req.body.discount || 0,
    });

    await newOrder.save();
    await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

    const line_items = req.body.items.map((item) => ({
      price_data: {
        currency,
        product_data: { name: item.name },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    }));

    line_items.push({
      price_data: {
        currency,
        product_data: { name: "Delivery Charge" },
        unit_amount: actualDeliveryFee * 100,
      },
      quantity: 1,
    });

    // ✅ Only call Stripe when actually needed — won't crash server on startup
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      success_url: `${frontend_URL}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${frontend_URL}/verify?success=false&orderId=${newOrder._id}`,
      line_items,
      mode: "payment",
    });

    // Save session ID for potential refunds
    newOrder.stripeSessionId = session.id;
    await newOrder.save();

    // ── Automatically deduct inventory for ordered items ──────────────────
    const inventoryDeduction = await deductInventoryForOrder(restaurantId, req.body.items, String(newOrder._id));
    console.log("[placeOrder] Inventory deduction result:", inventoryDeduction);
    if (!inventoryDeduction.success) {
      console.warn("[placeOrder] Inventory deduction failed but order already placed. Manual review needed.", inventoryDeduction);
    }

    res.json({ success: true, session_url: session.url });
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
    console.log(`[placeOrderCod] restaurantId="${restaurantId}" address city="${req.body.address?.city}"`);
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
    console.log(`[placeOrderCod] radiusCheck:`, radiusCheck);
    if (!radiusCheck.ok) {
      return res.status(400).json({ success: false, message: radiusCheck.message, outOfRange: true });
    }

    const actualDeliveryFee = calcDeliveryFee(restaurantDocCod?.deliveryTiers, radiusCheck.distKm ?? 0);

    const newOrder = new orderModel({
      userId: req.body.userId,
      restaurantId,
      items: req.body.items,
      amount: req.body.amount,
      deliveryFee: actualDeliveryFee,
      address: req.body.address,
      payment: true,
      paymentMethod: req.body.paymentMethod || "cod",
      promoCode: req.body.promoCode || null,
      discount: req.body.discount || 0,
      splitCardTotal: req.body.splitCardTotal || 0,
      splitCashDue:   req.body.splitCashDue   || 0,
      splitCardCount: req.body.splitCardCount  || 0,
    });

    await newOrder.save();
    await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

    // ── Automatically deduct inventory for ordered items ──────────────────
    const inventoryDeduction = await deductInventoryForOrder(restaurantId, req.body.items, String(newOrder._id));
    console.log("[placeOrderCod] Inventory deduction result:", inventoryDeduction);
    if (!inventoryDeduction.success) {
      console.warn("[placeOrderCod] Inventory deduction failed but order already placed. Manual review needed.", inventoryDeduction);
    }

    res.json({ success: true, message: "Order Placed Successfully" });
  } catch (error) {
    console.error("[placeOrderCod] Error:", error.message);
    res.status(500).json({ success: false, message: error.message || "Error placing order" });
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
    if (req.admin?.role && req.admin.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await orderModel.findByIdAndUpdate(req.body.orderId, { status: req.body.status });
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
      await orderModel.findByIdAndUpdate(orderId, { payment: true });
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

    order.status = status;
    await order.save();

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
  listOrders,
  userOrders,
  updateStatus,
  verifyOrder,
  listRestaurantOrders,
  restaurantUpdateStatus,
  getOrderById,
  cancelOrder,
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

    if (order.status !== "Food Processing")
      return res.json({ success: false, message: "Order cannot be cancelled — it is already being prepared for delivery." });

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