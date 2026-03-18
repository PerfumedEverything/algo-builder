"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  TrendingUp,
  Sparkles,
  Zap,
  Signal,
  Cable,
  Settings,
} from "lucide-react"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { FeatureCard } from "@/components/dashboard"
import { getSettingsAction } from "@/server/actions/settings-actions"

const sections = [
  {
    href: "/strategies",
    title: "Стратегии",
    description: "Создавайте и управляйте торговыми стратегиями",
    icon: TrendingUp,
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  {
    href: "/signals",
    title: "Сигналы",
    description: "Настройка и отслеживание сигналов",
    icon: Signal,
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
  },
  {
    href: "/broker",
    title: "API Интеграция",
    description: "Подключите брокерские счета",
    icon: Cable,
    iconBg: "bg-orange-500/20",
    iconColor: "text-orange-400",
  },
  {
    href: "/settings",
    title: "Настройки",
    description: "Профиль, MAX, уведомления",
    icon: Settings,
    iconBg: "bg-violet-500/20",
    iconColor: "text-violet-400",
  },
]

export default function DashboardPage() {
  const [userName, setUserName] = useState("")

  useEffect(() => {
    getSettingsAction().then((res) => {
      if (res.success && res.data.name) setUserName(res.data.name)
    })
  }, [])

  return (
    <div className="space-y-8">
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600/20 via-primary/15 to-blue-600/20 p-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent" />
        <div className="relative">
          <motion.div
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="h-4 w-4" />
            Добро пожаловать!
          </motion.div>
          <h1 className="text-3xl font-bold">Привет{userName ? `, ${userName}` : ""}!</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Создавайте умные торговые стратегии с помощью ИИ, тестируйте их и
            запускайте в реальной торговле
          </p>
          <div className="mt-6 flex items-center gap-2 text-sm font-medium text-foreground/80">
            <Zap className="h-4 w-4 text-primary" />
            Начните с выбора раздела ниже
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        <FeatureCard
          title="Ежедневные Обзоры Рынков"
          description="Получайте сводку ключевых событий, влияющих на мировые рынки"
          subtitle="Прочитать отчёт за 15 марта"
          ctaText="Запустить"
          icon={TrendingUp}
          gradient="linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 78, 59, 0.4) 100%)"
          index={0}
        />
        <FeatureCard
          title="Как начать работать за 3 шага?"
          description="Пройдите быстрый онбординг с ИИ-ассистентом, подключите брокера и создайте первую стратегию"
          ctaText="Начать"
          icon={Sparkles}
          gradient="linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(76, 29, 149, 0.4) 100%)"
          index={1}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((section, i) => (
          <motion.div
            key={section.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
          >
            <Link
              href={section.href}
              className="group relative flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent/50"
            >
              <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={2} />
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${section.iconBg}`}>
                <section.icon className={`h-6 w-6 ${section.iconColor}`} />
              </div>
              <div>
                <p className="font-semibold">{section.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {section.description}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
