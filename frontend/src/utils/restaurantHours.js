const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

/**
 * Returns true if a restaurant is currently open.
 * Handles overnight spans (e.g. 09:00 → 03:00 next day).
 */
export function isRestaurantOpen(r) {
  if (!r?.isActive) return false;
  const hours = r.openingHours;
  if (!hours) return r.isActive;

  const now  = new Date();
  const day  = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];
  const h    = hours[day];
  if (!h || h.closed) return false;

  // 24/7
  if (h.open === "00:00" && h.close === "23:59") return true;

  const [oh, om] = h.open.split(":").map(Number);
  const [ch, cm] = h.close.split(":").map(Number);
  const mins      = now.getHours() * 60 + now.getMinutes();
  const openMins  = oh * 60 + om;
  const closeMins = ch * 60 + cm;

  // Overnight span
  if (closeMins <= openMins) return mins >= openMins || mins < closeMins;
  return mins >= openMins && mins < closeMins;
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