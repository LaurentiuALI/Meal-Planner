'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface EfficiencyScoreProps {
  score: number;
}

export function EfficiencyScore({ score }: EfficiencyScoreProps) {
  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" /> Efficiency Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-800">
          {Math.round(score)}<span className="text-sm text-slate-400 font-normal">/100</span>
        </div>
      </CardContent>
    </Card>
  );
}
