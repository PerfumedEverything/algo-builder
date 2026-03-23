import type { TinkoffInvestApi } from "tinkoff-invest-api"
import { OperationState, OperationType } from "tinkoff-invest-api/dist/generated/operations"

export type DepositOperation = {
  date: string
  type: "DEPOSIT" | "WITHDRAWAL"
  amount: number
}

export type DepositSummary = {
  totalDeposits: number
  totalWithdrawals: number
  operations: DepositOperation[]
}

const DEPOSIT_TYPES = new Set([
  OperationType.OPERATION_TYPE_INPUT,
  OperationType.OPERATION_TYPE_INPUT_SECURITIES,
])

const WITHDRAWAL_TYPES = new Set([
  OperationType.OPERATION_TYPE_OUTPUT,
  OperationType.OPERATION_TYPE_OUTPUT_SECURITIES,
])

const toNumber = (q?: { units: number; nano: number }): number => {
  if (!q) return 0
  return q.units + q.nano / 1_000_000_000
}

export const getDepositsAndWithdrawals = async (
  api: TinkoffInvestApi,
  accountId: string,
): Promise<DepositSummary> => {
  const accountStart = new Date("2015-01-01")
  const now = new Date()

  const { operations } = await api.operations.getOperations({
    accountId,
    from: accountStart,
    to: now,
    state: OperationState.OPERATION_STATE_EXECUTED,
  })

  let totalDeposits = 0
  let totalWithdrawals = 0
  const result: DepositOperation[] = []

  for (const op of operations) {
    const amount = Math.abs(toNumber(op.payment))
    if (amount === 0) continue

    if (DEPOSIT_TYPES.has(op.operationType)) {
      totalDeposits += amount
      result.push({
        date: op.date?.toISOString() ?? new Date().toISOString(),
        type: "DEPOSIT",
        amount,
      })
    } else if (WITHDRAWAL_TYPES.has(op.operationType)) {
      totalWithdrawals += amount
      result.push({
        date: op.date?.toISOString() ?? new Date().toISOString(),
        type: "WITHDRAWAL",
        amount,
      })
    }
  }

  return { totalDeposits, totalWithdrawals, operations: result }
}
