import fs from 'fs';

const enFile = './src/locales/en.json';
const arFile = './src/locales/ar.json';

const newTranslations = {
  // Favourites
  "my_favourites": { en: "My Favourites", ar: "مفضلاتي" },
  "favourites_desc": { en: "All your favourite dishes in one place.", ar: "جميع أطباقك المفضلة في مكان واحد." },
  "no_favourites_yet": { en: "No favourites yet. Tap the heart ", ar: "لا توجد مفضلات بعد. اضغط على القلب " },
  "on_any_menu_item_to_add": { en: " on any menu item to add.", ar: " على أي عنصر في القائمة للإضافة." }
};

let en = JSON.parse(fs.readFileSync(enFile, 'utf8'));
let ar = JSON.parse(fs.readFileSync(arFile, 'utf8'));

for (const [key, tr] of Object.entries(newTranslations)) {
  en[key] = tr.en;
  ar[key] = tr.ar;
}

fs.writeFileSync(enFile, JSON.stringify(en, null, 2));
fs.writeFileSync(arFile, JSON.stringify(ar, null, 2));

console.log("Translations updated!");
