"use client"

import { useCallback, useEffect, useState } from "react"
import {
  User,
  MessageSquare,
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
  saveMaxChatIdAction,
  removeMaxChatIdAction,
  testNotificationAction,
} from "@/server/actions/settings-actions"
import { logoutAction } from "@/server/actions/auth"

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [maxChatId, setMaxChatId] = useState("")
  const [maxConnected, setMaxConnected] = useState(false)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getSettingsAction()
      if (res.success) {
        setName(res.data.name ?? "")
        setEmail(res.data.email ?? "")
        setMaxChatId(res.data.maxChatId ?? "")
        setMaxConnected(!!res.data.maxChatId)
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

  const handleSaveMaxChat = async () => {
    setSaving(true)
    try {
      const res = await saveMaxChatIdAction(maxChatId)
      if (res.success) {
        toast.success("MAX Chat ID сохранён")
        setMaxConnected(true)
      } else {
        toast.error(res.error)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMax = async () => {
    const res = await removeMaxChatIdAction()
    if (res.success) {
      setMaxChatId("")
      setMaxConnected(false)
      toast.success("MAX отключён")
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

      <div className="rounded-xl border border-border bg-card p-6">
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
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Сохранить
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <MessageSquare className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold">MAX Мессенджер</h2>
            <p className="text-sm text-muted-foreground">Уведомления о срабатывании сигналов</p>
          </div>
          {maxConnected && (
            <span className="ml-auto flex items-center gap-1 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              Подключён
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm">
            <p className="text-muted-foreground">
              Напишите <span className="font-medium text-blue-400">/start</span> боту{" "}
              <span className="font-medium text-blue-400">@AlgoBuilderBot</span>{" "}
              в MAX мессенджере. Бот отправит вам Chat ID — вставьте его ниже.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Chat ID</label>
            <Input
              value={maxChatId}
              onChange={(e) => setMaxChatId(e.target.value)}
              placeholder="Вставьте Chat ID из бота"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveMaxChat} disabled={saving || !maxChatId.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Сохранить
            </Button>
            {maxConnected && (
              <>
                <Button variant="outline" onClick={handleTestNotification} disabled={testing}>
                  {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Тест
                </Button>
                <Button variant="outline" onClick={handleRemoveMax} className="text-red-400 hover:text-red-300">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Отключить
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <Button variant="outline" className="text-red-400 hover:text-red-300" onClick={() => logoutAction()}>
          <LogOut className="mr-2 h-4 w-4" />
          Выйти из аккаунта
        </Button>
      </div>
    </div>
  )
}
