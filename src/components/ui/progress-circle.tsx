"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressCircleProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  label?: string
  showValue?: boolean
}

export function ProgressCircle({
  value,
  max = 100,
  size = 64,
  strokeWidth = 6,
  color = "text-primary",
  trackColor = "text-muted",
  label,
  showValue = true,
  className,
  ...props
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={cn("flex flex-col items-center gap-1", className)} {...props}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          {/* Track */}
          <circle
            className={trackColor}
            stroke="currentColor"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress */}
          <circle
            className={cn("transition-all duration-500 ease-in-out", color)}
            stroke="currentColor"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        {showValue && (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {Math.round(value)}
            </div>
        )}
      </div>
      {label && <span className="text-[10px] font-medium text-muted-foreground uppercase">{label}</span>}
    </div>
  )
}
