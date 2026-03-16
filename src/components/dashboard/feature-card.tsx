"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
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
  index = 0,
}: FeatureCardProps) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isHovered) return
      const card = e.currentTarget
      const rect = card.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * 8
      const rotateX = -((e.clientY - centerY) / (rect.height / 2)) * 8
      setRotation({ x: rotateX, y: rotateY })
    },
    [isHovered]
  )

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    setRotation({ x: 0, y: 0 })
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.15, duration: 0.5 }}
      className="flex-1"
    >
      <div
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 p-6"
        style={{
          background: gradient,
          transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${isHovered ? 1.02 : 1})`,
          transition: isHovered ? "transform 0.15s ease-out" : "transform 0.5s ease-out",
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
      >
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
    </motion.div>
  )
}
