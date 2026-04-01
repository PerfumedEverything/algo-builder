"use client"

import { useState, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createGridAction, suggestGridParamsAction } from "@/server/actions/grid-actions"
import { calculateGridLevels } from "@/lib/grid-calculator"
import type { GridDistribution } from "@/core/types/grid"

const LOOKBACK_OPTIONS = [
  { label: '7 дней', value: 7 },
  { label: '30 дней', value: 30 },
  { label: '180 дней', value: 180 },
]

const gridFormSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  lowerPrice: z.number().positive('Должно быть > 0'),
  upperPrice: z.number().positive('Должно быть > 0'),
  gridLevels: z.number().int().min(3, 'Минимум 3').max(100, 'Максимум 100'),
  amountPerOrder: z.number().positive('Должно быть > 0'),
  gridDistribution: z.enum(['ARITHMETIC', 'GEOMETRIC'] as const),
  feeRate: z.number().min(0).max(0.01),
}).refine(d => d.upperPrice > d.lowerPrice, {
  message: 'Верхняя цена должна быть выше нижней',
  path: ['upperPrice'],
})

type GridFormValues = z.infer<typeof gridFormSchema>

type GridPreviewLevel = {
  price: number
  side: 'BUY' | 'SELL'
  status: 'PENDING' | 'FILLED' | 'CANCELLED'
  index: number
}

type GridFormProps = {
  instrument: string
  instrumentId: string
  instrumentType: string
  currentPrice: number
  onSuccess: (gridId: string) => void
  onLevelsChange?: (levels: GridPreviewLevel[]) => void
}

