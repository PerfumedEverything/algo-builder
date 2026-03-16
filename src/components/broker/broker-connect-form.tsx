"use client"

import { useState } from "react"
import { Loader2, Link2, ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { connectBrokerAction } from "@/server/actions/broker-actions"
import type { BrokerAccount } from "@/core/types"

type BrokerConnectFormProps = {
  onConnected: (accounts: BrokerAccount[]) => void
}

export const BrokerConnectForm = ({ onConnected }: BrokerConnectFormProps) => {
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    if (!token.trim()) return
    setLoading(true)
    try {
      const result = await connectBrokerAction(token)
      if (result.success) {
        toast.success("Брокер подключён")
        onConnected(result.data)
        setToken("")
      } else {
        toast.error(result.error)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Link2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold">Подключение Т-Инвестиции</h2>
          <p className="text-sm text-muted-foreground">Введите токен API для подключения брокера</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            Получите токен в{" "}
            <a
              href="https://www.tbank.ru/invest/settings/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-amber-400 hover:text-amber-300 transition-colors"
            >
              личном кабинете T-Invest
              <ExternalLink className="h-3 w-3" />
            </a>
            {" "}→ Настройки → Работа с API. Используйте токен с правами только на чтение для безопасности.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">API Токен</label>
          <Input
            type="password"
            placeholder="t.XXXXXXXXXXXXXXXXXXXXX"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
          />
        </div>

        <Button onClick={handleConnect} disabled={loading || !token.trim()} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Подключение...
            </>
          ) : (
            <>
              <Link2 className="mr-2 h-4 w-4" />
              Подключить
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
