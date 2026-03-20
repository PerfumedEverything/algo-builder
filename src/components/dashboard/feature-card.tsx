"use client"

import { type LucideIcon, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

type FeatureCardProps = {
  title: string
  description: string
  subtitle?: string
  ctaText: string
  ctaHref?: string
  icon: LucideIcon
  gradient: string
  index?: number
}

export const FeatureCard = ({
  title,
  description,
  subtitle,
  ctaText,
  icon: Icon,
  gradient,
}: FeatureCardProps) => {
  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 p-6"
      style={{ background: gradient }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%)" }}
      />
      <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-between">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
          <h3 className="mb-2 text-xl font-bold text-white">{title}</h3>
          <p className="text-sm text-white/80">{description}</p>
          {subtitle && (
            <p className="mt-3 text-xs text-white/60">{subtitle}</p>
          )}
        </div>
        <Button
          className="mt-4 w-full gap-2 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
        >
          {ctaText}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  )
}
