"use client"

import { useCallback, useEffect, useState } from "react"
import {
  User,
  Save,
  Loader2,
  Send,
  LogOut,
  CheckCircle,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getSettingsAction,
  updateProfileAction,
  saveTelegramChatIdAction,
  removeTelegramChatIdAction,
  testNotificationAction,
} from "@/server/actions/settings-actions"
import { logoutAction } from "@/server/actions/auth"

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [telegramChatId, setTelegramChatId] = useState("")
  const [telegramConnected, setTelegramConnected] = useState(false)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getSettingsAction()
      if (res.success) {
        setName(res.data.name ?? "")
        setEmail(res.data.email ?? "")
        setTelegramChatId(res.data.telegramChatId ?? "")
        setTelegramConnected(!!res.data.telegramChatId)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const res = await updateProfileAction(name)
      if (res.success) toast.success("Профиль обновлён")
      else toast.error(res.error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTelegram = async () => {
    setSaving(true)
    try {
      const res = await saveTelegramChatIdAction(telegramChatId)
      if (res.success) {
        toast.success("Telegram Chat ID сохранён")
        setTelegramConnected(true)
      } else {
        toast.error(res.error)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveTelegram = async () => {
    const res = await removeTelegramChatIdAction()
    if (res.success) {
      setTelegramChatId("")
      setTelegramConnected(false)
      toast.success("Telegram отключён")
    }
  }

  const handleTestNotification = async () => {
    setTesting(true)
    try {
      const res = await testNotificationAction()
      if (res.success && res.data) toast.success("Тестовое уведомление отправлено!")
      else toast.error("Не удалось отправить уведомление")
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Настройки</h1>
        <p className="text-sm text-muted-foreground">Профиль и уведомления</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 lg:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-semibold">Профиль</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Имя</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input value={email} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">Email нельзя изменить</p>
          </div>
          <Button className="w-full sm:w-auto" onClick={handleSaveProfile} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Сохранить
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 lg:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
            <Send className="h-5 w-5 text-sky-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Telegram</h2>
              {telegramConnected && (
                <span className="flex items-center gap-1 text-sm text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  Подключён
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Уведомления о срабатывании сигналов</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm">
            <p className="text-muted-foreground">
              Напишите <span className="font-medium text-sky-400">/start</span> боту{" "}
              <a
                href="https://t.me/AculaTradeNot_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sky-400 underline underline-offset-2 hover:text-sky-300"
              >
                @AculaTradeNot_bot
              </a>{" "}
              в Telegram. Бот отправит вам Chat ID — вставьте его ниже.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Chat ID</label>
            <Input
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="Например: 309572330"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button className="w-full sm:w-auto" onClick={handleSaveTelegram} disabled={saving || !telegramChatId.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Сохранить
            </Button>
            {telegramConnected && (
              <>
                <Button className="w-full sm:w-auto" variant="outline" onClick={handleTestNotification} disabled={testing}>
                  {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Тест
                </Button>
                <Button variant="outline" onClick={handleRemoveTelegram} className="w-full sm:w-auto text-red-400 hover:text-red-300">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Отключить
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 lg:p-6">
        <Button variant="outline" className="w-full sm:w-auto text-red-400 hover:text-red-300" onClick={() => logoutAction()}>
          <LogOut className="mr-2 h-4 w-4" />
          Выйти из аккаунта
        </Button>
      </div>
    </div>
  )
}
