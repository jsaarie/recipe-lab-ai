import { NextRequest, NextResponse } from "next/server";
import { scrapeRecipePage } from "@/lib/scraper";
import { extractRecipe as extractWithGemini } from "@/lib/ai/gemini";
import { extractRecipe as extractWithClaude } from "@/lib/ai/claude";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

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

    // Scrape page content
    const result = await scrapeRecipePage(url);

    // Structured data: return immediately — client calls /api/map-ingredients in background
    if (result.type === "structured") {
      return NextResponse.json({ recipe: result.recipe, source: "structured" });
    }

    // Use AI to extract from raw text
    if (!result.content || result.content.length < 50) {
      return NextResponse.json(
        { error: "Could not extract content from this page" },
        { status: 422 }
      );
    }

    // Try Gemini first, fall back to Claude
    let recipe;
    let aiSource = "gemini";
    try {
      recipe = await extractWithGemini(result.content, url);
    } catch {
      aiSource = "claude";
      recipe = await extractWithClaude(result.content, url);
    }

    // Validate that the AI actually found a recipe
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

    return NextResponse.json({ recipe, source: aiSource });
  } catch (err) {
    console.error("Parse recipe error:", err);

    const message =
      err instanceof Error ? err.message : "Failed to parse recipe";

    if (message.includes("Failed to fetch page")) {
      return NextResponse.json(
        { error: "Could not reach that URL. Check the link and try again." },
        { status: 422 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
