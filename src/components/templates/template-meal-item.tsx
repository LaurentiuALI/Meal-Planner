'use client';

import { useState, useMemo } from 'react';
import { TemplateMeal, MealModifications } from '@/types';
import { useTemplateStore } from '@/store/useTemplateStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface TemplateMealItemProps {
  meal: TemplateMeal;
}

export function TemplateMealItem({ meal }: TemplateMealItemProps) {
  const { deleteMeal, updateMealConfig } = useTemplateStore();
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
    touchAction: 'none' as React.CSSProperties['touchAction'],
  };

  const recipe = meal.recipe;
  const mods = meal.modifications || { ingredients: {}, tools: {} };

  // Flatten ingredients and tools
  const { ingredients, tools } = useMemo(() => {
    if (!recipe) return { ingredients: [], tools: [] };
    
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
  }, [recipe]);

  // Calculate macros handling overrides
  const macros = useMemo(() => {
    if (!ingredients.length) return null;
    
    let p = 0, c = 0, f = 0, cal = 0;
    
    ingredients.forEach(ing => {
        // Check for override
        const override = mods.ingredients?.[ing.id];
        const amount = override ? override.amount : ing.baseAmount;
        
        const ratio = amount / 100;
        p += ing.macros.protein * ratio;
        c += ing.macros.carbs * ratio;
        f += ing.macros.fat * ratio;
        cal += ing.macros.calories * ratio;
    });

    return {
        p: Math.round(p * meal.servings),
        c: Math.round(c * meal.servings),
        f: Math.round(f * meal.servings),
        cal: Math.round(cal * meal.servings)
    };
  }, [ingredients, mods, meal.servings]);

  const handleIngredientChange = (ingId: string, value: string) => {
    const num = parseFloat(value);
    const newMods = { ...mods };
    if (!newMods.ingredients) newMods.ingredients = {};
    
    if (isNaN(num)) return; // Handle empty/invalid better in real app

    newMods.ingredients[ingId] = { 
        amount: num,
        unit: newMods.ingredients[ingId]?.unit 
    };
    updateMealConfig(meal.id, newMods);
  };

  const resetIngredient = (ingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newMods = { ...mods };
    if (newMods.ingredients && newMods.ingredients[ingId]) {
        delete newMods.ingredients[ingId];
        updateMealConfig(meal.id, newMods);
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <Card className={cn(
            "relative group bg-background transition-all overflow-hidden",
            isOpen ? "ring-2 ring-primary/10" : "hover:shadow-sm"
        )}>
            {/* Header / Summary View */}
            <div 
                className="p-2 cursor-pointer flex items-start gap-2"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between pr-6">
                         <span className="text-sm font-medium truncate">{recipe?.name || 'Unknown'}</span>
                    </div>
                   
                    <div className="text-xs text-muted-foreground mt-0.5 flex gap-2">
                         <span>{meal.servings} srv</span>
                         {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </div>

                    {macros && (
                        <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground font-mono">
                            <span>{macros.cal}kcal</span>
                            <span className="text-blue-500">P:{macros.p}</span>
                            <span className="text-amber-500">C:{macros.c}</span>
                            <span className="text-emerald-500">F:{macros.f}</span>
                        </div>
                    )}
                </div>

                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive transition-colors z-10"
                    onClick={(e) => {
                        e.stopPropagation();
                        deleteMeal(meal.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <X className="w-3 h-3" />
                </Button>
            </div>

            {/* Expanded Details */}
            {isOpen && (
                <div 
                    className="px-2 pb-2 pt-0 space-y-3 border-t bg-muted/10"
                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag start from inside details
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Ingredients List */}
                    <div className="space-y-1 mt-2">
                        <Label className="text-xs text-muted-foreground">Ingredients (per 1 serving)</Label>
                        {ingredients.map(ing => {
                            const override = mods.ingredients?.[ing.id];
                            const currentAmount = override ? override.amount : ing.baseAmount;
                            const isModified = !!override;

                            return (
                                <div key={ing.id + ing.stepId} className="flex items-center justify-between text-xs gap-2">
                                    <span className="truncate flex-1">{ing.name}</span>
                                    <div className="flex items-center gap-1 w-24">
                                        <Input 
                                            className={cn("h-6 text-xs px-1 text-right", isModified && "border-amber-500 text-amber-600 font-medium")}
                                            type="number"
                                            value={currentAmount}
                                            onChange={(e) => handleIngredientChange(ing.id, e.target.value)}
                                        />
                                        <span className="w-6 text-muted-foreground">{ing.unit}</span>
                                    </div>
                                    {isModified && (
                                         <Button 
                                            variant="ghost" size="icon" className="h-5 w-5 shrink-0"
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
                        <div className="space-y-1">
                             <Label className="text-xs text-muted-foreground">Tools</Label>
                             <div className="flex flex-wrap gap-1">
                                {tools.map(tool => (
                                    <span key={tool.id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">
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
