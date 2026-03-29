"use client"

import { useState } from "react"
import { ChevronLeft } from "lucide-react"

import type { BrokerInstrument } from "@/core/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InstrumentSelect } from "@/components/shared/instrument-select"
import { GridForm } from "@/app/(dashboard)/terminal/_components/grid-form"
import { INSTRUMENT_TYPES } from "@/core/config/instruments"

type SelectedInstrument = {
  ticker: string
  instrumentId: string
  instrumentType: string
  currentPrice: number
}

type GridStrategyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export const GridStrategyDialog = ({ open, onOpenChange, onSuccess }: GridStrategyDialogProps) => {
  const [step, setStep] = useState<"select" | "form">("select")
  const [instrumentType, setInstrumentType] = useState("STOCK")
  const [ticker, setTicker] = useState("")
  const [selectedInstrument, setSelectedInstrument] = useState<BrokerInstrument | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)

  const handleReset = () => {
    setStep("select")
    setTicker("")
    setSelectedInstrument(null)
    setCurrentPrice(null)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) handleReset()
    onOpenChange(open)
  }

  const handleContinue = () => {
    if (ticker && currentPrice !== null && currentPrice > 0) {
      setStep("form")
    }
  }

  const handleGridSuccess = () => {
    handleReset()
    onOpenChange(false)
    onSuccess()
  }

  const formInstrumentId = selectedInstrument?.figi ?? ticker

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] p-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 shrink-0">
          <div className="flex items-center gap-2">
            {step === "form" && (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Назад
              </button>
            )}
            <DialogTitle>Новый Grid Bot</DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-4 pb-4 sm:px-6 sm:pb-6 overflow-y-auto">
          {step === "select" ? (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Тип инструмента</Label>
                <Select
                  value={instrumentType}
                  onValueChange={(v) => { setInstrumentType(v); setTicker(""); setSelectedInstrument(null); setCurrentPrice(null) }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUMENT_TYPES.map((t) => (
                      <SelectItem key={t.type} value={t.type}>{t.labelRu}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Инструмент</Label>
                <InstrumentSelect
                  instrumentType={instrumentType}
                  value={ticker}
                  onChange={setTicker}
                  onInstrumentSelect={setSelectedInstrument}
                  onPriceChange={setCurrentPrice}
                  showPrice={true}
                />
              </div>
              {ticker && currentPrice !== null && currentPrice > 0 && (
                <button
                  type="button"
                  className="w-full rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                  onClick={handleContinue}
                >
                  Продолжить с {ticker}
                </button>
              )}
            </div>
          ) : (
            <div className="pt-2">
              <GridForm
                instrument={ticker}
                instrumentId={formInstrumentId}
                instrumentType={instrumentType}
                currentPrice={currentPrice ?? 0}
                onSuccess={handleGridSuccess}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
