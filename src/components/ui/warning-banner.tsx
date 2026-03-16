"use client"

import Link from "next/link"
import { AlertCircle, ArrowRight } from "lucide-react"

type WarningBannerProps = {
  message: string
  linkText: string
  href: string
}

export const WarningBanner = ({ message, linkText, href }: WarningBannerProps) => {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-sm">
      <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
      <span className="flex-1 text-muted-foreground">{message}</span>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-amber-400 transition-colors hover:text-amber-300"
      >
        {linkText}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}
