'use client';

import { useMemo, useEffect, useState } from 'react';
import { PlanTemplate, TemplateMeal } from '@/types';
import { useTemplateStore } from '@/store/useTemplateStore';
import { useRecipeStore } from '@/store/useRecipeStore';
import { useIngredientStore } from '@/store/useIngredientStore';
import { useSlotStore } from '@/store/useSlotStore';
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Calendar, Plus, CheckCircle2, ChevronRight, BarChart3 } from 'lucide-react';
import { TemplateDayCard } from './template-day-card';
import { ApplyPlanDialog } from './apply-plan-dialog';
import { EfficiencyScore } from './efficiency-score';
import { InsightPanel } from './insight-panel';
import { useDebounce } from '@/hooks/use-debounce';
import { generatePlanInsights } from '@/lib/insight-engine';
import { calculateRecipeMacros, evaluateRecipeBadges } from '@/lib/badges';
import { 
  DndContext, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  KeyboardSensor, 
  closestCorners, 
  DragStartEvent, 
  DragEndEvent 
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { TemplateMealItem } from './template-meal-item';
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose
} from "@/components/ui/drawer"

interface TemplateEditorProps {
  template: PlanTemplate;
  mobileNavTrigger?: React.ReactNode;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    
    // Initial check
    setMatches(media.matches)

    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [query])

  return matches
}

