// This script extracts all food items from the StoreContext food_list and generates i18n keys for names/descriptions.
// Run this in your frontend/src/scripts/ directory, then copy the output into i18n.mjs for both en and ar.

import fs from 'fs';

// Path to your StoreContext food cache (update if needed)
const foodCachePath = '../../public/crave_food_cache.json';

const foodData = JSON.parse(fs.readFileSync(foodCachePath, 'utf-8'));

const enKeys = [];
const arKeys = [];

foodData.forEach(item => {
  const id = item._id;
  // English keys
  enKeys.push(`food_${id}: "${item.name.replace(/"/g, '\"')}",`);
  enKeys.push(`desc_${id}: "${item.description.replace(/"/g, '\"')}",`);
  // Arabic keys (empty for you to fill)
  arKeys.push(`food_${id}: "",`);
  arKeys.push(`desc_${id}: "",`);
});

console.log('ENGLISH KEYS:\n' + enKeys.join('\n'));
console.log('\nARABIC KEYS (fill in):\n' + arKeys.join('\n'));
