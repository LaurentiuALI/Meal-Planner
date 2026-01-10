"use client"

import { AlertCircle, CheckCircle2, Info } from "lucide-react"

interface Insight {
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
}

interface InsightPanelProps {
  insights: Insight[];
  cookingStrategy?: string[];
}

export function InsightPanel({ insights, cookingStrategy }: InsightPanelProps) {
  if (insights.length === 0 && (!cookingStrategy || cookingStrategy.length === 0)) return null

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {insights.map((insight, i) => {
          let styles = "bg-gray-100 text-gray-800 border-gray-200"
          let Icon = Info
          
          if (insight.type === 'warning') {
            styles = "bg-red-50 text-red-900 border-red-200"
            Icon = AlertCircle
          } else if (insight.type === 'info') {
            styles = "bg-blue-50 text-blue-900 border-blue-200"
            Icon = Info
          } else if (insight.type === 'success') {
            styles = "bg-green-50 text-green-900 border-green-200"
            Icon = CheckCircle2
          }

          return (
            <div key={i} className={`flex w-full items-start gap-3 rounded-lg border p-3 text-sm ${styles}`}>
              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="grid gap-0.5">
                <h5 className="font-medium leading-none tracking-tight">
                  {insight.title}
                </h5>
                <div className="text-sm opacity-90">
                  {insight.message}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {cookingStrategy && cookingStrategy.length > 0 && (
        <div className="rounded-lg border bg-white p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
             👨‍🍳 Chef's Strategy
          </h3>
          <div className="text-sm space-y-2 text-muted-foreground">
            {cookingStrategy.map((step, i) => (
               <div key={i} dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}