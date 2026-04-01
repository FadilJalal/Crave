const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

/** Map any casing (Monday / MONDAY) to our schema keys */
function normalizeOpeningHours(hours) {
  if (!hours || typeof hours !== "object") return null;
  const out = {};
  for (const [k, v] of Object.entries(hours)) {
    const key = String(k).toLowerCase();
    if (DAYS.includes(key)) out[key] = v;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Merge embedded populate from /food with canonical /restaurant/list (hours + isActive stay in sync).
 * Handles restaurantId as populated doc, raw ObjectId, or id string.
 */
export function mergeRestaurantFromDirectory(food, restaurantsById) {
  if (!food) return null;
  const embedded = food.restaurantId;
  let rid = null;
  if (embedded != null && typeof embedded === "object" && !Array.isArray(embedded)) {
    rid = embedded._id ?? null;
  } else if (embedded != null) {
    rid = embedded;
  }
  const ridStr = rid != null ? String(rid) : null;
  const fromList = ridStr && restaurantsById ? restaurantsById[ridStr] : null;

  if (fromList) {
    if (embedded != null && typeof embedded === "object" && !Array.isArray(embedded)) {
      return { ...embedded, ...fromList };
    }
    return fromList;
  }
  if (embedded != null && typeof embedded === "object" && !Array.isArray(embedded)) {
    return embedded;
  }
  return null;
}

function getDubaiNowParts() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const weekday = (parts.find((p) => p.type === "weekday")?.value || "monday").toLowerCase();
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  return { weekday, mins: hour * 60 + minute };
}

function parseTimeToMins(t) {
  if (!t || typeof t !== "string" || !t.includes(":")) return null;
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function to12h(mins) {
  const hh = Math.floor(mins / 60) % 24;
  const mm = mins % 60;
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

function weekdayLabel(dayKey) {
  return dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
}

/**
 * Returns true if a restaurant is currently open.
 * Handles overnight spans (e.g. 09:00 → 03:00 next day).
 */
export function isRestaurantOpen(r) {
  // No restaurant doc ⇒ do not treat as open (blocks ordering when data is broken).
  if (!r || typeof r !== "object") return false;
  if (r.isActive === false) return false;
  const hours =
    normalizeOpeningHours(r.openingHours) ||
    (r.openingHours && typeof r.openingHours === "object" ? r.openingHours : null);
  if (!hours || typeof hours !== "object") return true;

  const { weekday, mins } = getDubaiNowParts();
  const todayIdx = Math.max(0, DAYS.indexOf(weekday));
  const todayKey = DAYS[todayIdx];
  const prevKey = DAYS[(todayIdx + 6) % 7];
  const h = hours[todayKey];

  // 24/7
  if (h && !h.closed && h.open === "00:00" && h.close === "23:59") return true;

  // Check today's configured window first.
  if (h && !h.closed) {
    const openMins = parseTimeToMins(h.open);
    const closeMins = parseTimeToMins(h.close);
    if (openMins !== null && closeMins !== null) {
      if (closeMins <= openMins) {
        // Overnight window that starts today (e.g. 18:00 -> 02:00).
        if (mins >= openMins) return true;
      } else if (mins >= openMins && mins < closeMins) {
        return true;
      }
    }
  }

  // Check if we are in yesterday's overnight spillover (after midnight).
  const prev = hours[prevKey];
  if (prev && !prev.closed) {
    const prevOpen = parseTimeToMins(prev.open);
    const prevClose = parseTimeToMins(prev.close);
    if (prevOpen !== null && prevClose !== null && prevClose <= prevOpen) {
      if (mins < prevClose) return true;
    }
  }

  return false;
}

/**
 * Returns a human-readable string of when the restaurant opens next.
 * e.g. "Opens today at 9:00 AM" or "Opens Monday at 9:00 AM"
 */
export function nextOpeningTime(r) {
  if (!r || typeof r !== "object") return null;
  if (r.isActive === false) return null;
  const oh =
    normalizeOpeningHours(r.openingHours) ||
    (r.openingHours && typeof r.openingHours === "object" ? r.openingHours : null);
  if (!oh || typeof oh !== "object") return null;

  const { weekday, mins } = getDubaiNowParts();
  const todayIdx = Math.max(0, DAYS.indexOf(weekday));

  // First pass: include "later today" if closed right now.
  for (let offset = 0; offset <= 7; offset++) {
    const idx = (todayIdx + offset) % 7;
    const day = DAYS[idx];
    const h = oh[day];
    if (!h || h.closed) continue;
    if (h.open === "00:00" && h.close === "23:59") return null;

    const openMins = parseTimeToMins(h.open);
    if (openMins === null) continue;

    if (offset === 0) {
      // Later today only (if open time already passed, next opening is another day).
      if (openMins > mins) return `Opens today at ${to12h(openMins)}`;
      continue;
    }

    if (offset === 1) return `Opens tomorrow at ${to12h(openMins)}`;
    return `Opens ${weekdayLabel(day)} at ${to12h(openMins)}`;
  }
  return null;
}