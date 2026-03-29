"use client"

import { useEffect, useImperativeHandle, useState, forwardRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { INSTRUMENT_TYPES, TIMEFRAMES } from "@/core/config/instruments"
import type { StrategyRow } from "@/server/repositories/strategy-repository"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStrategyStore } from "@/hooks/use-strategy-store"
import {
  createStrategyAction,
  updateStrategyAction,
} from "@/server/actions/strategy-actions"
import { ConditionBuilder } from "@/components/shared/condition-builder"
import { InstrumentSelect } from "@/components/shared/instrument-select"
import { RiskForm } from "./risk-form"

const generalSchema = z.object({
  name: z.string().min(1, "Введите название"),
  description: z.string().optional(),
  instrument: z.string().min(1, "Укажите инструмент"),
  instrumentType: z.enum(["STOCK", "BOND", "CURRENCY", "FUTURES", "CRYPTO"]),
  timeframe: z.string().min(1, "Выберите таймфрейм"),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "TRIGGERED"]).optional(),
})

type GeneralFormData = z.infer<typeof generalSchema>

type StrategyFormProps = {
  mode: "create" | "edit"
  strategy?: StrategyRow
  onClose: () => void
  onSuccess: (strategyId?: string) => void
}

export type StrategyFormHandle = {
  setGeneralFields: (fields: {
    name: string
    instrument: string
    instrumentType: "STOCK" | "BOND" | "CURRENCY" | "FUTURES" | "CRYPTO"
    timeframe: string
    description: string
  }) => void
}

export const StrategyForm = forwardRef<StrategyFormHandle, StrategyFormProps>(
  ({ mode, strategy, onClose, onSuccess }, ref) => {
    const [currentPrice, setCurrentPrice] = useState<number | null>(null)
    const {
      config,
      activeTab,
      setActiveTab,
      addCondition,
      updateCondition,
      removeCondition,
      setLogicOperator,
      initFromExisting,
      reset,
    } = useStrategyStore()

    const {
      register,
      handleSubmit,
      setValue,
      watch,
      formState: { errors, isSubmitting },
    } = useForm<GeneralFormData>({
      resolver: zodResolver(generalSchema),
      defaultValues: {
        name: strategy?.name ?? "",
        description: strategy?.description ?? "",
        instrument: strategy?.instrument ?? "",
        instrumentType: (strategy?.instrumentType as GeneralFormData["instrumentType"]) ?? "STOCK",
        timeframe: strategy?.timeframe ?? "1d",
        status: (strategy?.status as GeneralFormData["status"]) ?? "DRAFT",
      },
    })

    const watchedInstrumentType = watch("instrumentType")
    const watchedTimeframe = watch("timeframe")

    useImperativeHandle(ref, () => ({
      setGeneralFields: (fields) => {
        setValue("name", fields.name)
        setValue("instrument", fields.instrument)
        setValue("instrumentType", fields.instrumentType)
        setValue("timeframe", fields.timeframe)
        setValue("description", fields.description)
      },
    }))

    useEffect(() => {
      if (strategy?.config) {
        initFromExisting(strategy.config as import("@/core/types/strategy").IndicatorStrategyConfig)
      }
      return () => reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [strategy])

    const onSubmit = async (data: GeneralFormData) => {
      if (config.entry.length === 0) {
        toast.error("Добавьте хотя бы одно условие входа")
        return
      }
      if (config.exit.length === 0) {
        toast.error("Добавьте хотя бы одно условие выхода")
        return
      }

      const payload = { ...data, config }

      const result =
        mode === "create"
          ? await createStrategyAction(payload)
          : await updateStrategyAction(strategy!.id, payload)

      if (result.success) {
        toast.success(mode === "create" ? "Стратегия создана" : "Стратегия обновлена")
        onSuccess(result.data?.id)
        onClose()
      } else {
        toast.error(result.error)
      }
    }

    return (
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">Основное</TabsTrigger>
            <TabsTrigger value="entry" className="flex-1">Вход</TabsTrigger>
            <TabsTrigger value="exit" className="flex-1">Выход</TabsTrigger>
            <TabsTrigger value="risks" className="flex-1">Риски</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Название стратегии</Label>
              <Input {...register("name")} placeholder="Моя стратегия" />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Тип инструмента</Label>
                <Select
                  value={watchedInstrumentType}
                  onValueChange={(v) => {
                    setValue("instrumentType", v as GeneralFormData["instrumentType"])
                    setValue("instrument", "")
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INSTRUMENT_TYPES.map((t) => (
                      <SelectItem key={t.type} value={t.type}>{t.labelRu}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Инструмент</Label>
                <InstrumentSelect
                  instrumentType={watchedInstrumentType}
                  value={watch("instrument")}
                  onChange={(v) => setValue("instrument", v, { shouldValidate: true })}
                  onPriceChange={setCurrentPrice}
                />
                {errors.instrument && <p className="text-xs text-red-400">{errors.instrument.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Таймфрейм</Label>
              <Select
                value={watchedTimeframe}
                onValueChange={(v) => setValue("timeframe", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Описание</Label>
              <Textarea {...register("description")} rows={2} placeholder="Описание стратегии" className="resize-none" />
            </div>
          </TabsContent>

          <TabsContent value="entry" className="mt-4">
            <div className="mb-3 text-sm font-medium text-emerald-400">Условия входа в позицию</div>
            <ConditionBuilder
              conditions={config.entry}
              logicOperator={config.entryLogic}
              currentPrice={currentPrice}
              onAdd={() => addCondition("entry")}
              onUpdate={(i, c) => updateCondition("entry", i, c)}
              onRemove={(i) => removeCondition("entry", i)}
              onLogicChange={(op) => setLogicOperator("entry", op)}
            />
          </TabsContent>

          <TabsContent value="exit" className="mt-4">
            <div className="mb-3 text-sm font-medium text-red-400">Условия выхода из позиции</div>
            <ConditionBuilder
              conditions={config.exit}
              logicOperator={config.exitLogic}
              currentPrice={currentPrice}
              onAdd={() => addCondition("exit")}
              onUpdate={(i, c) => updateCondition("exit", i, c)}
              onRemove={(i) => removeCondition("exit", i)}
              onLogicChange={(op) => setLogicOperator("exit", op)}
            />
          </TabsContent>

          <TabsContent value="risks" className="mt-4">
            <div className="mb-3 text-sm font-medium">Базовый риск-менеджмент</div>
            <RiskForm />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Создать" : "Сохранить"}
          </Button>
        </div>
      </form>
    )
  },
)

StrategyForm.displayName = "StrategyForm"