export function TemplateEditor({ template, mobileNavTrigger }: TemplateEditorProps) {
  const { addDay, toggleActive, moveMeal } = useTemplateStore();
  const { recipes } = useRecipeStore();
  const { ingredients } = useIngredientStore();
  const { slots, loadSlots } = useSlotStore();
  const isMobile = useMediaQuery("(max-width: 768px)")
  
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<TemplateMeal | null>(null);

  // Debounce template for analysis
  const debouncedTemplate = useDebounce(template, 1000);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Analysis State (Derived)
  const { insights, score } = useMemo(() => {
    if (debouncedTemplate.days.length === 0) return { insights: [], score: 0 };
    
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

    const fakePlan = {
        id: 'template-analysis',
        date: new Date().toISOString(),
        meals: allMeals
    } as unknown as import('@/types').DayPlan;

    // 2. Generate Insights
    const generatedInsights = generatePlanInsights(fakePlan, recipes, ingredients);

    // 3. Calculate Score
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

    return { 
        insights: generatedInsights, 
        score: Math.max(0, Math.min(100, calcScore)) 
    };

  }, [debouncedTemplate, recipes, ingredients]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const mealId = event.active.id as string;
    for (const day of template.days) {
      const meal = day.meals.find(m => m.id === mealId);
      if (meal) {
        setActiveDragItem(meal);
        return;
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // Identify Source
    const sourceDay = template.days.find(d => d.meals.some(m => m.id === activeId));
    const sourceMeal = sourceDay?.meals.find(m => m.id === activeId);
    if (!sourceDay || !sourceMeal) return;

    // Identify Target
    // overId can be:
    // 1. A Slot ID: "dayId::slotName" (Dropping into empty or non-empty slot container)
    // 2. A Meal ID: (Dropping onto another meal)
    
    let targetDayId: string | undefined;
    let targetSlotName: string | undefined;
    let targetIndex: number = 0;

    if (overId.includes('::')) {
        // Dropped on a Slot
        const parts = overId.split('::');
        targetDayId = parts[0];
        targetSlotName = parts[1];
        
        // Append to end of slot? Or start? 
        // If just dropping on container, usually append.
        // We need to know how many items in that slot to append.
        const targetDay = template.days.find(d => d.id === targetDayId);
        const mealsInSlot = targetDay?.meals.filter(m => m.slotName === targetSlotName) || [];
        targetIndex = mealsInSlot.length; 

    } else {
        // Dropped on a Meal
        const targetMealId = overId;
        const targetDay = template.days.find(d => d.meals.some(m => m.id === targetMealId));
        if (!targetDay) return; // Should not happen

        const targetMeal = targetDay.meals.find(m => m.id === targetMealId);
        if (!targetMeal) return;

        targetDayId = targetDay.id;
        targetSlotName = targetMeal.slotName;
        
        // Calculate new index based on targetMeal's sortOrder
        // If dragging down, we might want targetIndex + 1?
        // Simple approach: Take target's index.
        targetIndex = targetMeal.sortOrder; 
    }

    if (targetDayId && targetSlotName) {
        moveMeal(activeId, targetDayId, targetSlotName, targetIndex);
    }
  };

  return (
    <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
    >
        <div className="flex flex-col h-full bg-slate-50/50">
        {/* Header */}
        <header className="border-b p-4 flex items-center justify-between bg-background sticky top-0 z-10 shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {isMobile && mobileNavTrigger && (
                    <div className="mr-2 shrink-0">
                        {mobileNavTrigger}
                    </div>
                )}
                
                <div className="min-w-0">
                    <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2 truncate">
                    {template.name}
                    {template.isActive && <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-500 shrink-0" />}
                    </h1>
                    {!isMobile && (
                        <p className="text-sm text-muted-foreground">
                        {template.days.length} Days defined
                        </p>
                    )}
                </div>
                
                {/* Desktop Switch */}
                <div className="hidden md:flex items-center space-x-2 border-l pl-4 ml-4 shrink-0">
                    <Switch 
                        id="active-mode" 
                        checked={template.isActive}
                        onCheckedChange={(checked: boolean) => toggleActive(template.id, checked)}
                    />
                    <Label htmlFor="active-mode">Active Plan</Label>
                </div>
            </div>

            <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => addDay(`Day ${template.days.length + 1}`)}>
                <Plus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Add Day</span>
            </Button>
            <Button size="sm" onClick={() => setIsApplyOpen(true)}>
                <Calendar className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Apply to Schedule</span>
            </Button>
            </div>
        </header>
        
        {/* Desktop Dashboard Area - Collapsible */}
        {!isMobile && (
            <div className="px-4 md:px-6 pt-4 shrink-0">
                <details className="group" open={true}>
                    <summary className="flex items-center gap-2 font-medium cursor-pointer list-none text-sm text-muted-foreground mb-2 outline-none">
                        <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                        <span>Insights & Efficiency</span>
                    </summary>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <EfficiencyScore score={score} />
                        <div className="md:col-span-3">
                            <InsightPanel insights={insights} />
                        </div>
                    </div>
                </details>
            </div>
        )}

                        {/* Content Area */}
                        <div className={cn("flex-1 overflow-x-hidden overflow-y-hidden px-4 md:px-6 min-h-0 flex flex-col", isMobile ? "pb-0" : "pb-6")}>
                            {isMobile ? (
                                /* Mobile Carousel View */
                                <div className="flex-1 flex flex-col justify-center min-h-0">
                                    {template.days.length > 0 ? (
                                        <Carousel className="w-full flex-1 min-h-0" opts={{ align: 'center' }}>
                                            <CarouselContent className="h-full">                                {template.days.map((day) => (
                                    <CarouselItem key={day.id} className="h-full">
                                        <div className="p-1 h-full">
                                            <TemplateDayCard day={day} slots={slots} mode="mobile" className="w-full" />
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <div className="flex justify-center mt-2 gap-2">
                                <CarouselPrevious className="static transform-none" />
                                <div className="text-xs text-muted-foreground self-center">Swipe to navigate</div>
                                <CarouselNext className="static transform-none" />
                            </div>
                        </Carousel>
                    ) : (
                        <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/5 m-4">
                             <div className="text-center">
                                <p>No days added yet.</p>
                                <Button variant="link" onClick={() => addDay("Day 1")}>Add your first day</Button>
                            </div>
                        </div>
                    )}
                 </div>
            ) : (
                /* Desktop Horizontal Scroll View */
                <div className="flex-1 overflow-x-auto overflow-y-hidden">
                    <div className="flex h-full gap-4 md:gap-6 pb-4">
                        {template.days.map((day) => (
                            <TemplateDayCard key={day.id} day={day} slots={slots} mode="desktop" />
                        ))}
                        
                        {/* Empty State / Add Day Placeholder */}
                        {template.days.length === 0 && (
                            <div className="w-[85vw] md:w-80 h-full border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground bg-muted/5">
                            <div className="text-center">
                                <p>No days added yet.</p>
                                <Button variant="link" onClick={() => addDay("Day 1")}>Add your first day</Button>
                            </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
        
        {/* Mobile Floating Action / Drawer for Insights */}
        {isMobile && (
             <div className="p-4 bg-background border-t shrink-0">
                <Drawer>
                    <DrawerTrigger asChild>
                        <Button className="w-full" variant="outline">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Insights & Efficiency ({score}%)
                        </Button>
                    </DrawerTrigger>
                    <DrawerContent>
                        <DrawerHeader>
                            <DrawerTitle>Plan Efficiency: {score}%</DrawerTitle>
                            <DrawerDescription>Review AI-generated insights for your meal plan.</DrawerDescription>
                        </DrawerHeader>
                        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                            <EfficiencyScore score={score} />
                            <InsightPanel insights={insights} />
                        </div>
                        <DrawerFooter>
                            <DrawerClose asChild>
                                <Button variant="outline">Close</Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
             </div>
        )}

        <ApplyPlanDialog 
            open={isApplyOpen} 
            onOpenChange={setIsApplyOpen} 
            template={template} 
        />

        <DragOverlay>
            {activeDragItem ? (
                <div className="opacity-80 rotate-2">
                   <TemplateMealItem meal={activeDragItem} />
                </div>
            ) : null}
        </DragOverlay>
        </div>
    </DndContext>
  );
}
