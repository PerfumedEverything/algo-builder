"use client"

import { useEffect } from "react"

type Shortcut = {
  key: string
  handler: () => void
}

export const useKeyboardShortcuts = (shortcuts: Shortcut[]) => {
  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().includes("MAC")

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return

      const modifier = isMac ? e.metaKey : e.ctrlKey

      for (const shortcut of shortcuts) {
        if (modifier && e.key.toLowerCase() === shortcut.key.toLowerCase()) {
          e.preventDefault()
          shortcut.handler()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts])
}
