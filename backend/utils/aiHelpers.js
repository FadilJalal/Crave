// Shared AI helper functions — no external APIs needed

const POS_WORDS = new Set([
  "good","great","excellent","amazing","awesome","fantastic","perfect","delicious",
  "tasty","yummy","fresh","fast","quick","friendly","polite","best","wonderful",
  "love","loved","recommend","outstanding","superb","incredible","satisfied","happy",
  "nice","beautiful","clean","hot","warm","generous","huge","crispy","juicy","tender",
  "flavorful","savory","rich","creamy","smooth","well","better","impressive","enjoy",
  "enjoyed","worth","favourite","favorite","top","reliable","consistent","prompt",
]);

const NEG_WORDS = new Set([
  "bad","terrible","awful","horrible","worst","disgusting","cold","stale","slow",
  "late","rude","dirty","expensive","overpriced","small","tiny","bland","tasteless",
  "dry","raw","undercooked","overcooked","burnt","soggy","disappointing","disappointed",
  "poor","mediocre","average","wrong","missing","never","waste","hard","tough","oily",
  "greasy","salty","bitter","sour","gross","nasty","unhappy","angry","annoyed",
  "complaint","complain","refund","inedible","pathetic","unacceptable","lukewarm",
]);

const INTENSIFIERS = new Set(["very","really","extremely","super","absolutely","totally","so","incredibly"]);
const NEGATORS = new Set(["not","no","never","don't","dont","didn't","didnt","wasn't","wasnt","isn't","isnt","hardly"]);

export function analyzeSentiment(text) {
  if (!text) return { score: 0, label: "neutral", positive: [], negative: [] };
  const words = text.toLowerCase().replace(/[^a-z\s']/g, " ").split(/\s+/).filter(Boolean);
  let score = 0;
  const pos = [], neg = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i], prev = words[i - 1] || "", pp = words[i - 2] || "";
    const negated = NEGATORS.has(prev) || NEGATORS.has(pp);
    const mult = INTENSIFIERS.has(prev) ? 1.5 : 1;
    if (POS_WORDS.has(w)) {
      if (negated) { score -= mult; neg.push(w); } else { score += mult; pos.push(w); }
    } else if (NEG_WORDS.has(w)) {
      if (negated) { score += 0.5 * mult; pos.push(w); } else { score -= mult; neg.push(w); }
    }
  }
  const label = score > 0.5 ? "positive" : score < -0.5 ? "negative" : "neutral";
  return { score: Math.round(score * 100) / 100, label, positive: [...new Set(pos)], negative: [...new Set(neg)] };
}

const DIETARY_RULES = {
  vegan:      { m: /vegan|plant.?based|tofu|falafel|hummus|lentil|chickpea/i, x: /chicken|beef|lamb|meat|fish|shrimp|egg|cheese|cream|butter|milk|honey/i },
  vegetarian: { m: /veg|vegetarian|paneer|cheese|mushroom|spinach|potato|corn|beans|falafel/i, x: /chicken|beef|lamb|meat|fish|shrimp|pepperoni|bacon|ham|sausage/i },
  glutenFree: { m: /gluten.?free|rice|salad|grilled|bowl/i, x: /bread|bun|wrap|tortilla|pasta|noodle|pizza|flour|naan|cake|pastry/i },
  keto:       { m: /keto|grilled|steak|wings|kebab|salad|egg/i, x: /rice|bread|pasta|noodle|potato|fries|pizza|tortilla|sugar|cake|sweet/i },
};

export function getDietaryTags(name, desc, category) {
  const t = `${name} ${desc} ${category}`.toLowerCase();
  const tags = [];
  for (const [diet, { m, x }] of Object.entries(DIETARY_RULES)) {
    if (m.test(t) && !x.test(t)) tags.push(diet);
  }
  if (/spicy|chilli|chili|pepper|jalapeño|sriracha|buffalo|masala|vindaloo/i.test(t)) tags.push("spicy");
  if (/grilled|baked|steamed|fresh|salad|light|lean/i.test(t)) tags.push("healthy");
  return tags;
}

const CAL_MAP = {
  salad:[120,280],sandwich:[300,500],burger:[450,750],pizza:[250,400],pasta:[350,600],
  rice:[300,500],biryani:[450,700],wrap:[300,480],soup:[100,250],grilled:[250,450],
  fried:[350,600],fries:[250,400],steak:[400,650],chicken:[250,500],fish:[200,400],
  cake:[300,500],dessert:[250,450],ice:[200,350],smoothie:[150,300],juice:[80,180],
  wings:[350,550],nuggets:[300,500],kebab:[300,500],shawarma:[400,600],tikka:[300,500],
  noodles:[350,550],sushi:[200,400],bowl:[350,550],platter:[500,900],meal:[500,800],
};

export function estimateCalories(name, desc, category, price) {
  const t = `${name} ${desc} ${category}`.toLowerCase();
  let min = 200, max = 500;
  for (const [k, [lo, hi]] of Object.entries(CAL_MAP)) {
    if (t.includes(k)) { min = lo; max = hi; break; }
  }
  if (price > 50) { min = Math.round(min * 1.3); max = Math.round(max * 1.3); }
  else if (price < 15) { min = Math.round(min * 0.7); max = Math.round(max * 0.7); }
  return { min, max, label: `${min}-${max} kcal` };
}

export const MOOD_MAP = {
  celebrating: { categories:["dessert","pizza","premium","special"], keywords:/premium|special|large|family|feast|party|platter|cake/i, emoji:"🎉", label:"Celebration" },
  comfort:     { categories:["burger","pasta","soup"], keywords:/cheese|cream|butter|noodle|soup|warm|bowl|comfort/i, emoji:"🛋️", label:"Comfort" },
  healthy:     { categories:["salad","vegan","grilled"], keywords:/salad|grilled|fresh|light|lean|steamed|green|protein|vegan/i, emoji:"🥗", label:"Healthy" },
  adventurous: { categories:["spicy","bbq","sushi"], keywords:/spicy|hot|exotic|special|fusion|masala|bbq|sushi|wasabi/i, emoji:"🌶️", label:"Adventurous" },
  quick:       { categories:["sandwich","wrap","fast food"], keywords:/quick|fast|wrap|roll|sandwich|snack|bite|mini|fast/i, emoji:"⚡", label:"Quick" },
  sweet:       { categories:["dessert","cake","ice cream"], keywords:/cake|sweet|chocolate|ice|dessert|brownie|cookie|cream/i, emoji:"🍰", label:"Sweet" },
  budget:      { categories:["sandwich","wrap","snacks"], keywords:/value|budget|deal|combo|mini|small|cheap/i, emoji:"💰", label:"Budget" },
  postworkout: { categories:["grilled","high protein","salad"], keywords:/protein|grilled|chicken|egg|lean|steak|fish|bowl|post/i, emoji:"💪", label:"Gym" },
};
