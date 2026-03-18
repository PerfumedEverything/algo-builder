"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, TrendingUp, SlidersHorizontal, ShieldCheck, X } from "lucide-react"
import { toast } from "sonner"

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
import { StrategyStats, StrategyCard, StrategyDialog } from "@/components/strategy"
import {
  getStrategiesAction,
  getStrategyStatsAction,
  deleteStrategyAction,
  updateStrategyAction,
  activateStrategyAction,
  deactivateStrategyAction,
} from "@/server/actions/strategy-actions"
import { getBrokerStatusAction } from "@/server/actions/broker-actions"
import type { StrategyRow } from "@/server/repositories/strategy-repository"
import { INSTRUMENT_TYPES, TIMEFRAMES } from "@/core/config/instruments"

type Strategy = StrategyRow
type Stats = { total: number; active: number; draft: number; archived: number }
type Filters = { status: string; instrumentType: string; timeframe: string }

const DEFAULT_FILTERS: Filters = { status: "", instrumentType: "", timeframe: "" }

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, draft: 0, archived: 0 })
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editStrategy, setEditStrategy] = useState<Strategy | undefined>()
  const [brokerConnected, setBrokerConnected] = useState(true)

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const fetchData = useCallback(async () => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (filters.status) params.status = filters.status

    const [strategiesRes, statsRes, brokerRes] = await Promise.all([
      getStrategiesAction(Object.keys(params).length ? params : undefined),
      getStrategyStatsAction(),
      getBrokerStatusAction(),
    ])
    if (strategiesRes.success) setStrategies(strategiesRes.data as Strategy[])
    if (statsRes.success) setStats(statsRes.data)
    if (brokerRes.success) setBrokerConnected(brokerRes.data.connected)
  }, [search, filters])

  useEffect(() => { fetchData() }, [fetchData])

  const handleEdit = (id: string) => {
    const strategy = strategies.find((s) => s.id === id)
    if (strategy) { setEditStrategy(strategy); setDialogOpen(true) }
  }

  const handleStatusChange = async (id: string, status: string) => {
    let result
    if (status === "ACTIVE") {
      result = await activateStrategyAction(id)
    } else if (status === "PAUSED") {
      result = await deactivateStrategyAction(id)
    } else {
      result = await updateStrategyAction(id, { status: status as "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED" })
    }

    if (result.success) {
      const labels: Record<string, string> = {
        ACTIVE: "Стратегия запущена — мониторинг активен",
        PAUSED: "Стратегия остановлена",
        ARCHIVED: "Стратегия в архиве",
      }
      toast.success(labels[status] ?? "Статус обновлён")
      fetchData()
    } else {
      toast.error(result.error)
    }
  }

  const handleDelete = async (id: string) => {
    const result = await deleteStrategyAction(id)
    if (result.success) { toast.success("Стратегия удалена"); fetchData() }
    else toast.error(result.error)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Мои стратегии</h1>
          <p className="text-sm text-muted-foreground">Создавайте и управляйте торговыми стратегиями</p>
        </div>
        <Button onClick={() => { setEditStrategy(undefined); setDialogOpen(true) }}>
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
                    <SelectItem value="ARCHIVED">В архиве</SelectItem>
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
        <div className="grid gap-3 sm:grid-cols-2">
          {strategies.map((strategy) => (
            <StrategyCard key={strategy.id} strategy={strategy} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
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
            onClick={() => { setEditStrategy(undefined); setDialogOpen(true) }}
            className="mt-4"
            variant="outline"
          >
            <Plus className="mr-2 h-4 w-4" />
            Создать стратегию
          </Button>
        </div>
      )}

      <StrategyDialog open={dialogOpen} onOpenChange={setDialogOpen} strategy={editStrategy} onSuccess={fetchData} />
    </div>
  )
}
