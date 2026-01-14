'use client';

import { useEffect, useState } from 'react';
import { useRecipeStore } from '@/store/useRecipeStore';
import { useIngredientStore } from '@/store/useIngredientStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Utensils, Carrot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FoodSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: 'recipe' | 'ingredient', id: string) => void;
}

export function FoodSelectorDialog({ open, onOpenChange, onSelect }: FoodSelectorDialogProps) {
  const { recipes, fetchRecipes } = useRecipeStore();
  const { ingredients, fetchIngredients } = useIngredientStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'recipes' | 'ingredients'>('recipes');

  useEffect(() => {
    if (open) {
      if (recipes.length === 0) fetchRecipes();
      if (ingredients.length === 0) fetchIngredients();
    }
  }, [open, recipes.length, ingredients.length, fetchRecipes, fetchIngredients]);

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredIngredients = ingredients.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add to Meal</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex gap-2 items-center mb-4">
             <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="pl-8" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
          </div>
          
          <div className="grid w-full grid-cols-2 mb-4 bg-muted p-1 rounded-lg">
            <button
                onClick={() => setActiveTab('recipes')}
                className={cn(
                    "flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all",
                    activeTab === 'recipes' 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
            >
                <Utensils className="w-4 h-4" />
                Recipes
            </button>
            <button
                onClick={() => setActiveTab('ingredients')}
                className={cn(
                    "flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all",
                    activeTab === 'ingredients' 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
            >
                <Carrot className="w-4 h-4" />
                Ingredients
            </button>
          </div>

          {activeTab === 'recipes' && (
             <ScrollArea className="flex-1 -mx-1 px-1">
                <div className="space-y-2 pb-2">
                    {filteredRecipes.map(recipe => (
                        <Button
                            key={recipe.id}
                            variant="ghost"
                            className="w-full justify-start h-auto py-3 flex flex-col items-start"
                            onClick={() => onSelect('recipe', recipe.id)}
                        >
                            <span className="font-medium flex items-center gap-2">
                                <Utensils className="w-3 h-3" />
                                {recipe.name}
                            </span>
                            <span className="text-xs text-muted-foreground font-normal">
                                {recipe.steps.reduce((acc, s) => acc + s.ingredients.length, 0)} ingredients
                            </span>
                        </Button>
                    ))}
                    {filteredRecipes.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            No recipes found.
                        </div>
                    )}
                </div>
            </ScrollArea>
          )}

          {activeTab === 'ingredients' && (
             <ScrollArea className="flex-1 -mx-1 px-1">
                <div className="space-y-2 pb-2">
                    {filteredIngredients.map(ing => (
                        <Button
                            key={ing.id}
                            variant="ghost"
                            className="w-full justify-start h-auto py-3 flex flex-col items-start"
                            onClick={() => onSelect('ingredient', ing.id)}
                        >
                            <span className="font-medium flex items-center gap-2">
                                <Carrot className="w-3 h-3" />
                                {ing.name}
                            </span>
                            <div className="text-xs text-muted-foreground font-normal flex gap-2">
                                <span>{Math.round(ing.macros.calories)} kcal/100{ing.unit}</span>
                                <span>P:{Math.round(ing.macros.protein)} C:{Math.round(ing.macros.carbs)} F:{Math.round(ing.macros.fat)}</span>
                            </div>
                        </Button>
                    ))}
                    {filteredIngredients.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            No ingredients found.
                        </div>
                    )}
                </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
