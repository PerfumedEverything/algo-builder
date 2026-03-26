"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Cable, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PortfolioView, PaperPortfolioView } from "@/components/broker"
import {
  getBrokerStatusAction,
  getPortfolioAction,
} from "@/server/actions/broker-actions"
import { getDepositsAction, type DepositData } from "@/server/actions/deposit-actions"
import {
  getCorrelationMatrixAction,
  getPortfolioAnalyticsAction,
  getMarkowitzOptimizationAction,
  getFullPortfolioAiAnalysisAction,
} from "@/server/actions/analytics-actions"
import { CorrelationHeatmap } from "@/components/portfolio/correlation-heatmap"
import { SectorDonut } from "@/components/portfolio/sector-donut"
import { AssetTypeChart } from "@/components/portfolio/asset-type-chart"
import { TradeSuccessChart } from "@/components/portfolio/trade-success-chart"
import { ConcentrationCard } from "@/components/portfolio/concentration-card"
import { BenchmarkCard } from "@/components/portfolio/benchmark-card"
import { DividendYieldCard } from "@/components/portfolio/dividend-yield-card"
import { InstrumentPnlTable } from "@/components/portfolio/instrument-pnl-table"
import { MarkowitzComparison } from "@/components/portfolio/markowitz-comparison"
import { RebalancingActions } from "@/components/portfolio/rebalancing-actions"
import { AiAnalysisButton } from "@/components/portfolio/ai-analysis-button"
import type { Portfolio, CorrelationMatrix, PortfolioAnalytics, MarkowitzResult } from "@/core/types"

export default function PortfolioPage() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [deposits, setDeposits] = useState<DepositData | null>(null)

  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [correlationLoading, setCorrelationLoading] = useState(false)
  const [correlationMatrix, setCorrelationMatrix] = useState<CorrelationMatrix | null>(null)
  const [portfolioAnalytics, setPortfolioAnalytics] = useState<PortfolioAnalytics | null>(null)
  const [correlationPeriod, setCorrelationPeriod] = useState(90)
  const [markowitzResult, setMarkowitzResult] = useState<MarkowitzResult | null>(null)
  const [markowitzLoading, setMarkowitzLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const statusRes = await getBrokerStatusAction()
      if (!statusRes.success) return

      setConnected(statusRes.data.connected)
      if (statusRes.data.connected) {
        const [portfolioRes, depositsRes] = await Promise.all([
          getPortfolioAction(),
          getDepositsAction(),
        ])
        if (portfolioRes.success && portfolioRes.data) {
          setPortfolio(portfolioRes.data)
        }
        if (depositsRes.success) {
          setDeposits(depositsRes.data)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    setMarkowitzLoading(true)
    try {
      const [corrRes, analyticsRes, markowitzRes] = await Promise.all([
        getCorrelationMatrixAction(correlationPeriod),
        getPortfolioAnalyticsAction(),
        getMarkowitzOptimizationAction(),
      ])
      if (corrRes.success && corrRes.data) setCorrelationMatrix(corrRes.data)
      if (analyticsRes.success && analyticsRes.data) setPortfolioAnalytics(analyticsRes.data)
      if (markowitzRes.success) setMarkowitzResult(markowitzRes.data ?? null)
    } finally {
      setAnalyticsLoading(false)
      setMarkowitzLoading(false)
    }
  }, [correlationPeriod])

  const handleCorrelationPeriodChange = useCallback(async (days: number) => {
    setCorrelationPeriod(days)
    setCorrelationLoading(true)
    try {
      const res = await getCorrelationMatrixAction(days)
      if (res.success && res.data) setCorrelationMatrix(res.data)
    } finally {
      setCorrelationLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!connected) return
    const interval = setInterval(async () => {
      if (document.hidden) return
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Портфель</h1>
          <p className="text-sm text-muted-foreground">Позиции и доходность</p>
        </div>
        {connected && (
          <Select defaultValue="tinkoff">
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tinkoff">T-Invest</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="broker">
        <TabsList>
          <TabsTrigger value="broker">Брокерский портфель</TabsTrigger>
          <TabsTrigger value="paper">Тестовая торговля</TabsTrigger>
          {connected && (
            <TabsTrigger value="analytics" onClick={() => { if (!correlationMatrix && !portfolioAnalytics) fetchAnalytics() }}>
              Аналитика
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="broker" className="mt-4">
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
            <PortfolioView portfolio={portfolio} deposits={deposits ?? undefined} />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
              <p className="text-sm text-muted-foreground">Нет данных портфеля</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="paper" className="mt-4">
          <PaperPortfolioView />
        </TabsContent>

        {connected && (
          <TabsContent value="analytics" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <ConcentrationCard
                data={portfolioAnalytics?.concentration ?? { hhi: 0, level: "diversified", dominantPositions: [] }}
                loading={analyticsLoading}
              />
              <BenchmarkCard
                data={portfolioAnalytics?.benchmarkComparison ?? null}
                loading={analyticsLoading}
              />
              <DividendYieldCard
                data={portfolioAnalytics?.aggregateDividendYield ?? { weightedYield: 0, positionYields: [] }}
                loading={analyticsLoading}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <CorrelationHeatmap
                  matrix={correlationMatrix ?? { tickers: [], matrix: [], highPairs: [] }}
                  loading={analyticsLoading || correlationLoading}
                  period={correlationPeriod}
                  onPeriodChange={handleCorrelationPeriodChange}
                />
              </div>
              <div className="flex flex-col gap-4">
                <SectorDonut
                  data={portfolioAnalytics?.sectorAllocation ?? []}
                  loading={analyticsLoading}
                />
                <AssetTypeChart
                  data={portfolioAnalytics?.assetTypeBreakdown ?? []}
                  loading={analyticsLoading}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TradeSuccessChart
                data={portfolioAnalytics?.tradeSuccessBreakdown ?? { profitable: { count: 0, totalPnl: 0 }, unprofitable: { count: 0, totalPnl: 0 }, breakEven: { count: 0 }, byInstrument: [] }}
                loading={analyticsLoading}
              />
              <InstrumentPnlTable
                data={portfolioAnalytics?.tradeSuccessBreakdown?.byInstrument ?? []}
                loading={analyticsLoading}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <MarkowitzComparison
                data={markowitzResult}
                loading={analyticsLoading || markowitzLoading}
              />
              <RebalancingActions
                actions={markowitzResult?.rebalancingActions ?? []}
                loading={analyticsLoading || markowitzLoading}
              />
            </div>
            <div className="flex justify-center">
              <AiAnalysisButton
                title="Комплексный анализ портфеля"
                triggerLabel="Полный AI-анализ портфеля"
                triggerLabelMobile="AI-анализ"
                analyzeAction={getFullPortfolioAiAnalysisAction}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
