'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat } from "lucide-react";

interface Insight {
  type: string;
  title: string;
  message: string;
}

interface InsightPanelProps {
  insights: Insight[];
  isLoading?: boolean;
}

export function InsightPanel({ insights, isLoading }: InsightPanelProps) {
  return (
    <Card className="border-indigo-100 bg-white h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-indigo-600 flex items-center gap-2">
           <ChefHat className="h-4 w-4" /> Planner Agent Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
             <div className="text-sm text-muted-foreground animate-pulse">Analyzing plan...</div>
        ) : insights.length > 0 ? (
           <div className="grid gap-2">
             {insights.map((insight, i) => (
               <div key={i} className="flex gap-2 text-sm items-start">
                 <span className="text-indigo-400 mt-1">•</span>
                 <span className="text-slate-700"><strong>{insight.title}:</strong> {insight.message}</span>
               </div>
             ))}
           </div>
        ) : (
          <div className="text-sm text-muted-foreground italic">
            Add meals to generate insights.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
