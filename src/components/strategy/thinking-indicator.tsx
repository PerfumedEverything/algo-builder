"use client"

import { Loader2 } from "lucide-react"

type ThinkingIndicatorProps = {
  thinkingContent: string
}

export const ThinkingIndicator = ({ thinkingContent }: ThinkingIndicatorProps) => (
  <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
    <Loader2 className="h-3.5 w-3.5 animate-spin" />
    <span>Анализирую...</span>
    {thinkingContent && (
      <details className="ml-2">
        <summary className="cursor-pointer text-xs">Ход мысли</summary>
        <p className="mt-1 max-h-32 overflow-y-auto text-xs opacity-70">{thinkingContent}</p>
      </details>
    )}
  </div>
)
