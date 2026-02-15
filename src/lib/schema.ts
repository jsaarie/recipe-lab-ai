import { z } from "zod/v4";

export const ingredientSchema = z.object({
  quantity: z.string(),
  unit: z.string(),
  item: z.string(),
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
});

export type ParsedRecipeSchema = z.infer<typeof parsedRecipeSchema>;
