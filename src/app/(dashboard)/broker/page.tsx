"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Unplug,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { BrokerConnectForm, BrokerAccounts } from "@/components/broker"
import {
  getBrokerStatusAction,
  getBrokerAccountsAction,
  selectBrokerAccountAction,
  disconnectBrokerAction,
} from "@/server/actions/broker-actions"
import { getBrokersAction } from "@/server/actions/admin-actions"
import { connectBybitAction } from "@/server/actions/settings-actions"
import { getBrokerSettingsAction } from "@/server/actions/settings-actions"
import { Input } from "@/components/ui/input"
import type { BrokerAccount } from "@/core/types"
import type { BrokerRow } from "@/server/repositories/broker-catalog-repository"

type BrokerCardProps = {
  name: string
  description: string
  logo: string
  logoUrl?: string | null
  available: boolean
  connected?: boolean
  expanded?: boolean
  onToggle?: () => void
  onDisconnect?: () => void
  children?: React.ReactNode
}

const BrokerCard = ({
  name,
  description,
  logo,
  logoUrl,
  available,
  connected,
  expanded,
  onToggle,
  onDisconnect,
  children,
}: BrokerCardProps) => (
  <div className="rounded-xl border border-border bg-card overflow-hidden">
    <div
      className={`flex items-center justify-between p-5 ${available && onToggle ? "cursor-pointer" : ""}`}
      onClick={available ? onToggle : undefined}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl.replace(/^https?:\/\/[^/]+/, "")} alt={name} className="h-full w-full object-cover" />
          ) : (
            logo || "?"
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{name}</h3>
            {connected && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Подключён
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!available && (
          <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Clock className="h-3 w-3" />
            Скоро
          </span>
        )}
        {available && connected && onDisconnect && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDisconnect()
            }}
            className="text-muted-foreground hover:text-destructive"
          >
            <Unplug className="h-4 w-4" />
          </Button>
        )}
        {available && onToggle && (
          expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
    {expanded && children && (
      <div className="border-t border-border p-5">{children}</div>
    )}
  </div>
)

export default function BrokerPage() {
  const [catalog, setCatalog] = useState<BrokerRow[]>([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<BrokerAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [bybitExpanded, setBybitExpanded] = useState(false)
  const [bybitConnected, setBybitConnected] = useState(false)
  const [bybitKey, setBybitKey] = useState("")
  const [bybitSecret, setBybitSecret] = useState("")
  const [bybitConnecting, setBybitConnecting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [catalogRes, statusRes, settingsRes] = await Promise.all([
        getBrokersAction(),
        getBrokerStatusAction(),
        getBrokerSettingsAction(),
      ])

      if (catalogRes.success) setCatalog(catalogRes.data)
      if (settingsRes.success && settingsRes.data.hasApiKey) setBybitConnected(true)

      if (statusRes.success) {
        setConnected(statusRes.data.connected)
        setSelectedAccountId(statusRes.data.accountId)

        if (statusRes.data.connected) {
          const accountsRes = await getBrokerAccountsAction()
          if (accountsRes.success) setAccounts(accountsRes.data)
          setExpanded(true)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleConnected = (newAccounts: BrokerAccount[]) => {
    setConnected(true)
    setAccounts(newAccounts)
    if (newAccounts.length > 0) setSelectedAccountId(newAccounts[0].id)
    setExpanded(true)
    fetchData()
  }

  const handleSelectAccount = async (accountId: string) => {
    const result = await selectBrokerAccountAction(accountId)
    if (result.success) setSelectedAccountId(accountId)
  }

  const handleDisconnect = async () => {
    const result = await disconnectBrokerAction()
    if (result.success) {
      setConnected(false)
      setAccounts([])
      setSelectedAccountId(null)
      setExpanded(false)
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

  const tinkoffBroker = catalog.find((b) => b.providerKey === "TINKOFF")
  const bybitBroker = catalog.find((b) => b.providerKey === "BYBIT")
  const otherBrokers = catalog.filter((b) => b.providerKey !== "TINKOFF" && b.providerKey !== "BYBIT")

  const handleConnectBybit = async () => {
    if (!bybitKey.trim() || !bybitSecret.trim()) {
      toast.error("Введите API Key и API Secret")
      return
    }
    setBybitConnecting(true)
    try {
      const res = await connectBybitAction(bybitKey.trim(), bybitSecret.trim())
      if (res.success) {
        setBybitConnected(true)
        setBybitKey("")
        setBybitSecret("")
        toast.success("Bybit подключён")
      } else {
        toast.error(res.error)
      }
    } finally {
      setBybitConnecting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Брокеры</h1>
        <p className="text-sm text-muted-foreground">Подключение и управление брокерскими счетами</p>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-sm">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
        <span className="text-muted-foreground">
          <span className="font-medium text-emerald-400">Безопасно.</span>{" "}
          Токен хранится в зашифрованном виде. API-доступ ограничен — вывод средств невозможен.
        </span>
      </div>

      <div className="grid gap-4">
        {tinkoffBroker && (
          <BrokerCard
            name={tinkoffBroker.name}
            description={tinkoffBroker.description ?? ""}
            logo={tinkoffBroker.logoEmoji}
            logoUrl={tinkoffBroker.logoUrl}
            available={tinkoffBroker.status === "ACTIVE"}
            connected={connected}
            expanded={expanded}
            onToggle={() => setExpanded(!expanded)}
            onDisconnect={connected ? handleDisconnect : undefined}
          >
            {!connected ? (
              <BrokerConnectForm onConnected={handleConnected} />
            ) : (
              <BrokerAccounts
                accounts={accounts}
                selectedId={selectedAccountId}
                onSelect={handleSelectAccount}
                onPayIn={fetchData}
              />
            )}
          </BrokerCard>
        )}

        {bybitBroker && (
          <BrokerCard
            name={bybitBroker.name}
            description={bybitBroker.description ?? ""}
            logo="🟡"
            logoUrl={bybitBroker.logoUrl}
            available={true}
            connected={bybitConnected}
            expanded={bybitExpanded}
            onToggle={() => setBybitExpanded(!bybitExpanded)}
          >
            {bybitConnected ? (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>API подключён. Переключите брокера в Настройках для работы с криптой.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Введите API Key и Secret от Bybit</p>
                <Input placeholder="API Key" value={bybitKey} onChange={(e) => setBybitKey(e.target.value)} autoComplete="off" />
                <Input placeholder="API Secret" type="password" value={bybitSecret} onChange={(e) => setBybitSecret(e.target.value)} autoComplete="off" />
                <Button className="w-full" onClick={handleConnectBybit} disabled={bybitConnecting || !bybitKey.trim() || !bybitSecret.trim()}>
                  {bybitConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Подключить Bybit
                </Button>
              </div>
            )}
          </BrokerCard>
        )}

        {otherBrokers.map((broker) => (
          <BrokerCard
            key={broker.id}
            name={broker.name}
            description={broker.description ?? ""}
            logo={broker.logoEmoji}
            logoUrl={broker.logoUrl}
            available={broker.status === "ACTIVE"}
          />
        ))}
      </div>
    </div>
  )
}
