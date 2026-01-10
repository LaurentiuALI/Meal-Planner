'use client';

import { useEffect, useState } from 'react';
import { useRecipeStore } from '@/store/useRecipeStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';

interface RecipeSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (recipeId: string) => void;
}

export function RecipeSelectorDialog({ open, onOpenChange, onSelect }: RecipeSelectorDialogProps) {
  const { recipes, fetchRecipes } = useRecipeStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open && recipes.length === 0) {
      fetchRecipes();
    }
  }, [open, recipes.length, fetchRecipes]);

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select a Recipe</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search recipes..." 
            className="pl-8" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ScrollArea className="flex-1 mt-2">
            <div className="space-y-2 p-1">
                {filteredRecipes.map(recipe => (
                    <Button
                        key={recipe.id}
                        variant="ghost"
                        className="w-full justify-start h-auto py-3 flex flex-col items-start"
                        onClick={() => onSelect(recipe.id)}
                    >
                        <span className="font-medium">{recipe.name}</span>
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
      </DialogContent>
    </Dialog>
  );
}
