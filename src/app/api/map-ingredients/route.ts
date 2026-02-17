import { NextRequest, NextResponse } from "next/server";
import { mapStepIngredients as mapWithGemini } from "@/lib/ai/gemini";
import { mapStepIngredients as mapWithClaude } from "@/lib/ai/claude";
import { mapIngredientsInputSchema } from "@/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const recipe = mapIngredientsInputSchema.parse(body);

    let stepIngredients = null;
    try {
      stepIngredients = await mapWithGemini(recipe) ?? null;
    } catch {
      try {
        stepIngredients = await mapWithClaude(recipe) ?? null;
      } catch {
        // Both failed — return null, client degrades gracefully
      }
    }

    return NextResponse.json({ stepIngredients });
  } catch (err) {
    console.error("Map ingredients error:", err);
    return NextResponse.json({ stepIngredients: null });
  }
}
