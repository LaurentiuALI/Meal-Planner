import { create } from 'zustand';
import { PlanTemplate, TemplateDay, TemplateMeal } from '@/types';
import { getTemplates, updateTemplateDay, addDayToTemplate, removeTemplateDay, addMealToTemplateDay, removeTemplateMeal, togglePlanActive, moveMealInTemplate, updateMealModifications } from '@/actions/templates';

interface TemplateStore {
  templates: PlanTemplate[];
  activeTemplateId: string | null;
  isLoading: boolean;
  
  // Computed helpers
  getActiveTemplate: () => PlanTemplate | undefined;

  // Actions
  loadTemplates: () => Promise<void>;
  setActiveTemplate: (id: string | null) => void;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
  
  // Optimistic / wrapper actions
  addDay: (name?: string) => Promise<void>;
  deleteDay: (dayId: string) => Promise<void>;
  updateDay: (dayId: string, data: Partial<TemplateDay>) => Promise<void>;
  
  addMeal: (dayId: string, recipeId: string, slot?: string) => Promise<void>;
  deleteMeal: (mealId: string) => Promise<void>;
  moveMeal: (mealId: string, targetDayId: string, slotName: string, newIndex: number) => Promise<void>;
  updateMealConfig: (mealId: string, modifications: any) => Promise<void>;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  activeTemplateId: null,
  isLoading: false,

  getActiveTemplate: () => {
    const { templates, activeTemplateId } = get();
    return templates.find(t => t.id === activeTemplateId);
  },

  loadTemplates: async () => {
    set({ isLoading: true });
    try {
      // We explicitly cast the result because the server action returns Prisma types 
      // which match our Interface but Typescript might complain about Date serialization
      const data = await getTemplates();
      set({ templates: data as any }); 
    } catch (error) {
      console.error("Failed to load templates", error);
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveTemplate: (id) => set({ activeTemplateId: id }),

  toggleActive: async (id, isActive) => {
    // Optimistic
    set(state => ({
      templates: state.templates.map(t => t.id === id ? { ...t, isActive } : t)
    }));
    await togglePlanActive(id, isActive);
    await get().loadTemplates(); // Sync fully just in case
  },

  addDay: async (name) => {
    const { activeTemplateId, loadTemplates } = get();
    if (!activeTemplateId) return;
    
    // Optimistic update could go here, but for now we wait for server
    await addDayToTemplate(activeTemplateId, name);
    await loadTemplates();
  },

  deleteDay: async (dayId) => {
    await removeTemplateDay(dayId);
    await get().loadTemplates();
  },

  updateDay: async (dayId, data) => {
    // Optimistic update
    set(state => ({
      templates: state.templates.map(t => {
        if (t.id !== state.activeTemplateId) return t;
        return {
          ...t,
          days: t.days.map(d => d.id === dayId ? { ...d, ...data } : d)
        };
      })
    }));

    await updateTemplateDay(dayId, data);
    // No reload needed if successful, but maybe safer to reload to ensure consistency
  },

  addMeal: async (dayId, recipeId, slot) => {
    await addMealToTemplateDay(dayId, recipeId, slot);
    await get().loadTemplates();
  },

  deleteMeal: async (mealId) => {
    await removeTemplateMeal(mealId);
    await get().loadTemplates();
  },

  moveMeal: async (mealId, targetDayId, slotName, newIndex) => {
    // Optimistic Update can be complex for reordering, let's rely on fast server action + revalidate for now to avoid state mismatch bugs.
    // If strict optimistic is needed, we can implement it.
    await moveMealInTemplate(mealId, targetDayId, slotName, newIndex);
    await get().loadTemplates();
  },

  updateMealConfig: async (mealId, modifications) => {
    // Optimistic update
    set(state => ({
        templates: state.templates.map(t => {
            if (t.id !== state.activeTemplateId) return t;
            return {
                ...t,
                days: t.days.map(d => ({
                    ...d,
                    meals: d.meals.map(m => m.id === mealId ? { ...m, modifications } : m)
                }))
            };
        })
    }));
    await updateMealModifications(mealId, modifications);
    // await get().loadTemplates(); // Optional sync
  }
}));
