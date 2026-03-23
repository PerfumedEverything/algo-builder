"use server"

import { type ApiResponse, errorResponse, successResponse } from "@/core/types/api"
import { BrokerRepository } from "@/server/repositories"
import { TinkoffProvider } from "@/server/providers/broker"
import { getDepositsAndWithdrawals } from "@/server/providers/broker/deposit-helper"
import { TinkoffInvestApi } from "tinkoff-invest-api"
import { getCurrentUserId } from "./helpers"

export type DepositData = {
  totalDeposits: number
  totalWithdrawals: number
  netDeposits: number
}

export const getDepositsAction = async (): Promise<ApiResponse<DepositData>> => {
  try {
    const userId = await getCurrentUserId()
    const repo = new BrokerRepository()
    const settings = await repo.getSettings(userId)

    if (!settings?.brokerToken || !settings.brokerAccountId) {
      return errorResponse("Брокер не подключён")
    }

    const api = new TinkoffInvestApi({ token: settings.brokerToken })
    const summary = await getDepositsAndWithdrawals(api, settings.brokerAccountId)

    const netDeposits = summary.totalDeposits - summary.totalWithdrawals

    return successResponse({
      totalDeposits: summary.totalDeposits,
      totalWithdrawals: summary.totalWithdrawals,
      netDeposits,
    })
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}
