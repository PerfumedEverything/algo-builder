"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Loader2, RefreshCw, Sparkles, Zap } from "lucide-react"
import Markdown from "react-markdown"

import type { AiGeneratedStrategy } from "@/core/types"
import type { BacktestResult } from "@/server/services"
import { runBacktestAction } from "@/server/actions/backtest-actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AiChat } from "./ai-chat"
import { BacktestPreview } from "./backtest-preview"
import { StrategyForm, type StrategyFormHandle } from "./strategy-form"
import { StrategyPreviewPanel } from "./strategy-preview-panel"
import { WizardStepIndicator } from "./wizard-step-indicator"

type WizardStep = "analysis" | "strategy" | "form"

type AiWizardDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  analyzeAction: () => Promise<{ success: boolean; data?: string; error?: string }>
  initialInstrument?: string
  onSuccess: () => void
  onCreateSignal?: () => void
}

const STEPS = ["Анализ", "Стратегия", "Настройка"]

const STEP_INDEX: Record<WizardStep, number> = {
  analysis: 0,
  strategy: 1,
  form: 2,
}

export const AiWizardDialog = ({
  open,
  onOpenChange,
  title,
  analyzeAction,
  initialInstrument,
  onSuccess,
  onCreateSignal,
}: AiWizardDialogProps) => {
  const [step, setStep] = useState<WizardStep>("analysis")
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [extractedStrategy, setExtractedStrategy] = useState<AiGeneratedStrategy | null>(null)
  const [chatKey, setChatKey] = useState(0)
  const [pendingFormData, setPendingFormData] = useState<AiGeneratedStrategy | null>(null)
  const [backtestResult, setBacktestResult] = useState<BacktestResult | undefined>(undefined)
  const [backtestLoading, setBacktestLoading] = useState(false)
  const [backtestError, setBacktestError] = useState<string | undefined>(undefined)
  const formRef = useRef<StrategyFormHandle>(null)

  const handleAnalyze = async () => {
    setAnalysisLoading(true)
    setAnalysisError(null)
    setAnalysisResult(null)

    const res = await analyzeAction()
    if (res.success && res.data) {
      setAnalysisResult(res.data)
    } else {
      setAnalysisError(res.error ?? "Ошибка анализа")
    }
    setAnalysisLoading(false)
  }

  useEffect(() => {
    if (!open) return
    setStep("analysis")
    setAnalysisResult(null)
    setAnalysisError(null)
    setAnalysisLoading(false)
    setExtractedStrategy(null)
    setBacktestResult(undefined)
    setBacktestError(undefined)
    setBacktestLoading(false)
    handleAnalyze()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleRedo = () => {
    handleAnalyze()
  }

  const handleProceedToStrategy = () => {
    setExtractedStrategy(null)
    setStep("strategy")
  }

  const handleBackToAnalysis = () => {
    setStep("analysis")
  }

  const handleStrategyGenerated = (strategy: AiGeneratedStrategy) => {
    setPendingFormData(strategy)
    setStep("form")
  }

  const handleStrategyCreated = async (strategyId?: string) => {
    onSuccess()
    if (!strategyId) return

    setBacktestResult(undefined)
    setBacktestError(undefined)
    setBacktestLoading(true)
    const toDate = new Date()
    const fromDate = new Date(toDate)
    fromDate.setMonth(fromDate.getMonth() - 3)

    const res = await runBacktestAction(strategyId, {
      fromDate,
      toDate,
      positionSize: 100000,
    })
    setBacktestLoading(false)
    if (res.success) {
      setBacktestResult(res.data)
    } else {
      setBacktestError(res.error ?? "Ошибка бэктеста")
    }
  }

  useEffect(() => {
    if (step === "form" && pendingFormData && formRef.current) {
      formRef.current.setGeneralFields({
        name: pendingFormData.name,
        instrument: initialInstrument ?? pendingFormData.instrument,
        instrumentType: pendingFormData.instrumentType as "STOCK" | "BOND" | "CURRENCY" | "FUTURES",
        timeframe: pendingFormData.timeframe,
        description: pendingFormData.description,
      })
      setPendingFormData(null)
    }
  }, [step, pendingFormData, initialInstrument])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] p-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <div className="mt-3">
            <WizardStepIndicator
              steps={STEPS}
              current={STEP_INDEX[step]}
              onStepClick={(i) => {
                if (i === 0) setStep("analysis")
                else if (i === 1 && analysisResult) handleProceedToStrategy()
              }}
            />
          </div>
        </DialogHeader>

        <div className="overflow-y-auto overflow-x-hidden min-h-[400px]">
          {step === "analysis" && (
            <div className="px-4 py-4 sm:px-6 sm:py-6 space-y-4">
              {analysisLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-3 text-sm text-muted-foreground">Анализирую...</span>
                </div>
              )}

              {analysisError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  {analysisError}
                </div>
              )}

              {analysisResult && (
                <>
                  <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_table]:w-full [&_table]:border-collapse [&_table]:table-fixed [&_td]:border [&_td]:border-border/50 [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs [&_td]:break-words [&_th]:border [&_th]:border-border/50 [&_th]:bg-muted/30 [&_th]:px-2 [&_th]:py-1 [&_th]:text-xs [&_th]:font-medium [&_th]:break-words [&_p]:break-words [&_strong]:break-words">
                    <Markdown>{analysisResult}</Markdown>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={analysisLoading}
                    onClick={handleRedo}
                    className="gap-1.5 text-muted-foreground"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Повторить анализ
                  </Button>

                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Что дальше?</p>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleProceedToStrategy}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                        Построить стратегию по анализу
                      </Button>
                      {onCreateSignal && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            onOpenChange(false)
                            onCreateSignal()
                          }}
                        >
                          <Zap className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          Настроить сигнал по анализу
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {step === "strategy" && (
            <div className="px-4 py-4 sm:px-6 sm:py-6 space-y-4">
              <button
                type="button"
                onClick={handleBackToAnalysis}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Вернуться к анализу
              </button>
              <AiChat
                key={chatKey}
                onGenerated={handleStrategyGenerated}
                onStrategyExtracted={setExtractedStrategy}
                analysisContext={analysisResult ?? undefined}
                instrumentContext={initialInstrument ? { ticker: initialInstrument, timeframe: "1h" } : undefined}
              />
              {extractedStrategy && <StrategyPreviewPanel strategy={extractedStrategy} />}
            </div>
          )}

          {step === "form" && (
            <div className="px-4 py-4 sm:px-6 sm:py-6 space-y-4">
              <button
                type="button"
                onClick={() => setStep("strategy")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Вернуться к AI помощнику
              </button>
              <StrategyForm
                ref={formRef}
                mode="create"
                onClose={() => onOpenChange(false)}
                onSuccess={handleStrategyCreated}
              />
              {(backtestLoading || backtestResult || backtestError) && (
                <BacktestPreview
                  result={backtestResult}
                  loading={backtestLoading}
                  error={backtestError}
                />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
