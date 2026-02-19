import * as cheerio from "cheerio";
import type { ParsedRecipe } from "@/types/recipe";

export type ScrapeResult =
  | { type: "structured"; recipe: ParsedRecipe }
  | { type: "raw"; content: string };

export async function scrapeRecipePage(url: string): Promise<ScrapeResult> {
  const abort = new AbortController();
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10000)]),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch page: ${res.status} ${res.statusText}`);
  }

  // Stream the response — abort as soon as we've found a complete JSON-LD Recipe block.
  // Most recipe sites embed JSON-LD in the <head>, so we typically only need ~30–50%
  // of the HTML before we can stop downloading.
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Quick string check before running cheerio
      if (buffer.includes("application/ld+json")) {
        const result = tryExtractStructured(buffer, url);
        if (result) {
          abort.abort();
          return result;
        }
      }

      // Cap download at 500KB — some sites (Food Network) embed JSON-LD near the end
      if (buffer.length > 500_000) {
        abort.abort();
        break;
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  return extractRawContent(buffer, url);
}

function tryExtractStructured(html: string, url: string): ScrapeResult | null {
  // Only run cheerio once the script tag is fully closed
  const tagStart = html.indexOf("application/ld+json");
  if (tagStart === -1) return null;
  const tagEnd = html.indexOf("</script>", tagStart);
  if (tagEnd === -1) return null; // tag not yet complete in stream

  const $ = cheerio.load(html);
  let recipeData: Record<string, unknown> | null = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (recipeData) return;
    try {
      const data = JSON.parse($(el).text());
      const recipes = findRecipeObjects(data);
      if (recipes.length > 0) recipeData = recipes[0] as Record<string, unknown>;
    } catch {
      // malformed JSON-LD
    }
  });

  if (!recipeData) return null;

  const mapped = mapJsonLdToRecipe(recipeData, url);
  if (mapped) return { type: "structured", recipe: mapped };

  // Mapping failed but we have JSON-LD — send as raw for AI
  return { type: "raw", content: JSON.stringify(recipeData, null, 2) };
}

function extractRawContent(html: string, url: string): ScrapeResult {
  void url;
  const $ = cheerio.load(html);

  $(
    "script, style, nav, header, footer, aside, iframe, noscript, svg, .ad, .ads, .advertisement, [role='banner'], [role='navigation'], [role='complementary']"
  ).remove();

  const selectors = [
    '[itemtype*="Recipe"]',
    ".recipe",
    "#recipe",
    '[class*="recipe"]',
    "article",
    "main",
  ];

  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length) {
      const text = cleanText(el.text());
      if (text.length > 200) return { type: "raw", content: truncateContent(text) };
    }
  }

  const bodyText = cleanText($("body").text());
  return { type: "raw", content: truncateContent(bodyText) };
}

function mapJsonLdToRecipe(
  data: Record<string, unknown>,
  sourceUrl: string
): ParsedRecipe | null {
  const title = asString(data.name);
  const ingredients = parseIngredients(data.recipeIngredient);
  const instructions = parseInstructions(data.recipeInstructions);

  // Need at least title + ingredients or instructions to be useful
  if (!title || (ingredients.length === 0 && instructions.length === 0)) {
    return null;
  }

  return {
    title,
    source: sourceUrl,
    prepTime: parseDuration(data.prepTime),
    cookTime: parseDuration(data.cookTime),
    totalTime: parseDuration(data.totalTime),
    servings: parseServings(data.recipeYield),
    ingredients,
    instructions,
    notes: asString(data.description) || "",
  };
}

function parseIngredients(
  raw: unknown
): { quantity: string; unit: string; item: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s) => typeof s === "string").map((s) => parseIngredientString(cleanText(s)));
}

function parseIngredientString(s: string): {
  quantity: string;
  unit: string;
  item: string;
} {
  // Match patterns like "2 cups flour", "1/2 tsp salt", "3 large eggs"
  const match = s.match(
    /^([\d\s/½⅓⅔¼¾⅛.,-]+)?\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|kg|ml|l|liters?|quarts?|pints?|gallons?|cloves?|stalks?|cans?|packages?|slices?|pieces?|sticks?|heads?|bunche?s?|large|medium|small|whole|pinch(?:es)?)?\s*(?:of\s+)?(.+)/i
  );

  if (match) {
    return {
      quantity: (match[1] || "").trim(),
      unit: (match[2] || "").trim(),
      item: (match[3] || s).trim(),
    };
  }

  return { quantity: "", unit: "", item: s.trim() };
}

function parseInstructions(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      if (typeof item === "string") return [cleanText(item)];
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        // HowToStep
        if (typeof obj.text === "string") return [cleanText(obj.text)];
        // HowToSection with itemListElement
        if (Array.isArray(obj.itemListElement)) {
          return obj.itemListElement
            .map((sub: unknown) => {
              if (sub && typeof sub === "object") {
                const t = (sub as Record<string, unknown>).text;
                return typeof t === "string" ? cleanText(t) : null;
              }
              return null;
            })
            .filter((t): t is string => typeof t === "string");
        }
      }
      return [];
    });
  }
  return [];
}

function parseDuration(raw: unknown): string {
  if (typeof raw !== "string") return "";
  // Full ISO 8601 duration: P0Y0M0DT0H20M0.000S or PT1H30M
  const match = raw.match(/P(?:\d+Y)?(?:\d+M)?(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:[\d.]+S)?/i);
  if (!match) return raw;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");

  if (hours && minutes) return `${hours} hr ${minutes} min`;
  if (hours) return `${hours} hr`;
  if (minutes) return `${minutes} min`;
  return "";
}

function parseServings(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (typeof raw === "number") return `${raw} servings`;
  if (Array.isArray(raw) && raw.length > 0) return String(raw[0]);
  return "";
}

function asString(val: unknown): string {
  return typeof val === "string" ? cleanText(val) : "";
}

function findRecipeObjects(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data.flatMap(findRecipeObjects);
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (
      obj["@type"] === "Recipe" ||
      (Array.isArray(obj["@type"]) &&
        (obj["@type"] as string[]).includes("Recipe"))
    ) {
      return [obj];
    }
    if (obj["@graph"] && Array.isArray(obj["@graph"])) {
      return (obj["@graph"] as unknown[]).flatMap(findRecipeObjects);
    }
  }
  return [];
}

/** Decode HTML entities, replace non-breaking spaces, zero-width chars, and collapse whitespace */
function cleanText(text: string): string {
  // Decode HTML entities (&#39; &amp; &#8212; &frac12; etc.) via cheerio
  let decoded = text;
  if (/&[#a-z0-9]+;/i.test(decoded)) {
    decoded = cheerio.load(`<p>${decoded}</p>`, null, false)("p").text();
  }
  return decoded
    .replace(/[\u00a0\u200b\u200c\u200d\ufeff]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateContent(text: string, maxChars = 6000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n[content truncated]";
}
