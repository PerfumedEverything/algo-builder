"use client"

import { motion } from "framer-motion"
import { type LucideIcon } from "lucide-react"

import { GlowingEffect } from "@/components/ui/glowing-effect"

type StatCardProps = {
  title: string
  value: string
  subtitle: string
  icon: LucideIcon
  iconColor?: string
  index?: number
}

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  index = 0,
}: StatCardProps) => {
  return (
    <motion.div
      className="relative rounded-xl border border-border bg-card p-3 lg:p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={2} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 lg:h-10 lg:w-10">
          <Icon className={`h-4 w-4 lg:h-5 lg:w-5 ${iconColor}`} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold lg:mt-3 lg:text-3xl">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
    </motion.div>
  )
}
