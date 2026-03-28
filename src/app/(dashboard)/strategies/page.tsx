"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, TrendingUp, SlidersHorizontal, ShieldCheck, X, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { toast } from "sonner"

import type { OperationStats, StrategyConfig } from "@/core/types"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { WarningBanner } from "@/components/ui/warning-banner"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { StrategyStats, StrategyCard, StrategyDialog, LaunchModeDialog } from "@/components/strategy"
import {
  getStrategiesAction,
  getStrategyStatsAction,
  deleteStrategyAction,
  updateStrategyAction,
  activateStrategyAction,
  deactivateStrategyAction,
} from "@/server/actions/strategy-actions"
import { getBrokerStatusAction } from "@/server/actions/broker-actions"
import { getBrokerSettingsAction } from "@/server/actions/settings-actions"
import { getOperationStatsForStrategiesAction } from "@/server/actions/operation-actions"
import type { StrategyRow } from "@/server/repositories/strategy-repository"
import { INSTRUMENT_TYPES, TIMEFRAMES } from "@/core/config/instruments"

type Strategy = StrategyRow
type Stats = { total: number; active: number; draft: number; paused: number }
type Filters = { status: string; instrumentType: string; timeframe: string }

const DEFAULT_FILTERS: Filters = { status: "", instrumentType: "", timeframe: "" }

