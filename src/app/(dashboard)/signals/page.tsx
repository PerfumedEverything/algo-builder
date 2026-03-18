"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Signal, SlidersHorizontal, X } from "lucide-react"
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
import { SignalStats, SignalCard, SignalDialog } from "@/components/signal"
import {
  getSignalsAction,
  getSignalStatsAction,
  deleteSignalAction,
  toggleSignalAction,
} from "@/server/actions/signal-actions"
import { getSettingsAction } from "@/server/actions/settings-actions"
import type { SignalRow } from "@/server/repositories/signal-repository"
import { TIMEFRAMES } from "@/core/config/instruments"

type Stats = { total: number; active: number; inactive: number; buy: number; sell: number }
type Filters = { signalType: string; isActive: string; timeframe: string }

const DEFAULT_FILTERS: Filters = { signalType: "", isActive: "", timeframe: "" }

export default function SignalsPage() {
  const [signals, setSignals] = useState<SignalRow[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, buy: 0, sell: 0 })
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editSignal, setEditSignal] = useState<SignalRow | undefined>()
  const [telegramConfigured, setTelegramConfigured] = useState(true)

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const fetchData = useCallback(async () => {
    const params: Record<string, string | boolean> = {}
    if (search) params.search = search
    if (filters.signalType) params.signalType = filters.signalType
    if (filters.isActive) params.isActive = filters.isActive === "true"

    const [signalsRes, statsRes, settingsRes] = await Promise.all([
      getSignalsAction(Object.keys(params).length ? params as Record<string, string> : undefined),
      getSignalStatsAction(),
      getSettingsAction(),
    ])
    if (signalsRes.success) setSignals(signalsRes.data as SignalRow[])
    if (statsRes.success) setStats(statsRes.data)
    if (settingsRes.success) setTelegramConfigured(!!settingsRes.data.telegramChatId)
  }, [search, filters])

  useEffect(() => { fetchData() }, [fetchData])

  const handleEdit = (id: string) => {
    const signal = signals.find((s) => s.id === id)
    if (signal) { setEditSignal(signal); setDialogOpen(true) }
  }

  const handleToggle = async (id: string) => {
    const result = await toggleSignalAction(id)
    if (result.success) {
      toast.success(result.data.isActive ? "Сигнал включён" : "Сигнал отключён")
      fetchData()
    } else {
      toast.error(result.error)
    }
  }

  const handleDelete = async (id: string) => {
    const result = await deleteSignalAction(id)
    if (result.success) { toast.success("Сигнал удалён"); fetchData() }
    else toast.error(result.error)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Мои сигналы</h1>
          <p className="text-sm text-muted-foreground">Настройте уведомления по условиям рынка</p>
        </div>
        <Button onClick={() => { setEditSignal(undefined); setDialogOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Новый сигнал
        </Button>
      </div>

      {!telegramConfigured && (
        <WarningBanner
          message="Telegram не настроен. Уведомления о сигналах не будут отправляться."
          linkText="Настроить"
          href="/settings"
        />
      )}

      <SignalStats stats={stats} />

      <div className="flex items-center justify-end gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Поиск сигналов..."
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
                <label className="text-xs text-muted-foreground">Тип сигнала</label>
                <Select
                  value={filters.signalType || "all"}
                  onValueChange={(v) => setFilters((f) => ({ ...f, signalType: v === "all" ? "" : v }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="BUY">Покупка (BUY)</SelectItem>
                    <SelectItem value="SELL">Продажа (SELL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Статус</label>
                <Select
                  value={filters.isActive || "all"}
                  onValueChange={(v) => setFilters((f) => ({ ...f, isActive: v === "all" ? "" : v }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="true">Активные</SelectItem>
                    <SelectItem value="false">Отключённые</SelectItem>
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
          {filters.signalType && (
            <Badge variant="outline" className="gap-1 text-xs">
              {filters.signalType}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters((f) => ({ ...f, signalType: "" }))} />
            </Badge>
          )}
          {filters.isActive && (
            <Badge variant="outline" className="gap-1 text-xs">
              {filters.isActive === "true" ? "Активные" : "Отключённые"}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters((f) => ({ ...f, isActive: "" }))} />
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

      {signals.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {signals.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onEdit={handleEdit}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Signal className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="text-lg font-medium">Нет сигналов</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Создайте первый сигнал для мониторинга рынка
          </p>
          <Button
            onClick={() => { setEditSignal(undefined); setDialogOpen(true) }}
            className="mt-4"
            variant="outline"
          >
            <Plus className="mr-2 h-4 w-4" />
            Создать сигнал
          </Button>
        </div>
      )}

      <SignalDialog open={dialogOpen} onOpenChange={setDialogOpen} signal={editSignal} onSuccess={fetchData} />
    </div>
  )
}
