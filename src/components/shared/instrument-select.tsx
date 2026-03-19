"use client"

import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import { ChevronsUpDown, Search, Loader2, TrendingUp } from "lucide-react"

import type { BrokerInstrument } from "@/core/types"
import { getInstrumentsAction, getInstrumentPriceAction } from "@/server/actions/broker-actions"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

type InstrumentSelectProps = {
  instrumentType: string
  value: string
  onChange: (ticker: string) => void
  onPriceChange?: (price: number | null) => void
}

export const InstrumentSelect = ({ instrumentType, value, onChange, onPriceChange }: InstrumentSelectProps) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [instruments, setInstruments] = useState<BrokerInstrument[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [price, setPrice] = useState<number | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const cacheRef = useRef<Record<string, BrokerInstrument[]>>({})

  const fetchInstruments = useCallback(async (type: string) => {
    if (cacheRef.current[type]) {
      setInstruments(cacheRef.current[type])
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await getInstrumentsAction(type)
      if (res.success) {
        cacheRef.current[type] = res.data
        setInstruments(res.data)
      } else {
        setError(res.error ?? "Ошибка загрузки")
      }
    } catch {
      setError("Ошибка загрузки инструментов")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPrice = useCallback(async (ticker: string) => {
    if (!ticker) { setPrice(null); return }
    setPriceLoading(true)
    try {
      const res = await getInstrumentPriceAction(ticker)
      if (res.success) {
        setPrice(res.data.price)
        onPriceChange?.(res.data.price)
      } else {
        setPrice(null)
        onPriceChange?.(null)
      }
    } catch {
      setPrice(null)
    } finally {
      setPriceLoading(false)
    }
  }, [])

  useEffect(() => {
    if (instrumentType) fetchInstruments(instrumentType)
  }, [instrumentType, fetchInstruments])

  useEffect(() => {
    fetchPrice(value)
  }, [value, fetchPrice])

  useEffect(() => {
    if (!value) return
    const interval = setInterval(() => fetchPrice(value), 10_000)
    return () => clearInterval(interval)
  }, [value, fetchPrice])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setSearch("")
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!search) return instruments.slice(0, 100)
    const q = search.toLowerCase()
    return instruments
      .filter((i) => i.ticker.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))
      .slice(0, 100)
  }, [instruments, search])

  const selected = instruments.find((i) => i.ticker.toUpperCase() === value.toUpperCase())
  const displayValue = selected ? `${selected.ticker} — ${selected.name}` : value || "Выберите инструмент"

  const formatPrice = (p: number) => {
    return p.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{displayValue}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" sideOffset={4} collisionPadding={8}>
          <div className="flex items-center border-b border-border px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по тикеру или названию..."
              className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
            />
          </div>

          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="px-3 py-4 text-center text-sm text-red-400">{error}</div>
          )}

          {!loading && !error && (
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Инструменты не найдены
                </div>
              ) : (
                <div className="p-1">
                  {filtered.map((instrument) => (
                    <button
                      key={instrument.figi}
                      type="button"
                      onClick={() => {
                        onChange(instrument.ticker)
                        setOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                        value.toUpperCase() === instrument.ticker.toUpperCase()
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-mono font-medium">{instrument.ticker}</span>
                        <span className="ml-2 truncate text-muted-foreground">{instrument.name}</span>
                      </div>
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground uppercase">
                        {instrument.currency}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {value && (
        <div className="flex items-center gap-1.5 text-xs">
          <TrendingUp className="h-3 w-3 text-emerald-400" />
          {priceLoading ? (
            <span className="text-muted-foreground">Загрузка курса...</span>
          ) : price !== null ? (
            <span className="font-mono text-foreground">
              {formatPrice(price)} <span className="text-muted-foreground">₽</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Курс недоступен</span>
          )}
        </div>
      )}
    </div>
  )
}
