import type { Recipe, RecipeStep } from "./types";

export const shortId = () => crypto.randomUUID().slice(0, 8);

export const emptyStep = (): RecipeStep => ({
  id: shortId(),
  text: "",
  actionId: null,
  minutes: null,
  activeMinutes: null,
  tempC: null,
  lines: [],
});

export const emptyRecipe = (): Recipe => ({
  id: "",
  name: "",
  category: "cina",
  servings: 1,
  freezes: false,
  keepsDays: 3,
  notes: "",
  steps: [emptyStep()],
});
