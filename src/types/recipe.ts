export interface Ingredient {
  quantity: string;
  unit: string;
  item: string;
}

export interface StepIngredient {
  quantity: string;
  unit: string;
  item: string;
  totalQuantity?: string;
  totalUnit?: string;
}

export interface ParsedRecipe {
  title: string;
  source: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  servings: string;
  ingredients: Ingredient[];
  instructions: string[];
  notes: string;
  stepIngredients?: StepIngredient[][];
}

export interface RecipeFeedback {
  rating?: number;
  cookNotes?: string;
  feedbackCreatedAt?: string;
  feedbackUpdatedAt?: string;
}

export interface SavedRecipe {
  _id: string;
  userId: string;
  savedAt: string;
  recipe: ParsedRecipe;
  servings: number;
  ingredientSwaps: Record<number, string>;
  unitSystem: "us" | "metric";
  rating?: number;
  cookNotes?: string;
  feedbackCreatedAt?: string;
  feedbackUpdatedAt?: string;
}