export const GridForm = ({
  instrument,
  instrumentId,
  instrumentType,
  currentPrice,
  onSuccess,
  onLevelsChange,
}: GridFormProps) => {
  const [aiLoading, setAiLoading] = useState(false)
  const [lookbackDays, setLookbackDays] = useState(30)
  const [aiReasoning, setAiReasoning] = useState<string | null>(null)
  const [reasoningOpen, setReasoningOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<GridFormValues>({
    resolver: zodResolver(gridFormSchema),
    defaultValues: {
      name: `Grid ${instrument}`,
      lowerPrice: currentPrice > 0 ? Math.round(currentPrice * 0.95 * 100) / 100 : 0,
      upperPrice: currentPrice > 0 ? Math.round(currentPrice * 1.05 * 100) / 100 : 0,
      gridLevels: 10,
      amountPerOrder: 100,
      gridDistribution: 'ARITHMETIC',
      feeRate: 0.001,
    },
  })

  const values = watch()

  const computedLevels = useCallback(() => {
    const { lowerPrice, upperPrice, gridLevels, gridDistribution } = values
    if (!lowerPrice || !upperPrice || !gridLevels || upperPrice <= lowerPrice) return []
    return calculateGridLevels(lowerPrice, upperPrice, gridLevels, gridDistribution as GridDistribution)
  }, [values])

  const levelPrices = computedLevels()

  const previewLevels: GridPreviewLevel[] = levelPrices.map((price, i) => ({
    price,
    side: price < (values.lowerPrice + values.upperPrice) / 2 ? 'BUY' : 'SELL',
    status: 'PENDING',
    index: i,
  }))

  useEffect(() => {
    onLevelsChange?.(previewLevels)
  }, [JSON.stringify(previewLevels), onLevelsChange])

  const priceStep = levelPrices.length > 1 ? levelPrices[1] - levelPrices[0] : 0
  const profitPerGrid = values.lowerPrice > 0 && priceStep > 0
    ? (priceStep / values.lowerPrice) * 100 - values.feeRate * 200
    : 0
  const totalInvestment = values.amountPerOrder * values.gridLevels

  const handleAiSuggest = async () => {
    setAiLoading(true)
    try {
      const res = await suggestGridParamsAction({ instrumentId, instrument, lookbackDays })
      if (!res.success) {
        toast.error(res.error ?? 'Ошибка AI подбора')
        return
      }
      const s = res.data
      setValue('lowerPrice', s.lowerPrice)
      setValue('upperPrice', s.upperPrice)
      setValue('gridLevels', s.gridLevels)
      setValue('amountPerOrder', s.amountPerOrder)
      setValue('gridDistribution', s.gridDistribution)
      setValue('feeRate', s.feeRate)
      if (s.reasoning) {
        setAiReasoning(s.reasoning)
        setReasoningOpen(true)
      }
      toast.success('Параметры заполнены AI')
    } catch {
      toast.error('Ошибка AI подбора')
    } finally {
      setAiLoading(false)
    }
  }

  const onSubmit = async (data: GridFormValues) => {
    setSubmitting(true)
    try {
      const res = await createGridAction({
        name: data.name,
        instrument,
        instrumentType,
        config: {
          type: 'GRID',
          lowerPrice: data.lowerPrice,
          upperPrice: data.upperPrice,
          gridLevels: data.gridLevels,
          amountPerOrder: data.amountPerOrder,
          gridDistribution: data.gridDistribution as GridDistribution,
          feeRate: data.feeRate,
        },
        currentPrice,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Ошибка создания Grid Bot')
        return
      }
      toast.success('Grid Bot запущен')
      onSuccess(res.data.gridId)
    } catch {
      toast.error('Ошибка создания Grid Bot')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-2">
        <select
          value={lookbackDays}
          onChange={e => setLookbackDays(Number(e.target.value))}
          className="text-xs border border-border rounded px-2 py-1 bg-background"
          disabled={aiLoading}
        >
          {LOOKBACK_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAiSuggest}
          disabled={aiLoading}
          className="gap-1.5"
        >
          {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          AI подбор
        </Button>
      </div>

      {aiReasoning && (
        <div className="rounded border border-border text-xs">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 text-left"
            onClick={() => setReasoningOpen(o => !o)}
          >
            <span className="font-medium">Обоснование AI</span>
            {reasoningOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {reasoningOpen && (
            <div className="px-3 pb-3 text-muted-foreground leading-relaxed">{aiReasoning}</div>
          )}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="name" className="text-xs">Название</Label>
        <Input id="name" {...register('name')} className="h-8 text-sm" disabled={aiLoading} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Распределение</Label>
        <Select
          defaultValue="ARITHMETIC"
          onValueChange={v => setValue('gridDistribution', v as 'ARITHMETIC' | 'GEOMETRIC')}
          disabled={aiLoading}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ARITHMETIC">Арифметическое</SelectItem>
            <SelectItem value="GEOMETRIC">Геометрическое</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="lowerPrice" className="text-xs">Нижняя цена</Label>
          <Input id="lowerPrice" type="number" step="any" {...register('lowerPrice', { valueAsNumber: true })} className="h-8 text-sm" disabled={aiLoading} />
          {errors.lowerPrice && <p className="text-xs text-destructive">{errors.lowerPrice.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="upperPrice" className="text-xs">Верхняя цена</Label>
          <Input id="upperPrice" type="number" step="any" {...register('upperPrice', { valueAsNumber: true })} className="h-8 text-sm" disabled={aiLoading} />
          {errors.upperPrice && <p className="text-xs text-destructive">{errors.upperPrice.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="gridLevels" className="text-xs">Уровней</Label>
          <Input id="gridLevels" type="number" {...register('gridLevels', { valueAsNumber: true })} className="h-8 text-sm" disabled={aiLoading} />
          {errors.gridLevels && <p className="text-xs text-destructive">{errors.gridLevels.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="amountPerOrder" className="text-xs">USDT на уровень</Label>
          <Input id="amountPerOrder" type="number" step="any" {...register('amountPerOrder', { valueAsNumber: true })} className="h-8 text-sm" disabled={aiLoading} />
          {errors.amountPerOrder && <p className="text-xs text-destructive">{errors.amountPerOrder.message}</p>}
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="feeRate" className="text-xs">Комиссия (0.001 = 0.1%)</Label>
          <Input id="feeRate" type="number" step="0.0001" {...register('feeRate', { valueAsNumber: true })} className="h-8 text-sm" disabled={aiLoading} />
          {errors.feeRate && <p className="text-xs text-destructive">{errors.feeRate.message}</p>}
        </div>
      </div>

      {levelPrices.length > 0 && (
        <div className="rounded border border-border bg-muted/30 p-3 space-y-2 text-xs">
          <p className="font-medium">Предварительный расчёт</p>
          <div className="grid grid-cols-2 gap-1 text-muted-foreground">
            <span>Уровней:</span><span className="text-foreground">{levelPrices.length}</span>
            <span>Шаг цены:</span><span className="text-foreground">{priceStep.toFixed(2)}</span>
            <span>Прибыль/grid:</span><span className={profitPerGrid > 0 ? 'text-green-500' : 'text-destructive'}>{profitPerGrid.toFixed(3)}%</span>
            <span>Инвестиции:</span><span className="text-foreground">{totalInvestment.toFixed(2)} USDT</span>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-0.5">
            {levelPrices.map((price, i) => (
              <div key={i} className="flex justify-between text-muted-foreground">
                <span>#{i}</span>
                <span>{price.toFixed(2)}</span>
                <span className={price < currentPrice ? 'text-blue-400' : 'text-red-400'}>
                  {price < currentPrice ? 'BUY' : 'SELL'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={submitting || aiLoading}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Запустить Grid Bot
      </Button>
    </form>
  )
}
