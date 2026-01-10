'use client';

import { useState, useEffect } from 'react';
import { PlanTemplate } from '@/types';
import { useTemplateStore } from '@/store/useTemplateStore';
import { useRecipeStore } from '@/store/useRecipeStore';
import { useIngredientStore } from '@/store/useIngredientStore';
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Calendar, Plus, CheckCircle2 } from 'lucide-react';
import { TemplateDayCard } from './template-day-card';
import { ApplyPlanDialog } from './apply-plan-dialog';
import { EfficiencyScore } from './efficiency-score';
import { InsightPanel } from './insight-panel';
import { useDebounce } from '@/hooks/use-debounce';
import { generatePlanInsights } from '@/lib/insight-engine';
import { calculateRecipeMacros, evaluateRecipeBadges } from '@/lib/badges';

interface TemplateEditorProps {
  template: PlanTemplate;
}

export function TemplateEditor({ template }: TemplateEditorProps) {
  const { addDay, toggleActive } = useTemplateStore();
  const { recipes } = useRecipeStore();
  const { ingredients } = useIngredientStore();
  
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  
  // Analysis State
  const [insights, setInsights] = useState<any[]>([]);
  const [score, setScore] = useState(0);

  // Debounce template for analysis
  const debouncedTemplate = useDebounce(template, 1000);

  useEffect(() => {
    if (debouncedTemplate.days.length === 0) return;
    
    // 1. Aggregate all meals from the template
    // We map TemplateMeal to the structure expected by analysis (Meal)
    const allMeals = debouncedTemplate.days.flatMap(day => 
        day.meals.map(tm => ({
            id: tm.id,
            planId: 'temp',
            recipeId: tm.recipeId,
            servings: tm.servings,
            sortOrder: tm.sortOrder,
            slotName: tm.slotName
        }))
    );

    const fakePlan: any = {
        id: 'template-analysis',
        date: new Date().toISOString(),
        meals: allMeals
    };

    // 2. Generate Insights
    const generatedInsights = generatePlanInsights(fakePlan, recipes, ingredients);
    setInsights(generatedInsights);

    // 3. Calculate Score
    // Base 100.
    // -5 per Bad Badge per recipe
    // +2 per Good Badge per recipe
    // -10 per Insight Warning/Error
    
    let calcScore = 100;
    
    // Badge Impact
    allMeals.forEach(m => {
        const recipe = recipes.find(r => r.id === m.recipeId);
        if (recipe) {
            const macros = calculateRecipeMacros(recipe, ingredients);
            const badges = evaluateRecipeBadges(recipe, macros);
            
            badges.forEach(b => {
                if (b.type === 'error' || b.type === 'warning') calcScore -= 5;
                if (b.type === 'success') calcScore += 2;
            });
        }
    });

    // Insight Impact
    generatedInsights.forEach(i => {
        if (i.type === 'error') calcScore -= 10;
        if (i.type === 'warning') calcScore -= 5;
    });

    setScore(Math.max(0, Math.min(100, calcScore)));

  }, [debouncedTemplate, recipes, ingredients]);


  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <header className="border-b p-4 flex items-center justify-between bg-background sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {template.name}
              {template.isActive && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            </h1>
            <p className="text-sm text-muted-foreground">
              {template.days.length} Days defined
            </p>
          </div>
          
          <div className="flex items-center space-x-2 border-l pl-4 ml-4">
            <Switch 
                id="active-mode" 
                checked={template.isActive}
                onCheckedChange={(checked: boolean) => toggleActive(template.id, checked)}
            />
            <Label htmlFor="active-mode">Active Plan</Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => addDay(`Day ${template.days.length + 1}`)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Day
          </Button>
          <Button onClick={() => setIsApplyOpen(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            Apply to Schedule
          </Button>
        </div>
      </header>
      
      {/* Dashboard Area */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
         <EfficiencyScore score={score} />
         <div className="md:col-span-3">
            <InsightPanel insights={insights} />
         </div>
      </div>

      {/* Content - Horizontal Scroll for Days */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6">
        <div className="flex h-full gap-6 pb-4">
          {template.days.map((day) => (
            <TemplateDayCard key={day.id} day={day} />
          ))}
          
          {/* Empty State / Add Day Placeholder */}
          {template.days.length === 0 && (
             <div className="w-80 h-full border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground bg-muted/5">
               <div className="text-center">
                 <p>No days added yet.</p>
                 <Button variant="link" onClick={() => addDay("Day 1")}>Add your first day</Button>
               </div>
             </div>
          )}
        </div>
      </div>

      <ApplyPlanDialog 
        open={isApplyOpen} 
        onOpenChange={setIsApplyOpen} 
        template={template} 
      />
    </div>
  );
}