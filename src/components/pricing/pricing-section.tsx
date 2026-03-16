"use client"

import { useState } from "react"
import confetti from "canvas-confetti"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { usePlanStore } from "@/hooks/use-plan-store"
import { PricingCard } from "./pricing-card"

const plans = [
  {
    name: "Стартовый",
    description: "Идеально для начинающих трейдеров",
    price: { monthly: 0, yearly: 0 },
    features: [
      "Базовый конструктор стратегий",
      "5 ИИ-консультаций в день",
      "1 активная стратегия",
      "Сообщество трейдеров",
    ],
    limits: [
      { label: "Стратегий", value: 1 },
      { label: "ИИ сообщений/день", value: 5 },
    ],
  },
  {
    name: "Профессионал",
    description: "Для серьёзных трейдеров",
    price: { monthly: 2990, yearly: 28700 },
    features: [
      "Полный конструктор стратегий",
      "100 ИИ-консультаций в день",
      "До 10 стратегий",
      "Бэктестинг на истории",
      "Email-уведомления",
    ],
    limits: [
      { label: "Стратегий", value: 10 },
      { label: "ИИ сообщений/день", value: 100 },
      { label: "Бэктестинг", value: "Да" },
    ],
    isPopular: true,
    trialDays: 7,
  },
  {
    name: "Эксперт",
    description: "Максимальные возможности",
    price: { monthly: 7990, yearly: 76700 },
    features: [
      "Всё из тарифа Профессионал",
      "Безлимитные ИИ-консультации",
      "Неограниченные стратегии",
      "Приоритетная поддержка",
      "API доступ",
      "Персональный менеджер",
    ],
    limits: [
      { label: "Стратегий", value: "∞" },
      { label: "ИИ сообщений/день", value: "∞" },
      { label: "Бэктестинг", value: "Да" },
    ],
  },
]

export const PricingSection = () => {
  const [isYearly, setIsYearly] = useState(false)
  const { planName, setPlan } = usePlanStore()

  const handleToggle = (checked: boolean) => {
    setIsYearly(checked)
    if (checked) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    }
  }

  const handleSelect = (selectedPlan: string) => {
    setPlan(selectedPlan)
    toast.success(`Тариф "${selectedPlan}" активирован`)
    if (selectedPlan === "Эксперт") {
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } })
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center space-y-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Управление тарифом</h1>
        <p className="text-muted-foreground">
          Текущий тариф: <span className="font-medium text-foreground">{planName}</span>
        </p>
        <div className="flex items-center gap-3">
          <span className={cn(
            "w-[85px] text-right text-sm font-medium transition-colors",
            !isYearly ? "text-foreground" : "text-muted-foreground"
          )}>
            Помесячно
          </span>
          <Switch checked={isYearly} onCheckedChange={handleToggle} />
          <span className={cn(
            "text-sm font-medium transition-colors",
            isYearly ? "text-foreground" : "text-muted-foreground"
          )}>
            Годовой
          </span>
          <Badge
            variant="secondary"
            className={cn(
              "transition-all duration-300",
              isYearly ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"
            )}
          >
            -20%
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
        {plans.map((plan, index) => (
          <PricingCard
            key={plan.name}
            plan={{ ...plan, isCurrent: plan.name === planName }}
            isYearly={isYearly}
            index={index}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  )
}
