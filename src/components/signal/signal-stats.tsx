"use client"

import { Signal, Zap, TrendingUp, TrendingDown } from "lucide-react"

import { StatCard } from "@/components/dashboard"

type SignalStatsProps = {
  stats: {
    total: number
    active: number
    inactive: number
    buy: number
    sell: number
  }
}

export const SignalStats = ({ stats }: SignalStatsProps) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Всего сигналов"
        value={String(stats.total)}
        subtitle="За все время"
        icon={Signal}
        index={0}
      />
      <StatCard
        title="Активных"
        value={String(stats.active)}
        subtitle="Мониторинг включен"
        icon={Zap}
        iconColor="text-emerald-400"
        index={1}
      />
      <StatCard
        title="На покупку"
        value={String(stats.buy)}
        subtitle="BUY сигналы"
        icon={TrendingUp}
        iconColor="text-blue-400"
        index={2}
      />
      <StatCard
        title="На продажу"
        value={String(stats.sell)}
        subtitle="SELL сигналы"
        icon={TrendingDown}
        iconColor="text-orange-400"
        index={3}
      />
    </div>
  )
}
