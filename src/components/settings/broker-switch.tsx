"use client"

import { useState } from "react"
import { Bitcoin, Building2, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { switchBrokerAction, connectBybitAction } from "@/server/actions/settings-actions"

type BrokerSwitchProps = {
  currentBroker: string
  hasApiKey: boolean
}

export const BrokerSwitch = ({ currentBroker, hasApiKey }: BrokerSwitchProps) => {
  const [broker, setBroker] = useState(currentBroker)
  const [credsSaved, setCredsSaved] = useState(hasApiKey)
  const [showCredentials, setShowCredentials] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [switching, setSwitching] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const handleSelectBroker = async (brokerType: string) => {
    if (brokerType === broker) return
    if (brokerType === "BYBIT" && !credsSaved) {
      setShowCredentials(true)
      return
    }
    setSwitching(true)
    try {
      const res = await switchBrokerAction(brokerType)
      if (res.success) {
        setBroker(brokerType)
        toast.success(`Переключено на ${brokerType === "BYBIT" ? "Bybit" : "T-Invest"}`)
      } else {
        toast.error(res.error)
      }
    } finally {
      setSwitching(false)
    }
  }

  const handleConnectBybit = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      toast.error("Введите API Key и API Secret")
      return
    }
    setConnecting(true)
    try {
      const res = await connectBybitAction(apiKey.trim(), apiSecret.trim())
      if (res.success) {
        setCredsSaved(true)
        setBroker("BYBIT")
        setShowCredentials(false)
        setApiKey("")
        setApiSecret("")
        toast.success("Bybit подключён")
      } else {
        toast.error(res.error)
      }
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleSelectBroker("TINKOFF")}
          disabled={switching}
          className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors hover:border-primary/50 ${
            broker === "TINKOFF"
              ? "border-primary bg-primary/10"
              : "border-border bg-card"
          }`}
        >
          <div className="flex items-center gap-2">
            <Building2 className={`h-5 w-5 ${broker === "TINKOFF" ? "text-primary" : "text-muted-foreground"}`} />
            <span className="font-medium">T-Invest</span>
            {broker === "TINKOFF" && <CheckCircle className="ml-auto h-4 w-4 text-primary" />}
          </div>
          <p className="text-xs text-muted-foreground">Акции, облигации, ETF • MOEX • Рубли</p>
        </button>

        <button
          onClick={() => handleSelectBroker("BYBIT")}
          disabled={switching}
          className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors hover:border-primary/50 ${
            broker === "BYBIT"
              ? "border-primary bg-primary/10"
              : "border-border bg-card"
          }`}
        >
          <div className="flex items-center gap-2">
            <Bitcoin className={`h-5 w-5 ${broker === "BYBIT" ? "text-primary" : "text-muted-foreground"}`} />
            <span className="font-medium">Bybit</span>
            {broker === "BYBIT" && <CheckCircle className="ml-auto h-4 w-4 text-primary" />}
          </div>
          <p className="text-xs text-muted-foreground">Крипто: BTCUSDT, ETHUSDT… • 24/7 • Testnet</p>
        </button>
      </div>

      {showCredentials && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">Подключить Bybit API</p>
          <div className="space-y-2">
            <Input
              placeholder="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
            <Input
              placeholder="API Secret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleConnectBybit}
              disabled={connecting || !apiKey.trim() || !apiSecret.trim()}
            >
              {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Подключить
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCredentials(false)
                setApiKey("")
                setApiSecret("")
              }}
            >
              Отмена
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
