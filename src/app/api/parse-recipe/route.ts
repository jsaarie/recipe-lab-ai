import { NextRequest, NextResponse } from "next/server";
import { scrapeRecipePage, scrapeWithBrowserless } from "@/lib/scraper";
import { extractRecipe as extractWithGemini } from "@/lib/ai/gemini";
import type { ScrapeResult } from "@/lib/scraper";

async function handleScrapeResult(result: ScrapeResult, url: string): Promise<NextResponse> {
  if (result.type === "structured") {
    return NextResponse.json({ recipe: result.recipe, source: "structured" });
  }

  if (!result.content || result.content.length < 50) {
    return NextResponse.json(
      { error: "Could not extract content from this page" },
      { status: 422 }
    );
  }

  const recipe = await extractWithGemini(result.content, url);

  if (
    !recipe ||
    !recipe.title ||
    !Array.isArray(recipe.ingredients) ||
    recipe.ingredients.length === 0 ||
    !Array.isArray(recipe.instructions) ||
    recipe.instructions.length === 0
  ) {
    return NextResponse.json(
      { error: "No recipe found on this page. Try a direct link to a recipe." },
      { status: 422 }
    );
  }

  return NextResponse.json({ recipe, source: "gemini" });
}

export async function POST(req: NextRequest) {
  let url: string | undefined;
  try {
    const body = await req.json();
    url = body.url;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid URL" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const result = await scrapeRecipePage(url);
    return handleScrapeResult(result, url);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to parse recipe";

    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    const isBlocked =
      isTimeout ||
      (message.includes("Failed to fetch page") &&
        ["403", "429", "407"].some((code) => message.includes(code)));

    // Tier 2: Browserless — handles Cloudflare bot protection
    if (isBlocked && process.env.BROWSERLESS_API_KEY) {
      try {
        const result = await scrapeWithBrowserless(url!);
        return handleScrapeResult(result, url!);
      } catch {
        // Browserless also failed — fall through to blocked signal
      }
    }

    if (isBlocked) {
      return NextResponse.json({ blocked: true }, { status: 200 });
    }

    if (message.includes("Failed to fetch page")) {
      return NextResponse.json(
        { error: "Could not reach that URL. Check the link and try again." },
        { status: 422 }
      );
    }

    console.error("Parse recipe error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
