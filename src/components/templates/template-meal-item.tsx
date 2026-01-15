'use client';

import { useState, useMemo, useEffect } from 'react';
import { TemplateMeal } from '@/types';
import { useTemplateStore } from '@/store/useTemplateStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, ChevronDown, ChevronUp, RotateCcw, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface TemplateMealItemProps {
  meal: TemplateMeal;
}

export function TemplateMealItem({ meal }: TemplateMealItemProps) {
  const { deleteMeal, updateMealConfig, updateMeal } = useTemplateStore();
  const [isOpen, setIsOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: meal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const recipe = meal.recipe;
  const ingredient = meal.ingredient;
  const mods = useMemo(() => meal.modifications || { ingredients: {}, tools: {} }, [meal.modifications]);

  // Flatten ingredients and tools
  const { ingredients, tools } = useMemo(() => {
    if (recipe) {
        const ings: any[] = []; 
        const tls: any[] = [];

        recipe.steps.forEach(step => {
            step.ingredients.forEach(ri => {
                if (ri.ingredient) {
                    ings.push({ 
                        ...ri.ingredient, 
                        baseAmount: ri.amount, 
                        stepId: step.id 
                    });
                }
            });
            step.tools.forEach(t => tls.push(t));
        });
        return { ingredients: ings, tools: tls };
    } else if (ingredient && meal.ingredientAmount) {
         return { 
            ingredients: [{
                ...ingredient,
                baseAmount: meal.ingredientAmount,
                stepId: 'main'
            }], 
            tools: [] 
         };
    }
    return { ingredients: [], tools: [] };
  }, [recipe, ingredient, meal.ingredientAmount]);

  // Calculate macros handling overrides
  const macros = useMemo(() => {
    if (!ingredients.length) return null;
    
    let p = 0, c = 0, f = 0, fib = 0, cal = 0;
    
    ingredients.forEach(ing => {
        // Check for override
        let amount = ing.baseAmount;
        
        if (recipe) {
             const override = mods.ingredients?.[ing.id];
             if (override) amount = override.amount;
        } 
        
        const ratio = amount / 100;
        p += ing.macros.protein * ratio;
        c += ing.macros.carbs * ratio;
        f += ing.macros.fat * ratio;
        fib += ing.macros.fiber * ratio;
        cal += ing.macros.calories * ratio;
    });

    return {
        p: Math.round(p * meal.servings),
        c: Math.round(c * meal.servings),
        f: Math.round(f * meal.servings),
        fib: Math.round(fib * meal.servings),
        cal: Math.round(cal * meal.servings)
    };
  }, [ingredients, mods, meal.servings, recipe]);

  const handleIngredientChange = (ingId: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;

    if (recipe) {
        const newMods = { ...mods };
        if (!newMods.ingredients) newMods.ingredients = {};
        newMods.ingredients[ingId] = { 
            amount: num,
            unit: newMods.ingredients[ingId]?.unit 
        };
        updateMealConfig(meal.id, newMods);
    } else {
        // Standalone ingredient - update directly
        updateMeal(meal.id, { ingredientAmount: num });
    }
  };

  const resetIngredient = (ingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (recipe) {
        const newMods = { ...mods };
        if (newMods.ingredients && newMods.ingredients[ingId]) {
            delete newMods.ingredients[ingId];
            updateMealConfig(meal.id, newMods);
        }
    }
  };

  const itemName = recipe ? recipe.name : ingredient ? ingredient.name : 'Unknown';

  // Local component for debounced input to avoid re-renders of the whole card
  const DebouncedInput = ({ value, onChange, className }: { value: number, onChange: (val: string) => void, className?: string }) => {
    const [localValue, setLocalValue] = useState(value.toString());

    useEffect(() => {
        setLocalValue(value.toString());
    }, [value]);

    const handleBlur = () => {
        if (localValue !== value.toString()) {
            onChange(localValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.currentTarget as HTMLInputElement).blur();
        }
    };

    return (
        <Input 
            className={className}
            type="number"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.target.select()}
        />
    );
};

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="touch-none"> 
        <Card className={cn(
            "relative group bg-background transition-all overflow-hidden",
            isOpen ? "ring-2 ring-primary/10" : "hover:shadow-sm"
        )}>
            {/* Header / Summary View */}
            <div 
                className="p-3 flex items-start gap-3"
            >
                {/* Drag Handle */}
                <div className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground touch-none" {...listeners}>
                    <GripVertical className="w-5 h-5" />
                </div>

                <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className="flex items-center justify-between pr-8">
                         <span className="text-base font-medium truncate">{itemName}</span>
                    </div>
                   
                    <div className="text-sm text-muted-foreground mt-1 flex gap-2 items-center">
                         <span className="bg-secondary px-1.5 rounded text-xs">{meal.servings} srv</span>
                         {isOpen ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
                    </div>

                    {macros && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground font-medium">
                            <span>{macros.cal} kcal</span>
                            <span className="text-blue-600">P: {macros.p}g</span>
                            <span className="text-amber-600">C: {macros.c}g</span>
                            <span className="text-emerald-600">F: {macros.f}g</span>
                            <span className="text-green-700">Fib: {macros.fib}g</span>
                        </div>
                    )}
                </div>

                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive transition-colors z-10"
                    onClick={(e) => {
                        e.stopPropagation();
                        deleteMeal(meal.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Expanded Details */}
            {isOpen && (
                <div 
                    className="px-3 pb-3 pt-0 space-y-4 border-t bg-muted/10"
                    onPointerDown={(e) => e.stopPropagation()} 
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Ingredients List */}
                    <div className="space-y-2 mt-3">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ingredients (per 1 serving)</Label>
                        {ingredients.map(ing => {
                            let currentAmount = ing.baseAmount;
                            let isModified = false;
                            
                            if (recipe) {
                                const override = mods.ingredients?.[ing.id];
                                if (override) {
                                    currentAmount = override.amount;
                                    isModified = true;
                                }
                            }

                            return (
                                <div key={ing.id + ing.stepId} className="flex items-center justify-between text-sm gap-3">
                                    <span className="truncate flex-1 text-muted-foreground">{ing.name}</span>
                                    <div className="flex items-center gap-2 w-28 justify-end">
                                        <DebouncedInput 
                                            className={cn("h-7 text-sm px-2 text-right w-16", isModified && "border-amber-500 text-amber-600 font-medium")}
                                            value={currentAmount}
                                            onChange={(val) => handleIngredientChange(ing.id, val)}
                                        />
                                        <span className="w-8 text-xs text-muted-foreground text-right">{ing.unit}</span>
                                    </div>
                                    {isModified && recipe && (
                                         <Button 
                                            variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mr-1"
                                            title="Reset to recipe default"
                                            onClick={(e) => resetIngredient(ing.id, e)}
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Tools List */}
                    {tools.length > 0 && (
                        <div className="space-y-2">
                             <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tools</Label>
                             <div className="flex flex-wrap gap-1.5">
                                {tools.map(tool => (
                                    <span key={tool.id} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-background border text-foreground shadow-sm">
                                        {tool.name}
                                    </span>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            )}
        </Card>
    </div>
  );
}