const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

function getDubaiNowParts() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
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

/**
 * Returns true if a restaurant is currently open.
 * Handles overnight spans (e.g. 09:00 → 03:00 next day).
 */
export function isRestaurantOpen(r) {
  // If restaurant payload is missing/partial (e.g. stale cached food list),
  // avoid showing false "Closed" overlays.
  if (!r || typeof r !== "object") return true;
  if (r.isActive === false) return false;
  const hours = r.openingHours;
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
  if (!r?.openingHours) return null;
  const now     = new Date();
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;

  for (let offset = 1; offset <= 7; offset++) {
    const idx  = (todayIdx + offset) % 7;
    const day  = DAYS[idx];
    const h    = r.openingHours[day];
    if (!h || h.closed) continue;

    const [hh, mm] = h.open.split(":").map(Number);
    const ampm = hh >= 12 ? "PM" : "AM";
    const h12  = hh % 12 || 12;
    const time = `${h12}:${String(mm).padStart(2,"0")} ${ampm}`;

    if (offset === 1) return `Opens tomorrow at ${time}`;
    const label = day.charAt(0).toUpperCase() + day.slice(1);
    return `Opens ${label} at ${time}`;
  }
  return null;
}