import { NextResponse } from "next/server";
import { auth } from "@/auth";
import client from "@/lib/db";
import { z } from "zod";
import { awardXp } from "@/lib/award-xp";

const saveRecipeSchema = z.object({
  recipe: z.object({
    title: z.string(),
    source: z.string(),
    prepTime: z.string(),
    cookTime: z.string(),
    totalTime: z.string(),
    servings: z.string(),
    ingredients: z.array(
      z.object({ quantity: z.string(), unit: z.string(), item: z.string() })
    ),
    instructions: z.array(z.string()),
    notes: z.string(),
    stepIngredients: z
      .array(
        z.array(
          z.object({
            quantity: z.string(),
            unit: z.string(),
            item: z.string(),
            totalQuantity: z.string().optional(),
            totalUnit: z.string().optional(),
          })
        )
      )
      .optional(),
  }),
  servings: z.number().int().min(1),
  ingredientSwaps: z.record(z.coerce.number(), z.string()),
  unitSystem: z.enum(["us", "metric"]),
  isOcr: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = saveRecipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const db = client.db();
  const collection = db.collection("savedRecipes");

  // Check for duplicate source URL
  const existing = await collection.findOne({
    userId: session.user.id,
    "recipe.source": parsed.data.recipe.source,
  });

  if (existing) {
    // Overwrite existing saved recipe
    const { isOcr: _isOcr, ...recipeData } = parsed.data;
    await collection.updateOne(
      { _id: existing._id },
      {
        $set: {
          ...recipeData,
          savedAt: new Date(),
        },
      }
    );
    return NextResponse.json({
      id: existing._id.toString(),
      updated: true,
    });
  }

  const { isOcr, ...recipeData } = parsed.data;
  const result = await collection.insertOne({
    userId: session.user.id,
    savedAt: new Date(),
    ...recipeData,
  });

  const newId = result.insertedId.toString();

  // Award XP: completing a recipe (saving = completing the lab flow)
  await awardXp(session.user.id, newId, "complete");
  // Award OCR XP if the recipe was digitized via image scan
  if (isOcr) {
    await awardXp(session.user.id, newId, "ocr");
  }

  return NextResponse.json({ id: newId }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = client.db();
  const recipes = await db
    .collection("savedRecipes")
    .find({ userId: session.user.id })
    .sort({ savedAt: -1 })
    .project({
      _id: 1,
      "recipe.title": 1,
      "recipe.source": 1,
      "recipe.totalTime": 1,
      servings: 1,
      savedAt: 1,
      rating: 1,
    })
    .toArray();

  const mapped = recipes.map((r) => ({
    _id: r._id.toString(),
    title: r.recipe.title,
    source: r.recipe.source,
    totalTime: r.recipe.totalTime,
    servings: r.servings,
    savedAt: r.savedAt,
    rating: r.rating,
  }));

  return NextResponse.json(mapped);
}
