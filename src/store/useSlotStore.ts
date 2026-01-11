import { create } from 'zustand';
import { Slot } from '@/types';
import { getSlots } from '@/actions/slots';

interface SlotStore {
  slots: Slot[];
  isLoading: boolean;
  loadSlots: () => Promise<void>;
  setSlots: (slots: Slot[]) => void;
}

export const useSlotStore = create<SlotStore>((set) => ({
  slots: [],
  isLoading: false,
  loadSlots: async () => {
    set({ isLoading: true });
    try {
      const data = await getSlots();
      set({ slots: data });
    } catch (error) {
      console.error('Failed to load slots:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  setSlots: (slots) => set({ slots }),
}));
