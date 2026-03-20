"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Cable, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PortfolioView } from "@/components/broker"
import {
  getBrokerStatusAction,
  getPortfolioAction,
} from "@/server/actions/broker-actions"
import type { Portfolio } from "@/core/types"

export default function PortfolioPage() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const statusRes = await getBrokerStatusAction()
      if (!statusRes.success) return

      setConnected(statusRes.data.connected)
      if (statusRes.data.connected) {
        const portfolioRes = await getPortfolioAction()
        if (portfolioRes.success && portfolioRes.data) {
          setPortfolio(portfolioRes.data)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!connected) return
    const interval = setInterval(async () => {
      const res = await getPortfolioAction()
      if (res.success && res.data) setPortfolio(res.data)
    }, 10_000)
    return () => clearInterval(interval)
  }, [connected])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Портфель</h1>
        <p className="text-sm text-muted-foreground">Позиции и доходность вашего брокерского счёта</p>
      </div>

      {!connected ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Wallet className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">Брокер не подключён</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Подключите брокера для отображения портфеля
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/broker">
              <Cable className="mr-2 h-4 w-4" />
              Подключить брокера
            </Link>
          </Button>
        </div>
      ) : portfolio ? (
        <PortfolioView portfolio={portfolio} />
      ) : (
        <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
          <p className="text-sm text-muted-foreground">Нет данных портфеля</p>
        </div>
      )}
    </div>
  )
}
