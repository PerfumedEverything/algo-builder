"use client"

import { useEffect, useMemo, useState } from "react"

import { Sidebar, Header } from "@/components/layout"
import { SupportBanner } from "@/components/layout/support-banner"
import { BackgroundPlus } from "@/components/ui/background-plus"
import { useSidebarStore } from "@/hooks/use-sidebar-store"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { collapsed, toggle } = useSidebarStore()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile && !collapsed) {
        useSidebarStore.setState({ collapsed: true })
      }
    }
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const shortcuts = useMemo(() => [
    { key: "b", handler: toggle },
  ], [toggle])

  useKeyboardShortcuts(shortcuts)

  const marginLeft = isMobile ? 0 : collapsed ? 68 : 240

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div
        className="flex flex-1 flex-col transition-all duration-300"
        style={{ marginLeft }}
      >
        <Header />
        <main className="relative flex-1 p-4 lg:p-6">
          <BackgroundPlus
            className="fixed inset-0 opacity-30"
            plusColor="#2962FF"
            plusSize={60}
            fade
          />
          <div className="relative z-10 pb-16">{children}</div>
          <div className="relative z-10 mt-auto px-0 pb-6 space-y-3">
            <SupportBanner />
            <p className="text-center text-[11px] text-muted-foreground/50">
              Не является индивидуальной инвестиционной рекомендацией. Торговля на финансовых рынках сопряжена с риском потери капитала.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
