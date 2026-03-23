"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  TrendingUp,
  LayoutDashboard,
  Signal,
  Cable,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Wallet,
  BarChart3,
  Shield,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { logoutAction } from "@/server/actions/auth"
import { getCurrentUserRoleAction } from "@/server/actions/admin-actions"
import { useSidebarStore } from "@/hooks/use-sidebar-store"

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
}

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Рабочий стол", icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: "/strategies", label: "Стратегии", icon: <TrendingUp className="h-5 w-5" /> },
  { href: "/signals", label: "Сигналы", icon: <Signal className="h-5 w-5" /> },
  { href: "/portfolio", label: "Портфель", icon: <Wallet className="h-5 w-5" /> },
  { href: "/terminal", label: "Терминал", icon: <BarChart3 className="h-5 w-5" /> },
  { href: "/broker", label: "Брокеры", icon: <Cable className="h-5 w-5" /> },
  { href: "/settings", label: "Настройки", icon: <Settings className="h-5 w-5" /> },
]

const adminNav: NavItem = {
  href: "/admin",
  label: "Админ",
  icon: <Shield className="h-5 w-5" />,
}

export const Sidebar = () => {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebarStore()
  const [isMac, setIsMac] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes("MAC"))
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    getCurrentUserRoleAction().then((res) => {
      if (res.success) setIsAdmin(res.data.role === "ADMIN")
    })
  }, [])

  const handleLogout = async () => {
    try {
      await logoutAction()
    } catch {
      toast.error("Ошибка при выходе")
    }
  }

  const handleNavClick = () => {
    if (isMobile && !collapsed) toggle()
  }

  const shortcutLabel = isMac ? "⌘B" : "Ctrl+B"

  const navItems = isAdmin ? [...mainNav, adminNav] : mainNav

  return (
    <>
      {isMobile && !collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={toggle}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-[100dvh] flex-col border-r border-sidebar-border bg-sidebar-background transition-all duration-300",
          collapsed
            ? "w-[240px] -translate-x-full lg:w-[68px] lg:translate-x-0"
            : "w-[240px] translate-x-0 lg:w-[240px]"
        )}
      >
        <div className="group absolute -right-3 top-5 z-50 hidden lg:block">
          <button
            onClick={toggle}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-background text-sidebar-foreground/50 shadow-sm transition-all duration-200 hover:border-primary/50 hover:text-primary"
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </button>
          <div className="pointer-events-none absolute left-8 top-0 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <span className="whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-muted-foreground shadow-sm">
              {shortcutLabel}
            </span>
          </div>
        </div>

        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          {(!collapsed || isMobile) && (
            <span className="text-lg font-bold text-sidebar-foreground">
              AculaTrade
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <span className="shrink-0">{item.icon}</span>
                {(!collapsed || isMobile) && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-sidebar-border px-3 py-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {(!collapsed || isMobile) && <span>Выход</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
