import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ShoppingListState {
  checkedItems: Record<string, boolean>
  toggleItem: (id: string) => void
  clearChecked: () => void
}

export const useShoppingListStore = create<ShoppingListState>()(
  persist(
    (set) => ({
      checkedItems: {},
      toggleItem: (id) =>
        set((state) => ({
          checkedItems: {
            ...state.checkedItems,
            [id]: !state.checkedItems[id],
          },
        })),
      clearChecked: () => set({ checkedItems: {} }),
    }),
    {
      name: 'shopping-list-storage',
    }
  )
)
