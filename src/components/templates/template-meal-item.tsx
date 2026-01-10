'use client';

import { TemplateMeal } from '@/types';
import { useTemplateStore } from '@/store/useTemplateStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface TemplateMealItemProps {
  meal: TemplateMeal;
}

export function TemplateMealItem({ meal }: TemplateMealItemProps) {
  const { deleteMeal } = useTemplateStore();

  // Helper to calculate recipe macros per 1 serving (if ingredients available)
  const getMacros = () => {
    if (!meal.recipe) return null;
    let p = 0, c = 0, f = 0, cal = 0;
    
    meal.recipe.steps.forEach(step => {
        step.ingredients.forEach(ri => {
            if (!ri.ingredient) return;
            const ratio = ri.amount / 100;
            p += ri.ingredient.macros.protein * ratio;
            c += ri.ingredient.macros.carbs * ratio;
            f += ri.ingredient.macros.fat * ratio;
            cal += ri.ingredient.macros.calories * ratio;
        });
    });

    return {
        p: Math.round(p * meal.servings),
        c: Math.round(c * meal.servings),
        f: Math.round(f * meal.servings),
        cal: Math.round(cal * meal.servings)
    };
  };

  const macros = getMacros();

  return (
    <Card className="p-2 relative group bg-background">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => deleteMeal(meal.id)}
      >
        <X className="w-3 h-3" />
      </Button>
      
      <div className="text-sm font-medium pr-6 truncate">
        {meal.recipe?.name || 'Unknown Recipe'}
      </div>
      
      <div className="text-xs text-muted-foreground mt-1">
        {meal.servings} serving(s) • {meal.slotName}
      </div>

      {macros && (
        <div className="flex gap-2 mt-2 text-[10px] text-muted-foreground font-mono">
            <span>{macros.cal}kcal</span>
            <span className="text-blue-500">P:{macros.p}</span>
            <span className="text-amber-500">C:{macros.c}</span>
            <span className="text-emerald-500">F:{macros.f}</span>
        </div>
      )}
    </Card>
  );
}
