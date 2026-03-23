import type { RiskMetrics, RiskMetricResult, MetricName } from "@/core/types"
import { AppError } from "@/core/errors/app-error"
import { BrokerService } from "./broker-service"
import { MOEXProvider } from "@/server/providers/analytics/moex-provider"
import {
  dailyReturns,
  sharpe,
  maxDrawdown,
  var95,
  beta,
  alpha,
  annualize,
  getMetricStatus,
  alignByDate,
  RF_DAILY,
} from "./risk-calculations"

const LABELS: Record<MetricName, { label: string; tooltip: string; format: RiskMetricResult["format"] }> = {
  sharpe: { label: "Коэф. Шарпа", tooltip: "Доходность на единицу риска. >1.0 — хорошо, <0.5 — плохо", format: "ratio" },
  beta: { label: "Бета", tooltip: "Чувствительность к рынку. 0.8-1.2 — нейтрально, >1.5 — высокий риск", format: "coefficient" },
  var95: { label: "VaR (95%)", tooltip: "Потенциальный дневной убыток. <2% — низкий, >5% — высокий", format: "percent" },
  maxDrawdown: { label: "Макс. просадка", tooltip: "Максимальное падение от пика. <10% — хорошо, >20% — плохо", format: "percent" },
  alpha: { label: "Альфа", tooltip: "Доходность сверх рынка. >0 — обыгрываете рынок, <0 — отстаёте", format: "coefficient" },
}

const buildResult = (metric: MetricName, value: number | null): RiskMetricResult => ({
  value,
  status: value !== null ? getMetricStatus(metric, value) : null,
  ...LABELS[metric],
})

export class RiskService {
  private broker = new BrokerService()
  private moex = new MOEXProvider()

  async calculate(userId: string): Promise<RiskMetrics> {
    const portfolio = await this.broker.getPortfolio(userId)
    if (!portfolio) throw AppError.badRequest("Портфель не найден")

    const positions = portfolio.positions.filter(
      (p) => p.instrumentType === "STOCK" || p.instrumentType === "ETF"
    )
    if (positions.length === 0) throw AppError.badRequest("Нет акций или ETF в портфеле")

    const totalValue = positions.reduce((s, p) => s + p.currentValue, 0)
    const now = new Date()
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    const candlesArr = await Promise.all(
      positions.map((p) =>
        this.broker.getCandles(userId, { instrumentId: p.instrumentId, from: yearAgo, to: now, interval: "day" })
      )
    )

    const positionMaps: Map<string, number>[] = candlesArr.map((candles) => {
      const closes = candles.map((c) => c.close)
      const returns = dailyReturns(closes)
      const dateMap = new Map<string, number>()
      candles.slice(1).forEach((c, i) => dateMap.set(c.time.toISOString().slice(0, 10), returns[i]))
      return dateMap
    })

    const weights = positions.map((p) => p.currentValue / totalValue)
    const allDates = new Set<string>()
    positionMaps.forEach((m) => m.forEach((_, k) => allDates.add(k)))

    const portfolioMap = new Map<string, number>()
    const sortedDates = [...allDates].sort()
    for (const date of sortedDates) {
      let weightedReturn = 0
      let coveredWeight = 0
      positionMaps.forEach((m, i) => {
        if (m.has(date)) {
          weightedReturn += weights[i] * m.get(date)!
          coveredWeight += weights[i]
        }
      })
      if (coveredWeight > 0.5) portfolioMap.set(date, weightedReturn / coveredWeight)
    }

    const fromStr = yearAgo.toISOString().slice(0, 10)
    const tillStr = now.toISOString().slice(0, 10)
    const imoexCandles = await this.moex.getImoexCandles(fromStr, tillStr)

    const benchCloses = imoexCandles.map((c) => c.close)
    const benchReturns = dailyReturns(benchCloses)
    const benchMap = new Map<string, number>()
    imoexCandles.slice(1).forEach((c, i) => benchMap.set(c.begin.slice(0, 10), benchReturns[i]))

    const { aligned_a, aligned_b } = alignByDate(portfolioMap, benchMap)
    const portReturns = [...portfolioMap.values()]
    const betaVal = beta(aligned_a, aligned_b)
    const alphaVal =
      betaVal !== null
        ? alpha(annualize(aligned_a), betaVal, annualize(aligned_b), 0.21)
        : null

    return {
      sharpe: buildResult("sharpe", sharpe(portReturns, RF_DAILY)),
      beta: buildResult("beta", betaVal),
      var95: buildResult("var95", var95(portReturns)),
      maxDrawdown: buildResult("maxDrawdown", maxDrawdown(portReturns)?.value ?? null),
      alpha: buildResult("alpha", alphaVal),
      calculatedAt: now.toISOString(),
      dataPoints: portReturns.length,
    }
  }
}
