"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { type LucideIcon, ArrowRight } from "lucide-react"

type QuickAccessCardProps = {
  href: string
  title: string
  description: string
  icon: LucideIcon
  index?: number
}

export const QuickAccessCard = ({
  href,
  title,
  description,
  icon: Icon,
  index = 0,
}: QuickAccessCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.05, duration: 0.4 }}
    >
      <Link
        href={href}
        className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </Link>
    </motion.div>
  )
}
