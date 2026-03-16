"use client"

import { Check, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { BrokerAccount } from "@/core/types"

type BrokerAccountsProps = {
  accounts: BrokerAccount[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export const BrokerAccounts = ({ accounts, selectedId, onSelect }: BrokerAccountsProps) => {
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
    </div>
  )
}
