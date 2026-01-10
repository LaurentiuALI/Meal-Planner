'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToolSelector } from './tool-selector';
import { SmartIngredientRow } from './smart-ingredient-row';
import { useIngredientStore } from '@/store/useIngredientStore';
import { RecipeStep, RecipeIngredient } from '@/types';
import { Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Simplified type for form state
export interface FormStep {
  id?: string;
  description: string;
  ingredients: RecipeIngredient[];
  toolIds: string[];
}

interface RecipeStepEditorProps {
  step: FormStep;
  index: number;
  onChange: (updates: Partial<FormStep>) => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function RecipeStepEditor({ 
  step, 
  index, 
  onChange, 
  onRemove,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown
}: RecipeStepEditorProps) {
  const { ingredients: allIngredients } = useIngredientStore();

  const handleIngredientChange = (idx: number, updates: { ingredientId?: string; amount?: number }) => {
    const newIngredients = [...step.ingredients];
    newIngredients[idx] = { ...newIngredients[idx], ...updates };
    
    // Ghost row logic
    if (idx === newIngredients.length - 1 && updates.ingredientId) {
        newIngredients.push({ ingredientId: "", amount: 0 });
    }
    
    onChange({ ingredients: newIngredients });
  };

  const removeIngredient = (idx: number) => {
    onChange({ ingredients: step.ingredients.filter((_, i) => i !== idx) });
  };

  return (
    <Card className="mb-4 border-l-4 border-l-primary/20">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                </div>
                <Label className="font-semibold text-base">Step {index + 1}</Label>
            </div>
            <div className="flex gap-1">
                <Button variant="ghost" size="icon" disabled={isFirst} onClick={onMoveUp}>
                    <ChevronUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" disabled={isLast} onClick={onMoveDown}>
                    <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={onRemove}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>

        <div className="space-y-2">
            <Label>Instructions</Label>
            <Textarea 
                value={step.description}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Describe what to do in this step..."
                className="min-h-[80px]"
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Tools Needed</Label>
                <ToolSelector 
                    selectedIds={step.toolIds}
                    onChange={(ids) => onChange({ toolIds: ids })}
                />
            </div>

            <div className="space-y-2">
                <Label>Ingredients Used</Label>
                <div className="space-y-2">
                    {step.ingredients.map((ri, idx) => {
                        const isGhost = idx === step.ingredients.length - 1 && !ri.ingredientId;
                        return (
                            <SmartIngredientRow
                                key={idx}
                                ingredientId={ri.ingredientId}
                                amount={ri.amount}
                                allIngredients={allIngredients}
                                onChange={(updates) => handleIngredientChange(idx, updates)}
                                onRemove={() => removeIngredient(idx)}
                                isGhost={isGhost}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
