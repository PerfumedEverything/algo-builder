"use client"

import { TrendingUp, Zap, FileText, Archive } from "lucide-react"

import { StatCard } from "@/components/dashboard"

type StrategyStatsProps = {
  stats: {
    total: number
    active: number
    draft: number
    archived: number
  }
}

export const StrategyStats = ({ stats }: StrategyStatsProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        title="Всего стратегий"
        value={String(stats.total)}
        subtitle="За все время"
        icon={TrendingUp}
        index={0}
      />
      <StatCard
        title="Активных"
        value={String(stats.active)}
        subtitle="Работают сейчас"
        icon={Zap}
        iconColor="text-emerald-400"
        index={1}
      />
      <StatCard
        title="Черновиков"
        value={String(stats.draft)}
        subtitle="В разработке"
        icon={FileText}
        iconColor="text-yellow-400"
        index={2}
      />
      <StatCard
        title="В архиве"
        value={String(stats.archived)}
        subtitle="Неактивные"
        icon={Archive}
        iconColor="text-muted-foreground"
        index={3}
      />
    </div>
  )
}
