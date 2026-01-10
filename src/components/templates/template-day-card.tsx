'use client';

import { useState } from 'react';
import { TemplateDay, TemplateMeal } from '@/types';
import { useTemplateStore } from '@/store/useTemplateStore';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Trash2, Plus, Utensils } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { TemplateMealItem } from './template-meal-item';
import { RecipeSelectorDialog } from './recipe-selector-dialog';

interface TemplateDayCardProps {
  day: TemplateDay;
}

export function TemplateDayCard({ day }: TemplateDayCardProps) {
  const { updateDay, deleteDay, addMeal } = useTemplateStore();
  const [isRecipeSelectorOpen, setIsRecipeSelectorOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(day.name);

  // Calculate Totals
  const totals = day.meals.reduce((acc, meal) => {
    // Assuming meal.recipe is populated. If not, these will be 0.
    // We need to ensure the server action includes recipe data.
    const recipe = meal.recipe;
    if (!recipe) return acc;

    // A rough calculation - normally we'd do this more robustly
    // For now assuming recipe has calculated macros or we compute them from ingredients
    // But wait, the recipe object from Prisma doesn't strictly have 'macros' property unless we computed it.
    // The previous implementation computed macros on the fly. 
    // Let's assume we can get them.
    
    // Actually, looking at the `getTemplates` action, we include:
    // recipe -> ingredients -> ingredient
    // So we need to calculate macros here or in the store.
    
    let protein = 0, carbs = 0, fat = 0, cals = 0, fiber = 0;
    
    recipe.steps.forEach(step => {
        step.ingredients.forEach(ri => {
            if (!ri.ingredient) return;
            const ing = ri.ingredient;
            const ratio = ri.amount / 100;
            protein += ing.macros.protein * ratio;
            carbs += ing.macros.carbs * ratio;
            fat += ing.macros.fat * ratio;
            cals += ing.macros.calories * ratio;
            fiber += ing.macros.fiber * ratio;
        });
    });

    return {
      protein: acc.protein + (protein * meal.servings),
      carbs: acc.carbs + (carbs * meal.servings),
      fat: acc.fat + (fat * meal.servings),
      calories: acc.calories + (cals * meal.servings),
      fiber: acc.fiber + (fiber * meal.servings),
    };
  }, { protein: 0, carbs: 0, fat: 0, calories: 0, fiber: 0 });

  const handleNameSave = () => {
    if (nameInput !== day.name) {
      updateDay(day.id, { name: nameInput });
    }
    setEditingName(false);
  };

  const handleAddMeal = (recipeId: string) => {
    addMeal(day.id, recipeId);
    setIsRecipeSelectorOpen(false);
  };

  return (
    <Card className="w-80 h-full flex flex-col shrink-0">
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-center justify-between">
          {editingName ? (
            <Input 
              value={nameInput} 
              onChange={(e) => setNameInput(e.target.value)} 
              onBlur={handleNameSave}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
              className="h-7 text-sm font-semibold"
              autoFocus
            />
          ) : (
            <h3 
              className="font-semibold cursor-pointer hover:underline decoration-dashed"
              onClick={() => setEditingName(true)}
            >
              {day.name}
            </h3>
          )}
          
          <div className="flex gap-1">
             <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Settings className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Macro Targets</h4>
                  <p className="text-xs text-muted-foreground">Override global defaults for this day.</p>
                  <div className="grid gap-2">
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="t-cal">Kcal</Label>
                      <Input 
                        id="t-cal" 
                        type="number" 
                        className="col-span-2 h-8" 
                        placeholder="Global"
                        value={day.targetCalories || ''}
                        onChange={(e) => updateDay(day.id, { targetCalories: e.target.value ? parseInt(e.target.value) : undefined })}
                      />
                    </div>
                     <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="t-pro">Prot</Label>
                      <Input 
                        id="t-pro" 
                        type="number" 
                        className="col-span-2 h-8" 
                        placeholder="Global" 
                        value={day.targetProtein || ''}
                         onChange={(e) => updateDay(day.id, { targetProtein: e.target.value ? parseInt(e.target.value) : undefined })}
                      />
                    </div>
                     <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="t-carb">Carb</Label>
                      <Input 
                        id="t-carb" 
                        type="number" 
                        className="col-span-2 h-8" 
                        placeholder="Global" 
                         value={day.targetCarbs || ''}
                         onChange={(e) => updateDay(day.id, { targetCarbs: e.target.value ? parseInt(e.target.value) : undefined })}
                      />
                    </div>
                     <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="t-fat">Fat</Label>
                      <Input 
                        id="t-fat" 
                        type="number" 
                        className="col-span-2 h-8" 
                        placeholder="Global" 
                         value={day.targetFat || ''}
                         onChange={(e) => updateDay(day.id, { targetFat: e.target.value ? parseInt(e.target.value) : undefined })}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteDay(day.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-1 pt-2">
           <MacroBar label="Kcal" value={totals.calories} target={day.targetCalories || 2000} color="bg-slate-500" />
           <MacroBar label="Prot" value={totals.protein} target={day.targetProtein || 150} color="bg-blue-500" />
           <MacroBar label="Carb" value={totals.carbs} target={day.targetCarbs || 200} color="bg-amber-500" />
           <MacroBar label="Fat" value={totals.fat} target={day.targetFat || 60} color="bg-emerald-500" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-2 space-y-2 bg-muted/20">
        {day.meals.map((meal) => (
          <TemplateMealItem key={meal.id} meal={meal} />
        ))}
      </CardContent>

      <CardFooter className="p-2">
        <Button className="w-full" variant="outline" onClick={() => setIsRecipeSelectorOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Meal
        </Button>
      </CardFooter>

       <RecipeSelectorDialog 
        open={isRecipeSelectorOpen} 
        onOpenChange={setIsRecipeSelectorOpen}
        onSelect={handleAddMeal}
      />
    </Card>
  );
}

function MacroBar({ label, value, target, color }: { label: string, value: number, target: number, color: string }) {
  const pct = Math.min(100, (value / target) * 100);
  return (
    <div className="text-xs">
      <div className="flex justify-between mb-0.5">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span>{Math.round(value)} / {target}</span>
      </div>
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
