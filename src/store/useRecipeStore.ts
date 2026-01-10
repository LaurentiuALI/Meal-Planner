import { create } from 'zustand';
import { Recipe } from '../types';
import { getRecipes, createRecipe, updateRecipe, deleteRecipe } from '@/actions/recipes';

interface RecipeState {
  recipes: Recipe[];
  fetchRecipes: () => Promise<void>;
  addRecipe: (recipe: Omit<Recipe, 'id'>) => Promise<void>;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],

  fetchRecipes: async () => {
    const data = await getRecipes();
    set({ recipes: data });
  },

  addRecipe: async (recipe) => {
    await createRecipe(recipe);
    await get().fetchRecipes();
  },

  updateRecipe: async (id, updatedRecipe) => {
    await updateRecipe(id, updatedRecipe);
    await get().fetchRecipes();
  },

  deleteRecipe: async (id) => {
    await deleteRecipe(id);
    await get().fetchRecipes();
  },
}));