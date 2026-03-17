import express from 'express';
const router = express.Router();

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const HEADERS   = { 'Accept-Language': 'en', 'User-Agent': 'CraveApp/1.0 (contact@crave.ae)' };

function isInUAE(lat, lon) {
  return lat >= 22 && lat <= 26.5 && lon >= 51 && lon <= 56.5;
}

function normalizeArea(area) {
  if (!area) return [];
  const a = area.trim();
  const map = {
    majaz:      ['Al Majaz', 'Majaz'],
    mujarrah:   ['Al Mujarrah', 'Mujarrah'],
    khalidiyah: ['Al Khalidiyah', 'Khalidiyah'],
    nahda:      ['Al Nahda', 'Nahda'],
    qasimia:    ['Al Qasimia', 'Qasimia'],
    taawun:     ['Al Taawun', 'Taawun'],
    mamzar:     ['Al Mamzar', 'Mamzar'],
    rolla:      ['Rolla', 'Al Rolla'],
    butina:     ['Al Butina', 'Butina'],
    yarmuk:     ['Al Yarmuk', 'Yarmuk'],
    khan:       ['Al Khan', 'Khan'],
    ghuwair:    ['Al Ghuwair', 'Ghuwair'],
  };
  const lower = a.toLowerCase().replace(/^al[\s-]/, '');
  for (const [key, vals] of Object.entries(map)) {
    if (lower.includes(key) || key.includes(lower)) return [...new Set([a, ...vals])];
  }
  return [a];
}

async function tryFetch(url) {
  try {
    const res  = await fetch(url, { headers: HEADERS });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      if (isInUAE(lat, lon)) return { lat, lon };
    }
  } catch (_) {}
  return null;
}

router.post('/', async (req, res) => {
  const { address } = req.body;
  if (!address) return res.json({ success: false, message: 'No address provided' });

  const city    = address.city || address.state || '';
  const area    = address.area || '';
  const street  = address.street || '';
  const building= address.building || '';
  const areaVariants = normalizeArea(area);

  // Try variants in order, stop at first UAE result
  for (const av of areaVariants) {
    // Structured query
    const p = new URLSearchParams({ format: 'json', limit: '1', countrycodes: 'ae' });
    const sp = [building, street, av].filter(Boolean).join(' ');
    if (sp)   p.set('street', sp);
    if (city) p.set('city', city);
    p.set('country', 'United Arab Emirates');

    let result = await tryFetch(`${NOMINATIM}?${p}`);
    if (result) return res.json({ success: true, ...result });

    // Free-text query
    result = await tryFetch(`${NOMINATIM}?q=${encodeURIComponent(`${av}, ${city}, UAE`)}&format=json&limit=1&countrycodes=ae`);
    if (result) return res.json({ success: true, ...result });
  }

  // Street + city fallback
  if (street && city) {
    const result = await tryFetch(`${NOMINATIM}?q=${encodeURIComponent(`${street}, ${city}, UAE`)}&format=json&limit=1&countrycodes=ae`);
    if (result) return res.json({ success: true, ...result });
  }

  // City-only last resort
  if (city) {
    const result = await tryFetch(`${NOMINATIM}?q=${encodeURIComponent(`${city}, UAE`)}&format=json&limit=1&countrycodes=ae`);
    if (result) return res.json({ success: true, ...result });
  }

  res.json({ success: false, message: 'Could not geocode address' });
});

export default router;