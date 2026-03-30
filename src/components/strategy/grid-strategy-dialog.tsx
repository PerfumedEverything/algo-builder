"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, AlertCircle, ExternalLink } from "lucide-react"
import Link from "next/link"

import type { BrokerInstrument } from "@/core/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { InstrumentSelect } from "@/components/shared/instrument-select"
import { GridForm } from "@/app/(dashboard)/terminal/_components/grid-form"
import { getBrokerSettingsAction } from "@/server/actions/settings-actions"

type GridStrategyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export const GridStrategyDialog = ({ open, onOpenChange, onSuccess }: GridStrategyDialogProps) => {
  const [step, setStep] = useState<"select" | "form">("select")
  const [ticker, setTicker] = useState("")
  const [selectedInstrument, setSelectedInstrument] = useState<BrokerInstrument | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [bybitConnected, setBybitConnected] = useState<boolean | null>(null)

  useEffect(() => {
    if (open) {
      getBrokerSettingsAction().then((res) => {
        if (res.success) {
          setBybitConnected(res.data.brokerType === "BYBIT")
        } else {
          setBybitConnected(false)
        }
      })
    }
  }, [open])

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
          {bybitConnected === false ? (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Подключите Bybit для Grid Trading</p>
                    <p className="text-xs text-muted-foreground">
                      Grid Bot работает с реальными ордерами на криптобирже Bybit. Подключите API-ключи в настройках брокера.
                    </p>
                  </div>
                </div>
                <Link
                  href="/broker"
                  className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  onClick={() => onOpenChange(false)}
                >
                  Подключить Bybit
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : step === "select" ? (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Инструмент</Label>
                <InstrumentSelect
                  instrumentType="CRYPTO"
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
                instrumentType="CRYPTO"
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