export default function StrategiesPage() {
  const searchParams = useSearchParams()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, draft: 0, paused: 0 })
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editStrategy, setEditStrategy] = useState<Strategy | undefined>()
  const [brokerConnected, setBrokerConnected] = useState(true)
  const [launchDialogOpen, setLaunchDialogOpen] = useState(false)
  const [pendingLaunchId, setPendingLaunchId] = useState<string | null>(null)
  const [opsStatsMap, setOpsStatsMap] = useState<Record<string, OperationStats>>({})
  const [pricesMap, setPricesMap] = useState<Record<string, number>>({})
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [brokerType, setBrokerType] = useState<string>("TINKOFF")

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const portfolioSummary = useMemo(() => {
    const totalPortfolio = strategies.reduce((sum, s) => {
      const config = s.config as StrategyConfig
      return sum + (config.risks?.tradeAmount ?? 0)
    }, 0)
    const totalPnl = Object.values(opsStatsMap).reduce((sum, s) => sum + (s.pnl ?? 0), 0)
    const totalInitial = Object.values(opsStatsMap).reduce((sum, s) => sum + (s.initialAmount ?? 0), 0)
    const totalPnlPercent = totalInitial > 0 ? (totalPnl / totalInitial) * 100 : 0
    return { totalPortfolio, totalPnl, totalPnlPercent }
  }, [strategies, opsStatsMap])

  const fetchData = useCallback(async () => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (filters.status) params.status = filters.status

    const [strategiesRes, statsRes, brokerRes] = await Promise.all([
      getStrategiesAction(Object.keys(params).length ? params : undefined),
      getStrategyStatsAction(),
      getBrokerStatusAction(),
    ])
    if (strategiesRes.success) {
      const sorted = (strategiesRes.data as Strategy[]).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      setStrategies(sorted)
      const strategies = sorted
      const ids = strategies.map((s) => s.id)
      if (ids.length > 0) {
        const instrumentMap: Record<string, string> = {}
        strategies.forEach((s) => { instrumentMap[s.id] = s.instrument })
        const opsRes = await getOperationStatsForStrategiesAction(ids, instrumentMap)
        if (opsRes.success) {
          setOpsStatsMap(opsRes.data.stats)
          setPricesMap(opsRes.data.prices)
        }
      }
    }
    if (statsRes.success) setStats(statsRes.data)
    if (brokerRes.success) setBrokerConnected(brokerRes.data.connected)
  }, [search, filters])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    getBrokerSettingsAction().then((res) => {
      if (res.success) setBrokerType(res.data.brokerType)
    })
  }, [])

  useEffect(() => {
    const createFor = searchParams.get("createFor")
    if (createFor) {
      setEditStrategy(undefined)
      setDialogOpen(true)
      window.history.replaceState({}, "", "/strategies")
    }
  }, [searchParams])

  useEffect(() => {
    const interval = setInterval(fetchData, 10_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleEdit = (id: string) => {
    const strategy = strategies.find((s) => s.id === id)
    if (strategy) { setEditStrategy(strategy); setDialogOpen(true) }
  }

  const handleStatusChange = async (id: string, status: string) => {
    if (status === "ACTIVE") {
      if (!brokerConnected) {
        toast.error("Подключите брокера для запуска стратегии", {
          action: { label: "Подключить", onClick: () => window.location.href = "/broker" },
        })
        return
      }
      setPendingLaunchId(id)
      setLaunchDialogOpen(true)
      return
    }

    let result
    if (status === "PAUSED") {
      result = await deactivateStrategyAction(id)
    } else {
      result = await updateStrategyAction(id, { status: status as "DRAFT" | "ACTIVE" | "PAUSED" | "TRIGGERED" })
    }

    if (result.success) {
      const labels: Record<string, string> = {
        ACTIVE: "Стратегия запущена — мониторинг активен",
        PAUSED: "Стратегия остановлена",
        TRIGGERED: "Стратегия сработала",
      }
      toast.success(labels[status] ?? "Статус обновлён")
      fetchData()
    } else {
      toast.error(result.error)
    }
  }

  const handleLaunch = async () => {
    if (!pendingLaunchId) return
    setLaunchDialogOpen(false)
    const result = await activateStrategyAction(pendingLaunchId)
    if (result.success) {
      toast.success("Стратегия запущена — мониторинг активен")
      fetchData()
    } else {
      toast.error(result.error)
    }
    setPendingLaunchId(null)
  }

  const handleDelete = async (id: string) => {
    const result = await deleteStrategyAction(id)
    if (result.success) { toast.success("Стратегия удалена"); fetchData() }
    else toast.error(result.error)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Мои стратегии</h1>
          <p className="text-sm text-muted-foreground">Создавайте и управляйте торговыми стратегиями</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => {
          if (!brokerConnected) {
            toast.error("Сначала подключите брокера", {
              action: { label: "Подключить", onClick: () => window.location.href = "/broker" },
            })
            return
          }
          setEditStrategy(undefined)
          setDialogOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Новая стратегия
        </Button>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-sm">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
        <span className="text-muted-foreground">
          <span className="font-medium text-emerald-400">Безопасно.</span>{" "}
          API-доступ ограничен управлением позициями — вывод средств недоступен.
        </span>
      </div>

      {!brokerConnected && (
        <WarningBanner
          message="Брокер не подключён. Для реальной торговли подключите API T-Invest."
          linkText="Подключить"
          href="/broker"
        />
      )}

      <StrategyStats stats={stats} />

      {strategies.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Wallet className="h-3.5 w-3.5" />
              Размер портфеля стратегий
            </div>
            <p className="text-lg font-semibold">
              {portfolioSummary.totalPortfolio > 0
                ? `${portfolioSummary.totalPortfolio.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽`
                : "Нет позиций"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              {portfolioSummary.totalPnl >= 0
                ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                : <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />}
              Суммарный P&L
            </div>
            <p className={`text-lg font-semibold ${portfolioSummary.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {portfolioSummary.totalPnl >= 0 ? "+" : ""}
              {portfolioSummary.totalPnl.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              {portfolioSummary.totalPnlPercent >= 0
                ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                : <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />}
              P&L %
            </div>
            <p className={`text-lg font-semibold ${portfolioSummary.totalPnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {portfolioSummary.totalPnlPercent >= 0 ? "+" : ""}
              {portfolioSummary.totalPnlPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Поиск стратегий..."
        />
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative h-8 w-8 shrink-0 text-muted-foreground/70">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">Фильтры</span>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                >
                  <X className="mr-1 h-3 w-3" />
                  Сбросить
                </Button>
              )}
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Статус</label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? "" : v }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="ACTIVE">Активные</SelectItem>
                    <SelectItem value="DRAFT">Черновики</SelectItem>
                    <SelectItem value="PAUSED">На паузе</SelectItem>
                    <SelectItem value="TRIGGERED">Сработавшие</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Тип инструмента</label>
                <Select
                  value={filters.instrumentType || "all"}
                  onValueChange={(v) => setFilters((f) => ({ ...f, instrumentType: v === "all" ? "" : v }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    {INSTRUMENT_TYPES.map((t) => (
                      <SelectItem key={t.type} value={t.type}>{t.labelRu}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Таймфрейм</label>
                <Select
                  value={filters.timeframe || "all"}
                  onValueChange={(v) => setFilters((f) => ({ ...f, timeframe: v === "all" ? "" : v }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все таймфреймы</SelectItem>
                    {TIMEFRAMES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.status && (
            <Badge variant="outline" className="gap-1 text-xs">
              {filters.status}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters((f) => ({ ...f, status: "" }))} />
            </Badge>
          )}
          {filters.instrumentType && (
            <Badge variant="outline" className="gap-1 text-xs">
              {INSTRUMENT_TYPES.find((t) => t.type === filters.instrumentType)?.labelRu}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters((f) => ({ ...f, instrumentType: "" }))} />
            </Badge>
          )}
          {filters.timeframe && (
            <Badge variant="outline" className="gap-1 text-xs">
              {TIMEFRAMES.find((t) => t.value === filters.timeframe)?.label}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters((f) => ({ ...f, timeframe: "" }))} />
            </Badge>
          )}
        </div>
      )}

      {strategies.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 items-start">
          {strategies.map((strategy) => (
            <StrategyCard key={strategy.id} strategy={strategy} operationStats={opsStatsMap[strategy.id]} lastBuyPrice={opsStatsMap[strategy.id]?.lastBuyPrice} currentPrice={pricesMap[strategy.id]} expanded={expandedIds.has(strategy.id)} onToggleExpand={() => setExpandedIds((prev) => { const next = new Set(prev); if (next.has(strategy.id)) next.delete(strategy.id); else next.add(strategy.id); return next })} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} brokerType={brokerType} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="text-lg font-medium">Нет стратегий</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Создайте первую стратегию с помощью ИИ или вручную
          </p>
          <Button
            onClick={() => {
              if (!brokerConnected) {
                toast.error("Сначала подключите брокера", {
                  action: { label: "Подключить", onClick: () => window.location.href = "/broker" },
                })
                return
              }
              setEditStrategy(undefined)
              setDialogOpen(true)
            }}
            className="mt-4"
            variant="outline"
          >
            <Plus className="mr-2 h-4 w-4" />
            Создать стратегию
          </Button>
        </div>
      )}

      <StrategyDialog open={dialogOpen} onOpenChange={setDialogOpen} strategy={editStrategy} onSuccess={fetchData} />
      <LaunchModeDialog open={launchDialogOpen} onOpenChange={setLaunchDialogOpen} onLaunch={handleLaunch} />
    </div>
  )
}
