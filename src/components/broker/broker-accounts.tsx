"use client"

import { useState } from "react"
import { Check, Wallet, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { BrokerAccount } from "@/core/types"
import { sandboxPayInAction } from "@/server/actions/broker-actions"

type BrokerAccountsProps = {
  accounts: BrokerAccount[]
  selectedId: string | null
  onSelect: (id: string) => void
  onPayIn?: () => void
}

export const BrokerAccounts = ({ accounts, selectedId, onSelect, onPayIn }: BrokerAccountsProps) => {
  const [payInAmount, setPayInAmount] = useState("100000")
  const [payInLoading, setPayInLoading] = useState(false)

  const hasSandbox = accounts.some((a) => a.type === "SANDBOX")
  const selectedAccount = accounts.find((a) => a.id === selectedId)
  const showPayIn = hasSandbox && selectedAccount?.type === "SANDBOX"

  const handlePayIn = async () => {
    const amount = parseInt(payInAmount, 10)
    if (!amount || amount <= 0) return

    setPayInLoading(true)
    try {
      const result = await sandboxPayInAction(amount)
      if (result.success) {
        toast.success(`Пополнено на ${amount.toLocaleString("ru-RU")} ₽`)
        onPayIn?.()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Ошибка пополнения")
    } finally {
      setPayInLoading(false)
    }
  }

  if (accounts.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
          <Wallet className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h2 className="font-semibold">Счета</h2>
          <p className="text-sm text-muted-foreground">Выберите активный счёт</p>
        </div>
      </div>

      <div className="space-y-2">
        {accounts.map((account) => (
          <Button
            key={account.id}
            variant={selectedId === account.id ? "default" : "outline"}
            className="w-full justify-between"
            onClick={() => onSelect(account.id)}
          >
            <span className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              {account.name}
              {account.type === "SANDBOX" && (
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                  Sandbox
                </span>
              )}
            </span>
            {selectedId === account.id && <Check className="h-4 w-4" />}
          </Button>
        ))}
      </div>

      {showPayIn && (
        <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="mb-2 text-xs font-medium text-amber-400">Пополнить sandbox</p>
          <div className="flex gap-2">
            <Input
              type="number"
              value={payInAmount}
              onChange={(e) => setPayInAmount(e.target.value)}
              placeholder="Сумма в ₽"
              className="h-8 text-sm"
            />
            <Button size="sm" className="h-8 shrink-0" onClick={handlePayIn} disabled={payInLoading}>
              {payInLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
              {payInLoading ? "" : "Пополнить"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
