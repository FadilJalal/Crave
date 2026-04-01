/**
 * Keep in sync with frontend/src/utils/restaurantHours.js (order validation).
 */
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function normalizeOpeningHours(hours) {
  if (!hours || typeof hours !== "object") return null;
  const out = {};
  for (const [k, v] of Object.entries(hours)) {
    const key = String(k).toLowerCase();
    if (DAYS.includes(key)) out[key] = v;
  }
  return Object.keys(out).length ? out : null;
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

export function isRestaurantOpen(r) {
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

  if (h && !h.closed && h.open === "00:00" && h.close === "23:59") return true;

  if (h && !h.closed) {
    const openMins = parseTimeToMins(h.open);
    const closeMins = parseTimeToMins(h.close);
    if (openMins !== null && closeMins !== null) {
      if (closeMins <= openMins) {
        if (mins >= openMins) return true;
      } else if (mins >= openMins && mins < closeMins) {
        return true;
      }
    }
  }

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
