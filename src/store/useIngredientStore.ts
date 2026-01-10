import { create } from 'zustand';
import { Ingredient } from '../types';
import { getIngredients, createIngredient, updateIngredient, deleteIngredient } from '@/actions/ingredients';

interface IngredientState {
  ingredients: Ingredient[];
  fetchIngredients: () => Promise<void>;
  addIngredient: (ingredient: Omit<Ingredient, 'id'>) => Promise<Ingredient>;
  updateIngredient: (id: string, ingredient: Partial<Ingredient>) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
}

export const useIngredientStore = create<IngredientState>((set, get) => ({
  ingredients: [],
  
  fetchIngredients: async () => {
    const data = await getIngredients();
    set({ ingredients: data });
  },

  addIngredient: async (ingredient) => {
    // Optimistic update (optional, skipping for simplicity/reliability first)
    // Actually, let's wait for server response to get the real ID
    const newIngredient = await createIngredient(ingredient);
    await get().fetchIngredients();
    return newIngredient;
  },

  updateIngredient: async (id, updatedIngredient) => {
    await updateIngredient(id, updatedIngredient);
    await get().fetchIngredients();
  },

  deleteIngredient: async (id) => {
    await deleteIngredient(id);
    await get().fetchIngredients();
  },
}));