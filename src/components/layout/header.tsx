"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Gift, HelpCircle, Crown, Menu, Sparkles, User, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePlanStore } from "@/hooks/use-plan-store"
import { useSidebarStore } from "@/hooks/use-sidebar-store"
import { getSettingsAction } from "@/server/actions/settings-actions"

type PlanTier = "starter" | "pro" | "expert"

const tierConfig: Record<PlanTier, {
  icon: React.ReactNode
  className: string
  badgeClass: string
}> = {
  starter: {
    icon: <Zap className="h-3.5 w-3.5" />,
    className: "text-muted-foreground hover:text-foreground",
    badgeClass: "border-border",
  },
  pro: {
    icon: <Sparkles className="h-3.5 w-3.5" />,
    className: "text-primary",
    badgeClass: "border-primary/30 bg-primary/5",
  },
  expert: {
    icon: <Crown className="h-3.5 w-3.5 text-amber-400" />,
    className: "text-amber-400",
    badgeClass: "border-amber-400/30 bg-amber-400/5 shadow-[0_0_12px_rgba(251,191,36,0.15)]",
  },
}

export const Header = () => {
  const { planName, planTier } = usePlanStore()
  const { toggle } = useSidebarStore()
  const config = tierConfig[planTier]
  const [userName, setUserName] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    const res = await getSettingsAction()
    if (res.success) setUserName(res.data.name || res.data.email?.split("@")[0] || null)
  }, [])

  useEffect(() => { fetchUser() }, [fetchUser])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm lg:px-6">
      <button
        onClick={toggle}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-1.5 lg:gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-emerald-500/50 px-2 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 lg:px-3"
        >
          <Gift className="h-4 w-4" />
          <span className="hidden lg:inline">Приведи друга</span>
        </Button>

        <Link href="/faq">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </Link>

        <div className="hidden items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm md:flex">
          <span className="font-semibold">0 &#8381;</span>
          <span className="text-muted-foreground">+0</span>
          <span className="ml-1 text-xs text-muted-foreground">Объём торгов</span>
        </div>

        <Link href="/pricing">
          <div
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 transition-all hover:scale-[1.02]",
              config.badgeClass
            )}
          >
            {config.icon}
            <div className="flex flex-col">
              <span className="text-[10px] leading-none text-muted-foreground">Тариф</span>
              <span className={cn("text-sm font-semibold leading-tight", config.className)}>
                {planName}
              </span>
            </div>
          </div>
        </Link>

        <Link href="/settings">
          <div className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 transition-colors hover:bg-accent lg:px-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="hidden text-sm font-medium md:inline">{userName ?? "..."}</span>
          </div>
        </Link>
      </div>
    </header>
  )
}
