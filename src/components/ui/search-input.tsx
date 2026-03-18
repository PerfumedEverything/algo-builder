"use client"

import { useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export const SearchInput = ({ value, onChange, placeholder = "Поиск...", className }: SearchInputProps) => {
  const [focused, setFocused] = useState(false)
  const [isMac, setIsMac] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes("MAC"))
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const modifier = isMac ? e.metaKey : e.ctrlKey
      if (modifier && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur()
        onChange("")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isMac, onChange])

  const isExpanded = focused || value.length > 0

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={cn(
        "flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2 transition-[width,border-color,background-color] duration-300",
        isExpanded
          ? "w-48 border-border"
          : "w-auto border-border/60 hover:border-border hover:bg-accent/50",
        className
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />

      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={cn(
          "bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 transition-[width,opacity] duration-300",
          isExpanded ? "w-full opacity-100" : "w-0 opacity-0"
        )}
      />

      {!isExpanded && (
        <span className="hidden shrink-0 items-center gap-0.5 sm:inline-flex">
          {isMac ? (
            <>
              <kbd className="flex h-5 w-5 items-center justify-center rounded border border-border/50 bg-muted/40 font-mono text-[13px] text-muted-foreground">⌘</kbd>
              <kbd className="flex h-5 w-5 items-center justify-center rounded border border-border/50 bg-muted/40 font-mono text-[11px] text-muted-foreground">K</kbd>
            </>
          ) : (
            <kbd className="flex h-5 items-center justify-center rounded border border-border/50 bg-muted/40 px-1.5 font-mono text-[10px] text-muted-foreground">Ctrl+K</kbd>
          )}
        </span>
      )}

      {isExpanded && !value && (
        <kbd className="inline-flex h-5 shrink-0 items-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-semibold text-foreground/60">
          Esc
        </kbd>
      )}
    </div>
  )
}
