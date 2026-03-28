"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Cable, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
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
  getHealthScoreAction,
} from "@/server/actions/analytics-actions"
import { getFullPortfolioAiAnalysisAction } from "@/server/actions/analytics-ai-prompt"
import { PortfolioHealthService } from "@/server/services/portfolio-health-service"
import { CorrelationHeatmap } from "@/components/portfolio/correlation-heatmap"
import { CorrelationWarnings } from "@/components/portfolio/correlation-warnings"
import { SectorDonut } from "@/components/portfolio/sector-donut"
import { AssetTypeChart } from "@/components/portfolio/asset-type-chart"
import { TradeSuccessChart } from "@/components/portfolio/trade-success-chart"
import { ConcentrationCard } from "@/components/portfolio/concentration-card"
import { BenchmarkCard } from "@/components/portfolio/benchmark-card"
import { DividendYieldCard } from "@/components/portfolio/dividend-yield-card"
import { InstrumentPnlTable } from "@/components/portfolio/instrument-pnl-table"
import { HealthScoreCard } from "@/components/portfolio/health-score-card"
import { DiversificationAdviceList } from "@/components/portfolio/diversification-advice"
import { AiAnalysisButton } from "@/components/portfolio/ai-analysis-button"
import type {
  Portfolio,
  CorrelationMatrix,
  PortfolioAnalytics,
  HealthScore,
  DiversificationAdvice,
  CorrelationWarning,
  EnhancedBenchmarkComparison,
} from "@/core/types"

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
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null)
  const [diversificationAdvice, setDiversificationAdvice] = useState<DiversificationAdvice[]>([])
  const [correlationWarnings, setCorrelationWarnings] = useState<CorrelationWarning[]>([])
  const [enhancedBenchmark, setEnhancedBenchmark] = useState<EnhancedBenchmarkComparison | null>(null)

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
    try {
      const [corrRes, analyticsRes, healthRes] = await Promise.all([
        getCorrelationMatrixAction(correlationPeriod),
        getPortfolioAnalyticsAction(),
        getHealthScoreAction(),
      ])

      if (corrRes.success && corrRes.data) {
        setCorrelationMatrix(corrRes.data)
        setCorrelationWarnings(
          PortfolioHealthService.generateCorrelationWarnings(corrRes.data.highPairs),
        )
      }

      if (analyticsRes.success && analyticsRes.data) {
        setPortfolioAnalytics(analyticsRes.data)

        if (portfolio?.positions) {
          setDiversificationAdvice(
            PortfolioHealthService.generateDiversificationAdvice(
              portfolio.positions,
              analyticsRes.data.concentration,
              analyticsRes.data.sectorAllocation,
            ),
          )
        }

        if (analyticsRes.data.benchmarkComparison) {
          setEnhancedBenchmark(
            PortfolioHealthService.enhanceBenchmark(analyticsRes.data.benchmarkComparison),
          )
        }
      }

      if (healthRes.success && healthRes.data) {
        setHealthScore(healthRes.data)
      }
    } finally {
      setAnalyticsLoading(false)
    }
  }, [correlationPeriod, portfolio?.positions])

  const handleCorrelationPeriodChange = useCallback(async (days: number) => {
    setCorrelationPeriod(days)
    setCorrelationLoading(true)
    try {
      const res = await getCorrelationMatrixAction(days)
      if (res.success && res.data) {
        setCorrelationMatrix(res.data)
        setCorrelationWarnings(
          PortfolioHealthService.generateCorrelationWarnings(res.data.highPairs),
        )
      }
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
              <HealthScoreCard data={healthScore} loading={analyticsLoading} />
              <BenchmarkCard
                data={portfolioAnalytics?.benchmarkComparison ?? null}
                enhancedData={enhancedBenchmark}
                loading={analyticsLoading}
              />
              <DividendYieldCard
                data={portfolioAnalytics?.aggregateDividendYield ?? { weightedYield: 0, positionYields: [] }}
                loading={analyticsLoading}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <CorrelationHeatmap
                  matrix={correlationMatrix ?? { tickers: [], matrix: [], highPairs: [] }}
                  loading={analyticsLoading || correlationLoading}
                  period={correlationPeriod}
                  onPeriodChange={handleCorrelationPeriodChange}
                />
                <CorrelationWarnings
                  warnings={correlationWarnings}
                  loading={analyticsLoading || correlationLoading}
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
              <div className="space-y-4">
                <ConcentrationCard
                  data={portfolioAnalytics?.concentration ?? { hhi: 0, level: "diversified", dominantPositions: [] }}
                  loading={analyticsLoading}
                />
                <DiversificationAdviceList
                  advice={diversificationAdvice}
                  loading={analyticsLoading}
                />
              </div>
              <div className="space-y-4">
                <TradeSuccessChart
                  data={portfolioAnalytics?.tradeSuccessBreakdown ?? { profitable: { count: 0, totalPnl: 0 }, unprofitable: { count: 0, totalPnl: 0 }, breakEven: { count: 0 }, byInstrument: [] }}
                  loading={analyticsLoading}
                />
                <InstrumentPnlTable
                  data={portfolioAnalytics?.tradeSuccessBreakdown?.byInstrument ?? []}
                  loading={analyticsLoading}
                />
              </div>
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
