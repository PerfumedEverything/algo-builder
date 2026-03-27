"use client"

import type { QuickAction } from "@/server/providers/ai/types"

type QuickActionButtonsProps = {
  actions: QuickAction[]
  onAction: (action: QuickAction) => void
}

export const QuickActionButtons = ({ actions, onAction }: QuickActionButtonsProps) => (
  <div className="mt-2 flex flex-wrap gap-1.5">
    {actions.map((action) => (
      <button
        key={action.action}
        type="button"
        className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/20"
        onClick={() => onAction(action)}
      >
        {action.label}
      </button>
    ))}
  </div>
)
