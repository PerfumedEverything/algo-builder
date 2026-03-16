"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PricingPlan = {
  name: string
  description: string
  price: { monthly: number; yearly: number }
  features: string[]
  limits: { label: string; value: string | number }[]
  isPopular?: boolean
  isCurrent?: boolean
  trialDays?: number
}

type PricingCardProps = {
  plan: PricingPlan
  isYearly: boolean
  index: number
  onSelect: (planName: string) => void
}

export const PricingCard = ({ plan, isYearly, index, onSelect }: PricingCardProps) => {
  const price = isYearly ? plan.price.yearly : plan.price.monthly
  const isFree = plan.price.monthly === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative"
    >
      <Card
        className={cn(
          "flex h-full flex-col p-6 transition-all duration-200",
          plan.isPopular && "border-primary shadow-lg shadow-primary/10",
          plan.isCurrent && "border-green-500/50 shadow-lg shadow-green-500/10"
        )}
      >
        {plan.isPopular && (
          <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground">
            Популярный
          </Badge>
        )}
        {plan.isCurrent && (
          <Badge className="absolute -top-2.5 left-4 bg-green-500 text-white">
            Текущий тариф
          </Badge>
        )}

        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={price}
                  initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={cn(
                    "inline-block text-4xl font-bold tabular-nums",
                    plan.isPopular && "text-primary"
                  )}
                >
                  {isFree ? "0" : price.toLocaleString("ru-RU")}
                </motion.span>
              </AnimatePresence>
              <span className="text-sm text-muted-foreground">&#8381;/мес</span>
            </div>
            {!isFree && (
              <p className="mt-1 text-xs text-muted-foreground">
                или {plan.price.yearly.toLocaleString("ru-RU")} &#8381;/год
              </p>
            )}
          </div>

          {plan.trialDays && (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
              {plan.trialDays} дней бесплатно
            </Badge>
          )}

          <ul className="space-y-2.5 pt-2">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {plan.limits.length > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              {plan.limits.map((limit) => (
                <div key={limit.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{limit.label}:</span>
                  <span className={cn(
                    "font-semibold",
                    plan.isPopular ? "text-primary" : "text-foreground"
                  )}>
                    {limit.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {plan.isCurrent ? (
          <Button className="mt-6 w-full" variant="outline" disabled>
            <Check className="mr-2 h-4 w-4" />
            Активен
          </Button>
        ) : (
          <Button
            className="mt-6 w-full"
            variant={plan.isPopular ? "default" : "outline"}
            onClick={() => onSelect(plan.name)}
          >
            Выбрать тариф
          </Button>
        )}
      </Card>
    </motion.div>
  )
}
