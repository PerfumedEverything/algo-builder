"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Send } from "lucide-react"

import { INSTRUMENT_TYPES, TIMEFRAMES } from "@/core/config/instruments"
import type { SignalRow } from "@/server/repositories/signal-repository"
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
import { useSignalStore } from "@/hooks/use-signal-store"
import {
  createSignalAction,
  updateSignalAction,
} from "@/server/actions/signal-actions"
import { ConditionBuilder } from "@/components/shared/condition-builder"
import { InstrumentSelect } from "@/components/shared/instrument-select"

const generalSchema = z.object({
  name: z.string().min(1, "Введите название"),
  description: z.string().optional(),
  instrument: z.string().min(1, "Укажите инструмент"),
  instrumentType: z.enum(["STOCK", "BOND", "CURRENCY", "FUTURES"]),
  timeframe: z.string().min(1, "Выберите таймфрейм"),
  signalType: z.enum(["BUY", "SELL"]),
})

type GeneralFormData = z.infer<typeof generalSchema>

type SignalFormProps = {
  mode: "create" | "edit"
  signal?: SignalRow
  onClose: () => void
  onSuccess: () => void
}

export const SignalForm = ({ mode, signal, onClose, onSuccess }: SignalFormProps) => {
  const {
    conditions,
    channels,
    logicOperator,
    addCondition,
    updateCondition,
    removeCondition,
    toggleChannel,
    setLogicOperator,
    initFromExisting,
    reset,
  } = useSignalStore()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GeneralFormData>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      name: signal?.name ?? "",
      description: signal?.description ?? "",
      instrument: signal?.instrument ?? "",
      instrumentType: (signal?.instrumentType as GeneralFormData["instrumentType"]) ?? "STOCK",
      timeframe: signal?.timeframe ?? "1d",
      signalType: (signal?.signalType as GeneralFormData["signalType"]) ?? "BUY",
    },
  })

  useEffect(() => {
    if (signal) {
      initFromExisting(signal.conditions, signal.channels, signal.logicOperator)
    }
    return () => reset()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal])

  const onSubmit = async (data: GeneralFormData) => {
    if (conditions.length === 0) {
      toast.error("Добавьте хотя бы одно условие")
      return
    }
    if (channels.length === 0) {
      toast.error("Выберите хотя бы один канал уведомлений")
      return
    }

    const payload = { ...data, conditions, channels, logicOperator }

    const result =
      mode === "create"
        ? await createSignalAction(payload)
        : await updateSignalAction(signal!.id, payload)

    if (result.success) {
      toast.success(mode === "create" ? "Сигнал создан" : "Сигнал обновлён")
      onSuccess()
      onClose()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-1">
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-primary">Основное</h3>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Название сигнала</Label>
          <Input {...register("name")} placeholder="Мой сигнал" />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Тип инструмента</Label>
            <Select
              defaultValue={signal?.instrumentType ?? "STOCK"}
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
              instrumentType={watch("instrumentType")}
              value={watch("instrument")}
              onChange={(v) => setValue("instrument", v, { shouldValidate: true })}
            />
            {errors.instrument && <p className="text-xs text-red-400">{errors.instrument.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Тип сигнала</Label>
            <Select
              defaultValue={signal?.signalType ?? "BUY"}
              onValueChange={(v) => setValue("signalType", v as GeneralFormData["signalType"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">Покупка (BUY)</SelectItem>
                <SelectItem value="SELL">Продажа (SELL)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Таймфрейм</Label>
            <Select
              defaultValue={signal?.timeframe ?? "1d"}
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
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Описание</Label>
          <Textarea {...register("description")} rows={2} placeholder="Описание сигнала" className="resize-none" />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-primary">Условия срабатывания</h3>
        <ConditionBuilder
          conditions={conditions}
          logicOperator={logicOperator}
          onAdd={addCondition}
          onUpdate={updateCondition}
          onRemove={removeCondition}
          onLogicChange={setLogicOperator}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-primary">Каналы уведомлений</h3>
        <label className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50">
          <input
            type="checkbox"
            checked={channels.includes("telegram")}
            onChange={() => toggleChannel("telegram")}
            className="h-4 w-4 rounded border-border"
          />
          <Send className="h-4 w-4 text-violet-400" />
          <div>
            <p className="text-sm font-medium">Telegram</p>
            <p className="text-xs text-muted-foreground">Уведомления в Telegram бот</p>
          </div>
        </label>
      </section>

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
}
