"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

type WizardStepIndicatorProps = {
  steps: string[]
  current: number
}

export const WizardStepIndicator = ({ steps, current }: WizardStepIndicatorProps) => (
  <div className="flex items-center justify-center gap-0">
    {steps.map((label, i) => (
      <div key={i} className="flex items-center">
        <div className="flex flex-col items-center gap-1">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all",
              i < current && "bg-primary text-primary-foreground",
              i === current && "bg-blue-600 text-white ring-2 ring-blue-600/30",
              i > current && "border border-border text-muted-foreground",
            )}
          >
            {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span
            className={cn(
              "text-[10px]",
              i === current ? "text-foreground font-medium" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
        </div>
        {i < steps.length - 1 && (
          <div className="mb-5 h-px w-12 bg-border" />
        )}
      </div>
    ))}
  </div>
)
