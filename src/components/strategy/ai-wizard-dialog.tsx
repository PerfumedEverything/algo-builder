"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, RefreshCw, Sparkles, Zap } from "lucide-react"
import Markdown from "react-markdown"

import type { AiGeneratedStrategy } from "@/core/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AiChat } from "./ai-chat"
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
    handleAnalyze()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleRedo = () => {
    handleAnalyze()
  }

  const handleProceedToStrategy = () => {
    setStep("strategy")
  }

  const handleStrategyGenerated = (strategy: AiGeneratedStrategy) => {
    formRef.current?.setGeneralFields({
      name: strategy.name,
      instrument: initialInstrument ?? strategy.instrument,
      instrumentType: strategy.instrumentType as "STOCK" | "BOND" | "CURRENCY" | "FUTURES",
      timeframe: strategy.timeframe,
      description: strategy.description,
    })
    setStep("form")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] p-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <div className="mt-3">
            <WizardStepIndicator steps={STEPS} current={STEP_INDEX[step]} />
          </div>
        </DialogHeader>

        <div className="overflow-y-auto min-h-[400px]">
          <div className={step !== "analysis" ? "hidden" : undefined}>
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
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border/50 [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs [&_th]:border [&_th]:border-border/50 [&_th]:bg-muted/30 [&_th]:px-2 [&_th]:py-1 [&_th]:text-xs [&_th]:font-medium">
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
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleProceedToStrategy}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Построить стратегию по анализу
                      </Button>
                      {onCreateSignal && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            onOpenChange(false)
                            onCreateSignal()
                          }}
                        >
                          <Zap className="h-3.5 w-3.5 mr-1.5" />
                          Настроить сигнал по анализу
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={step !== "strategy" ? "hidden" : undefined}>
            <div className="px-4 py-4 sm:px-6 sm:py-6 space-y-4">
              <AiChat
                onGenerated={handleStrategyGenerated}
                onStrategyExtracted={setExtractedStrategy}
                initialContext={analysisResult ?? undefined}
              />
              {extractedStrategy && <StrategyPreviewPanel strategy={extractedStrategy} />}
            </div>
          </div>

          <div className={step !== "form" ? "hidden" : undefined}>
            <div className="px-4 py-4 sm:px-6 sm:py-6 space-y-4">
              <button
                type="button"
                onClick={() => setStep("strategy")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                вернуться к AI помощнику
              </button>
              <StrategyForm
                ref={formRef}
                mode="create"
                onClose={() => onOpenChange(false)}
                onSuccess={onSuccess}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
