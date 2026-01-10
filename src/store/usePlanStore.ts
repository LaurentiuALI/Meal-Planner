import { create } from 'zustand';
import { DayPlan, Meal, Settings } from '../types';
import { getPlans, setMeal, removeMeal, resetPlan, getSettings, updateSettings, addDay, removeDay } from '@/actions/plans';

interface PlanState {
  plans: DayPlan[];
  settings: Settings | null;
  fetchPlans: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (s: Settings) => Promise<void>;
  
  addDay: (date: string) => Promise<void>;
  removeDay: (date: string) => Promise<void>;

  setMeal: (date: string, meal: Omit<Meal, 'id' | 'sortOrder'>, mealIndex: number) => Promise<void>;
  removeMeal: (mealId: string) => Promise<void>;
  resetPlan: () => Promise<void>;
  getPlanForDate: (date: string) => DayPlan | undefined;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [],
  settings: null,

  fetchPlans: async () => {
    const data = await getPlans();
    set({ plans: data });
  },

  fetchSettings: async () => {
    const data = await getSettings();
    set({ settings: data });
  },

  updateSettings: async (s) => {
    await updateSettings(s);
    set({ settings: s });
  },

  addDay: async (date) => {
    await addDay(date);
    await get().fetchPlans();
  },

  removeDay: async (date) => {
    await removeDay(date);
    await get().fetchPlans();
  },

  setMeal: async (date, meal, mealIndex) => {
    await setMeal(date, meal, mealIndex);
    await get().fetchPlans();
  },

  removeMeal: async (mealId) => {
    await removeMeal(mealId);
    await get().fetchPlans();
  },

  resetPlan: async () => {
    await resetPlan();
    await get().fetchPlans();
  },

  getPlanForDate: (date) => get().plans.find((p) => p.date === date),
}));