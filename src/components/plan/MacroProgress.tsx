"use client"

interface MacroProgressProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color?: string; // Tailwind color class stub
}

export function MacroProgress({ label, current, target, unit = "g", color = "bg-primary" }: MacroProgressProps) {
  const percent = Math.min(100, Math.max(0, (current / target) * 100))
  
  return (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between w-full">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{current.toFixed(0)}/{target}{unit}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
         <div 
           className={`h-full ${color}`} 
           style={{ width: `${percent}%` }}
         />
      </div>
    </div>
  )
}
