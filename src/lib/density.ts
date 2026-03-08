/**
 * Static ingredient density lookup table for Weight ↔ Volume conversions.
 * Values are grams per cup (ml basis: 1 cup = 236.588 ml).
 *
 * Sources: USDA data, standard baking references.
 * ~100 common baking and cooking ingredients.
 */

/** Grams per cup for each ingredient */
const DENSITY_G_PER_CUP: Record<string, number> = {
  // --- Flours & Starches ---
  "all-purpose flour": 120,
  "all purpose flour": 120,
  "flour": 120,
  "bread flour": 127,
  "cake flour": 100,
  "whole wheat flour": 128,
  "whole-wheat flour": 128,
  "rye flour": 102,
  "almond flour": 96,
  "almond meal": 96,
  "coconut flour": 112,
  "oat flour": 92,
  "rice flour": 158,
  "cornstarch": 128,
  "corn starch": 128,
  "arrowroot": 128,
  "arrowroot starch": 128,
  "potato starch": 160,
  "tapioca starch": 152,
  "semolina": 167,

  // --- Sugars ---
  "granulated sugar": 200,
  "white sugar": 200,
  "sugar": 200,
  "brown sugar": 213,
  "dark brown sugar": 213,
  "light brown sugar": 200,
  "powdered sugar": 120,
  "confectioners sugar": 120,
  "icing sugar": 120,
  "caster sugar": 200,
  "raw sugar": 200,
  "turbinado sugar": 200,
  "coconut sugar": 180,

  // --- Oats & Grains ---
  "rolled oats": 90,
  "oats": 90,
  "quick oats": 90,
  "steel-cut oats": 160,
  "cornmeal": 138,
  "polenta": 160,
  "breadcrumbs": 108,
  "panko breadcrumbs": 60,
  "panko": 60,
  "rice": 195,
  "white rice": 195,
  "brown rice": 195,
  "quinoa": 170,
  "couscous": 160,

  // --- Fats & Oils ---
  "butter": 227,
  "unsalted butter": 227,
  "salted butter": 227,
  "oil": 218,
  "vegetable oil": 218,
  "olive oil": 216,
  "canola oil": 218,
  "coconut oil": 218,
  "shortening": 191,

  // --- Dairy ---
  "milk": 245,
  "whole milk": 245,
  "skim milk": 245,
  "buttermilk": 245,
  "heavy cream": 238,
  "heavy whipping cream": 238,
  "whipping cream": 238,
  "half and half": 242,
  "sour cream": 230,
  "yogurt": 245,
  "greek yogurt": 245,
  "cream cheese": 230,
  "ricotta": 246,
  "cottage cheese": 225,

  // --- Nuts & Seeds ---
  "almonds": 143,
  "sliced almonds": 92,
  "slivered almonds": 108,
  "almond butter": 258,
  "peanuts": 146,
  "peanut butter": 258,
  "cashews": 130,
  "walnuts": 100,
  "pecans": 99,
  "pine nuts": 135,
  "sesame seeds": 144,
  "chia seeds": 160,
  "flax seeds": 168,
  "sunflower seeds": 135,
  "pumpkin seeds": 130,

  // --- Dried Fruits ---
  "raisins": 165,
  "dried cranberries": 140,
  "dates": 178,
  "apricots": 152,
  "dried apricots": 152,

  // --- Chocolate & Cocoa ---
  "cocoa powder": 85,
  "unsweetened cocoa powder": 85,
  "chocolate chips": 168,
  "semisweet chocolate chips": 168,

  // --- Spices & Leaveners (small measures) ---
  "salt": 273,
  "baking soda": 230,
  "baking powder": 192,
  "yeast": 150,
  "instant yeast": 135,
  "active dry yeast": 150,

  // --- Sweeteners & Syrups ---
  "honey": 340,
  "maple syrup": 322,
  "corn syrup": 328,
  "molasses": 340,
  "agave": 336,
  "golden syrup": 340,

  // --- Legumes ---
  "lentils": 192,
  "chickpeas": 180,
  "black beans": 172,
  "kidney beans": 177,
  "white beans": 179,

  // --- Vegetables (raw, chopped/diced approximations) ---
  "spinach": 30,
  "kale": 67,
  "cabbage": 89,
  "shredded cabbage": 89,
  "carrots": 128,
  "shredded carrots": 110,
  "onion": 160,
  "diced onion": 160,
  "celery": 100,
  "bell pepper": 150,
  "tomato": 180,

  // --- Fruits ---
  "blueberries": 148,
  "strawberries": 152,
  "raspberries": 123,
  "blackberries": 144,
  "cherries": 154,
};

/**
 * Look up density (grams per cup) for a given ingredient name.
 * Tries exact match, then fuzzy match by checking if the lookup key
 * is contained in the ingredient name or vice versa.
 *
 * @returns grams per cup, or null if not found
 */
export function getDensityGPerCup(ingredientName: string): number | null {
  const normalized = ingredientName.toLowerCase().trim();

  // Exact match
  if (normalized in DENSITY_G_PER_CUP) {
    return DENSITY_G_PER_CUP[normalized];
  }

  // Fuzzy: find a key that the ingredient name contains
  for (const [key, density] of Object.entries(DENSITY_G_PER_CUP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return density;
    }
  }

  return null;
}

/**
 * Convert a volume (in ml) to grams for a given ingredient.
 * Returns null if the ingredient is not in the density table.
 */
export function volumeToGrams(ml: number, ingredientName: string): number | null {
  const gPerCup = getDensityGPerCup(ingredientName);
  if (gPerCup === null) return null;
  // 1 cup = 236.588 ml
  return (ml / 236.588) * gPerCup;
}

/**
 * Convert grams to volume (ml) for a given ingredient.
 * Returns null if the ingredient is not in the density table.
 */
export function gramsToVolume(g: number, ingredientName: string): number | null {
  const gPerCup = getDensityGPerCup(ingredientName);
  if (gPerCup === null) return null;
  return (g / gPerCup) * 236.588;
}
