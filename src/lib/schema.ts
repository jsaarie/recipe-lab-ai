import { z } from "zod/v4";

export const ingredientSchema = z.object({
  quantity: z.string(),
  unit: z.string(),
  item: z.string(),
});

export const stepIngredientSchema = z.object({
  quantity: z.string(),
  unit: z.string(),
  item: z.string(),
  totalQuantity: z.string().optional(),
  totalUnit: z.string().optional(),
});

export const parsedRecipeSchema = z.object({
  title: z.string(),
  source: z.string(),
  prepTime: z.string(),
  cookTime: z.string(),
  totalTime: z.string(),
  servings: z.string(),
  ingredients: z.array(ingredientSchema),
  instructions: z.array(z.string()),
  notes: z.string(),
  stepIngredients: z.array(z.array(stepIngredientSchema)).optional(),
});

export type ParsedRecipeSchema = z.infer<typeof parsedRecipeSchema>;

// Minimal payload for /api/map-ingredients — only what the AI needs
export const mapIngredientsInputSchema = z.object({
  ingredients: z.array(ingredientSchema),
  instructions: z.array(z.string()),
});
