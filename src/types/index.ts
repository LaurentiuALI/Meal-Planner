export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  fiber: number;
}

export interface Ingredient {
  id: string;
  name: string;
  macros: Macros; // per 100g or per unit
  unit: string; // e.g., 'g', 'ml', 'unit'
  purchaseUnit: {
    name: string; // e.g., 'pack', 'bottle'
    amount: number; // e.g., 500 (if unit is g, then 500g)
  };
  barcodes?: string[];
}

export interface RecipeIngredient {
  ingredientId: string;
  amount: number;
  ingredient?: Ingredient;
}

export interface Tool {
  id: string;
  name: string;
}

export interface RecipeStep {
  id: string;
  description: string;
  sortOrder: number;
  ingredients: RecipeIngredient[];
  tools: Tool[];
}

export interface Recipe {
  id: string;
  name: string;
  steps: RecipeStep[];
  method: string[]; // e.g., ['slow cooker', 'one pot'] - kept for metadata
  badges?: Badge[];
  // Computed property helper for easier UI access (optional)
  computedMacros?: Macros; 
}

export interface Meal {
  id: string;
  sortOrder: number;
  slotName: string;
  recipeId: string;
  servings: number;
}

export interface Settings {
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  fiberTarget: number;
}

export interface DayPlan {
  id: string;
  date: string; // ISO date string
  meals: Meal[];
}

export interface Badge {
  type: 'info' | 'success' | 'warning' | 'error';
  label: string;
  description?: string;
}

export interface TemplateMeal {
  id: string;
  templateDayId: string;
  recipeId: string;
  recipe?: Recipe;
  slotName: string;
  sortOrder: number;
  servings: number;
}

export interface TemplateDay {
  id: string;
  planTemplateId: string;
  name: string;
  sortOrder: number;
  
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  targetFiber?: number;

  meals: TemplateMeal[];
}

export interface PlanTemplate {
  id: string;
  name: string;
  isActive: boolean;
  days: TemplateDay[];
  createdAt?: Date;
  updatedAt?: Date;
}
