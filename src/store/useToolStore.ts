import { create } from 'zustand';
import { Tool } from '@/types';
import { getTools, createTool, deleteTool } from '@/actions/recipes';

interface ToolState {
  tools: Tool[];
  fetchTools: () => Promise<void>;
  addTool: (name: string) => Promise<Tool>;
  removeTool: (id: string) => Promise<void>;
}

export const useToolStore = create<ToolState>((set, get) => ({
  tools: [],
  fetchTools: async () => {
    const tools = await getTools();
    set({ tools });
  },
  addTool: async (name) => {
    const newTool = await createTool(name);
    await get().fetchTools();
    return newTool;
  },
  removeTool: async (id) => {
    await deleteTool(id);
    await get().fetchTools();
  }
}));
