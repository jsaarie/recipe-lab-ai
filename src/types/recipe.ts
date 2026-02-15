export interface Ingredient {
  quantity: string;
  unit: string;
  item: string;
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
}
