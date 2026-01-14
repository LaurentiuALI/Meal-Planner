'use client';

import { useState } from 'react';
import { TemplateDay, TemplateMeal, Slot } from '@/types';
import { useTemplateStore } from '@/store/useTemplateStore';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Trash2, Plus, Utensils } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { TemplateMealItem } from './template-meal-item';
import { FoodSelectorDialog } from './food-selector-dialog';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';

interface TemplateDayCardProps {
  day: TemplateDay;
  slots: Slot[];
}

function SlotContainer({ slot, dayId, meals, onAddMeal }: { slot: Slot, dayId: string, meals: TemplateMeal[], onAddMeal: () => void }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `${dayId}::${slot.name}`
    });

    return (
        <div 
            ref={setNodeRef} 
            className={cn(
                "space-y-2 p-2 rounded-md transition-colors min-h-[4rem] border border-transparent",
                isOver ? "bg-accent/50 ring-2 ring-primary/20 border-primary/20" : "bg-muted/40 border-border/10"
            )}
        >
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                <span>{slot.name}</span>
                <span>{slot.time}</span>
            </div>
            <SortableContext items={meals.map(m => m.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 min-h-[2rem]">
                    {meals.map(meal => (
                        <TemplateMealItem key={meal.id} meal={meal} />
                    ))}
                </div>
            </SortableContext>
            
            <Button 
                variant="ghost" 
                size="sm" 
                className="w-full h-7 text-xs text-muted-foreground hover:text-primary"
                onClick={onAddMeal}
            >
                <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
        </div>
    );
}

export function TemplateDayCard({ day, slots }: TemplateDayCardProps) {
  const { updateDay, deleteDay, addMeal, addIngredient } = useTemplateStore();
  const [isFoodSelectorOpen, setIsFoodSelectorOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(day.name);
  const [targetSlotName, setTargetSlotName] = useState<string | null>(null);

  // Calculate Totals
  const totals = day.meals.reduce((acc, meal) => {
    let protein = 0, carbs = 0, fat = 0, cals = 0, fiber = 0;
    
    if (meal.recipe) {
        meal.recipe.steps.forEach(step => {
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
        
        // Multiply by servings
        protein *= meal.servings;
        carbs *= meal.servings;
        fat *= meal.servings;
        cals *= meal.servings;
        fiber *= meal.servings;

    } else if (meal.ingredient && meal.ingredientAmount) {
        const ing = meal.ingredient;
        const ratio = meal.ingredientAmount / 100; // assuming per 100 unit base for macros
        protein = ing.macros.protein * ratio;
        carbs = ing.macros.carbs * ratio;
        fat = ing.macros.fat * ratio;
        cals = ing.macros.calories * ratio;
        fiber = ing.macros.fiber * ratio;
        
        // Multiply by servings (if we treat servings as multiplier for standalone ingredients too)
        protein *= meal.servings;
        carbs *= meal.servings;
        fat *= meal.servings;
        cals *= meal.servings;
        fiber *= meal.servings;
    }

    return {
      protein: acc.protein + protein,
      carbs: acc.carbs + carbs,
      fat: acc.fat + fat,
      calories: acc.calories + cals,
      fiber: acc.fiber + fiber,
    };
  }, { protein: 0, carbs: 0, fat: 0, calories: 0, fiber: 0 });

  const handleNameSave = () => {
    if (nameInput !== day.name) {
      updateDay(day.id, { name: nameInput });
    }
    setEditingName(false);
  };

  const handleAddClick = (slotName: string) => {
    setTargetSlotName(slotName);
    setIsFoodSelectorOpen(true);
  };

  const handleFoodSelect = (type: 'recipe' | 'ingredient', id: string) => {
    const slot = targetSlotName || slots[0]?.name || 'Meal';
    if (type === 'recipe') {
        addMeal(day.id, id, slot);
    } else {
        // Default to 100 amount for now
        addIngredient(day.id, id, 100, slot);
    }
    setIsFoodSelectorOpen(false);
    setTargetSlotName(null);
  };

  // Group meals by slot
  // Also handle meals with unknown slots (put them in first slot or a generic "Other")
  // For now, assume if slotName matches a slot.name, it goes there.
  // If not, put in "Other" or append to first slot?
  // Let's create buckets.
  
  const slotMap = new Map<string, TemplateMeal[]>();
  slots.forEach(s => slotMap.set(s.name, []));
  const otherMeals: TemplateMeal[] = [];

  day.meals.forEach(meal => {
      if (slotMap.has(meal.slotName)) {
          slotMap.get(meal.slotName)!.push(meal);
      } else {
          otherMeals.push(meal);
      }
  });

  // Sort meals within slots by sortOrder
  slots.forEach(s => {
      slotMap.get(s.name)!.sort((a, b) => a.sortOrder - b.sortOrder);
  });

  return (
    <Card className="w-[85vw] md:w-80 h-full flex flex-col shrink-0 bg-card shadow-sm border-border/50">
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
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
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
                     <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="t-fiber">Fiber</Label>
                      <Input 
                        id="t-fiber" 
                        type="number" 
                        className="col-span-2 h-8" 
                        placeholder="Global" 
                         value={day.targetFiber || ''}
                         onChange={(e) => updateDay(day.id, { targetFiber: e.target.value ? parseInt(e.target.value) : undefined })}
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
           <MacroBar label="Fiber" value={totals.fiber} target={day.targetFiber || 30} color="bg-green-600" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-2 space-y-3">
        {slots.map(slot => (
            <SlotContainer 
                key={slot.id} 
                slot={slot} 
                dayId={day.id} 
                meals={slotMap.get(slot.name) || []} 
                onAddMeal={() => handleAddClick(slot.name)}
            />
        ))}
        
        {/* Render meals with unknown slots if any */}
        {otherMeals.length > 0 && (
            <div className="space-y-2 p-2 rounded-md bg-destructive/10">
                <div className="text-xs font-semibold text-destructive uppercase tracking-wider">Unassigned</div>
                <SortableContext items={otherMeals.map(m => m.id)} strategy={verticalListSortingStrategy}>
                    {otherMeals.map(meal => (
                        <TemplateMealItem key={meal.id} meal={meal} />
                    ))}
                </SortableContext>
            </div>
        )}
      </CardContent>

       <FoodSelectorDialog 
        open={isFoodSelectorOpen} 
        onOpenChange={setIsFoodSelectorOpen}
        onSelect={handleFoodSelect}
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

