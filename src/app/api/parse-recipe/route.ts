import { NextRequest, NextResponse } from "next/server";
import { scrapeRecipePage } from "@/lib/scraper";
import { extractRecipe } from "@/lib/ai/claude";

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

    // If JSON-LD gave us a complete recipe, return it directly (no AI cost)
    if (result.type === "structured") {
      return NextResponse.json({ recipe: result.recipe, source: "structured" });
    }

    // Fallback: use Claude AI to extract from raw text
    if (!result.content || result.content.length < 50) {
      return NextResponse.json(
        { error: "Could not extract content from this page" },
        { status: 422 }
      );
    }

    const recipe = await extractRecipe(result.content, url);
    return NextResponse.json({ recipe, source: "ai" });
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
