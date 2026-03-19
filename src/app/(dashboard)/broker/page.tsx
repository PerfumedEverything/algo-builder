"use client"

import { useCallback, useEffect, useState } from "react"
import { Unplug, ShieldCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { BrokerConnectForm, BrokerAccounts, PortfolioView } from "@/components/broker"
import {
  getBrokerStatusAction,
  getBrokerAccountsAction,
  getPortfolioAction,
  selectBrokerAccountAction,
  disconnectBrokerAction,
} from "@/server/actions/broker-actions"
import type { BrokerAccount, Portfolio } from "@/core/types"

export default function BrokerPage() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<BrokerAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const statusRes = await getBrokerStatusAction()
      if (!statusRes.success) return

      setConnected(statusRes.data.connected)
      setSelectedAccountId(statusRes.data.accountId)

      if (statusRes.data.connected) {
        const [accountsRes, portfolioRes] = await Promise.all([
          getBrokerAccountsAction(),
          getPortfolioAction(),
        ])
        if (accountsRes.success) setAccounts(accountsRes.data)
        if (portfolioRes.success && portfolioRes.data) setPortfolio(portfolioRes.data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  useEffect(() => {
    if (!connected) return
    const interval = setInterval(async () => {
      const res = await getPortfolioAction()
      if (res.success && res.data) setPortfolio(res.data)
    }, 10_000)
    return () => clearInterval(interval)
  }, [connected])

  const handleConnected = (newAccounts: BrokerAccount[]) => {
    setConnected(true)
    setAccounts(newAccounts)
    if (newAccounts.length > 0) setSelectedAccountId(newAccounts[0].id)
    fetchStatus()
  }

  const handleSelectAccount = async (accountId: string) => {
    const result = await selectBrokerAccountAction(accountId)
    if (result.success) {
      setSelectedAccountId(accountId)
      const portfolioRes = await getPortfolioAction()
      if (portfolioRes.success && portfolioRes.data) setPortfolio(portfolioRes.data)
    }
  }

  const handleDisconnect = async () => {
    const result = await disconnectBrokerAction()
    if (result.success) {
      setConnected(false)
      setAccounts([])
      setSelectedAccountId(null)
      setPortfolio(null)
      toast.success("Брокер отключён")
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Интеграция</h1>
          <p className="text-sm text-muted-foreground">Подключение и управление брокерским счётом</p>
        </div>
        {connected && (
          <Button variant="outline" onClick={handleDisconnect}>
            <Unplug className="mr-2 h-4 w-4" />
            Отключить
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-sm">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
        <span className="text-muted-foreground">
          <span className="font-medium text-emerald-400">Безопасно.</span>{" "}
          Токен хранится в зашифрованном виде. API-доступ ограничен — вывод средств невозможен.
        </span>
      </div>

      {!connected ? (
        <BrokerConnectForm onConnected={handleConnected} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <BrokerAccounts
              accounts={accounts}
              selectedId={selectedAccountId}
              onSelect={handleSelectAccount}
              onPayIn={fetchStatus}
            />
          </div>
          <div className="lg:col-span-2">
            {portfolio && <PortfolioView portfolio={portfolio} />}
          </div>
        </div>
      )}
    </div>
  )
}
