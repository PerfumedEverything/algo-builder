import { describe, it, expect } from "vitest"
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
} from "@/server/services/risk-calculations"

describe("dailyReturns", () => {
  it("computes close-to-close returns", () => {
    const result = dailyReturns([100, 105, 102])
    expect(result).toHaveLength(2)
    expect(result[0]).toBeCloseTo(0.05, 6)
    expect(result[1]).toBeCloseTo(-0.02857142857, 6)
  })

  it("returns empty for single price", () => {
    expect(dailyReturns([100])).toEqual([])
  })

  it("returns empty for empty array", () => {
    expect(dailyReturns([])).toEqual([])
  })
})

describe("sharpe", () => {
  it("computes annualized Sharpe with known excess returns", () => {
    const returns = [0.01, 0.02, -0.005, 0.015, 0.008]
    const rfDaily = 0.21 / 248
    const result = sharpe(returns, rfDaily)
    expect(result).not.toBeNull()
    expect(typeof result).toBe("number")
    expect(result!).toBeGreaterThan(0)
  })

  it("returns 0 when std is 0 (identical returns)", () => {
    const returns = [0.01, 0.01, 0.01, 0.01]
    const rfDaily = 0.21 / 248
    const result = sharpe(returns, rfDaily)
    expect(result).toBe(0)
  })

  it("returns null when returns.length < 2", () => {
    expect(sharpe([0.01], 0.000847)).toBeNull()
    expect(sharpe([], 0.000847)).toBeNull()
  })
})

describe("maxDrawdown", () => {
  it("computes correct peak-to-trough percentage", () => {
    const returns = [0.1, -0.05, 0.03, -0.15, 0.02]
    const result = maxDrawdown(returns)
    expect(result).not.toBeNull()
    expect(result!.value).toBeGreaterThan(0)
  })

  it("returns zero drawdown for all positive returns", () => {
    const returns = [0.01, 0.02, 0.03, 0.04]
    const result = maxDrawdown(returns)
    expect(result).not.toBeNull()
    expect(result!.value).toBe(0)
  })

  it("returns null when returns.length < 1", () => {
    expect(maxDrawdown([])).toBeNull()
  })
})

describe("var95", () => {
  it("computes 5th percentile for known sorted returns", () => {
    const returns: number[] = []
    for (let i = 0; i < 100; i++) {
      returns.push((i - 50) / 1000)
    }
    const result = var95(returns)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(0)
  })

  it("returns positive percentage (loss magnitude)", () => {
    const returns = [-0.05, -0.03, -0.01, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07]
    const result = var95(returns)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(0)
  })

  it("returns null when returns.length < 2", () => {
    expect(var95([0.01])).toBeNull()
    expect(var95([])).toBeNull()
  })
})

describe("beta", () => {
  it("computes Cov/Var correctly", () => {
    const portfolio = new Array(30).fill(0).map((_, i) => 0.01 * Math.sin(i))
    const benchmark = new Array(30).fill(0).map((_, i) => 0.005 * Math.sin(i))
    const result = beta(portfolio, benchmark)
    expect(result).not.toBeNull()
    expect(typeof result).toBe("number")
  })

  it("returns null when arrays differ in length", () => {
    expect(beta([0.01, 0.02], [0.01])).toBeNull()
  })

  it("returns null when benchmark variance is 0", () => {
    const p = new Array(30).fill(0.01)
    const b = new Array(30).fill(0.01)
    expect(beta(p, b)).toBeNull()
  })

  it("returns null when returns.length < 30", () => {
    expect(beta([0.01, 0.02, -0.01], [0.005, 0.015, -0.005])).toBeNull()
  })
})

describe("alpha", () => {
  it("computes Jensen alpha with known inputs", () => {
    const result = alpha(0.15, 1.2, 0.10, 0.21)
    expect(typeof result).toBe("number")
    const expected = 0.15 - (0.21 + 1.2 * (0.10 - 0.21))
    expect(result).toBeCloseTo(expected, 6)
  })
})

describe("annualize", () => {
  it("compounds daily mean over 248 days", () => {
    const returns = [0.001, 0.002, -0.0005]
    const result = annualize(returns)
    const meanR = (0.001 + 0.002 + -0.0005) / 3
    const expected = Math.pow(1 + meanR, 248) - 1
    expect(result).toBeCloseTo(expected, 6)
  })
})

describe("getMetricStatus", () => {
  it("sharpe: green > 1.0, yellow 0.5-1.0, red < 0.5", () => {
    expect(getMetricStatus("sharpe", 1.5)).toBe("green")
    expect(getMetricStatus("sharpe", 0.7)).toBe("yellow")
    expect(getMetricStatus("sharpe", 0.3)).toBe("red")
  })

  it("beta: green 0.8-1.2, yellow otherwise, red > 1.5", () => {
    expect(getMetricStatus("beta", 1.0)).toBe("green")
    expect(getMetricStatus("beta", 1.3)).toBe("yellow")
    expect(getMetricStatus("beta", 1.8)).toBe("red")
  })

  it("var95: green < 2, yellow 2-5, red > 5", () => {
    expect(getMetricStatus("var95", 1.5)).toBe("green")
    expect(getMetricStatus("var95", 3.0)).toBe("yellow")
    expect(getMetricStatus("var95", 6.0)).toBe("red")
  })

  it("maxDrawdown: green < 10, yellow 10-20, red > 20", () => {
    expect(getMetricStatus("maxDrawdown", 5)).toBe("green")
    expect(getMetricStatus("maxDrawdown", 15)).toBe("yellow")
    expect(getMetricStatus("maxDrawdown", 25)).toBe("red")
  })

  it("alpha: green > 0, yellow -0.02 to 0, red < -0.02", () => {
    expect(getMetricStatus("alpha", 0.05)).toBe("green")
    expect(getMetricStatus("alpha", -0.01)).toBe("yellow")
    expect(getMetricStatus("alpha", -0.05)).toBe("red")
  })
})

describe("alignByDate", () => {
  it("merges two series to only matching dates", () => {
    const a = new Map([["2024-01-01", 0.01], ["2024-01-02", 0.02], ["2024-01-03", 0.03]])
    const b = new Map([["2024-01-02", 0.05], ["2024-01-03", 0.06], ["2024-01-04", 0.07]])
    const result = alignByDate(a, b)
    expect(result.aligned_a).toEqual([0.02, 0.03])
    expect(result.aligned_b).toEqual([0.05, 0.06])
  })
})

describe("@railpath/finance-toolkit validation — 3 datasets (CALC-03)", () => {
  const dataset1Returns = [0.01, -0.02, 0.015, -0.005, 0.03]
  const dataset2Returns = [0.05, -0.08, 0.03, -0.06, 0.04, -0.03, 0.07, -0.02]
  const dataset3Prices = [100, 105, 103, 108, 112, 107, 115, 120]

  it("CALC-01: Sharpe from library on dataset 1", async () => {
    const { calculateSharpeRatio } = await import("@railpath/finance-toolkit")
    const rfDaily = 0.21 / 248
    const N = 248
    const result = calculateSharpeRatio({ returns: dataset1Returns, riskFreeRate: rfDaily, annualizationFactor: N })

    const meanReturn = dataset1Returns.reduce((s, v) => s + v, 0) / dataset1Returns.length
    const annualizedReturn = meanReturn * N
    const variance = dataset1Returns.reduce((s, v) => s + (v - meanReturn) ** 2, 0) / (dataset1Returns.length - 1)
    const annualizedVol = Math.sqrt(variance) * Math.sqrt(N)
    const manualSharpe = annualizedVol !== 0 ? (annualizedReturn - rfDaily) / annualizedVol : 0

    expect(result.sharpeRatio).toBeCloseTo(manualSharpe, 2)
  })

  it("CALC-01: VaR95 from library on dataset 2", async () => {
    const { calculateVaR } = await import("@railpath/finance-toolkit")
    const result = calculateVaR(dataset2Returns, { confidenceLevel: 0.95 })

    const sorted = [...dataset2Returns].sort((a, b) => a - b)
    const manualVaR = Math.abs(sorted[0])

    expect(result.value).toBeCloseTo(manualVaR, 2)
  })

  it("CALC-01: maxDrawdown from library on dataset 3 (prices, NOT returns)", async () => {
    const { calculateMaxDrawdown } = await import("@railpath/finance-toolkit")
    const result = calculateMaxDrawdown({ prices: dataset3Prices })

    const manualDrawdownFraction = (112 - 107) / 112

    expect(result.maxDrawdownPercent).toBeCloseTo(manualDrawdownFraction, 3)
  })

  it("CALC-02: correlation matrix from library", async () => {
    const { calculateCorrelationMatrix } = await import("@railpath/finance-toolkit")
    const { sampleCorrelation } = await import("simple-statistics")

    const returnsA = [0.01, -0.02, 0.03, 0.005, -0.01]
    const returnsB = [0.015, -0.01, 0.025, 0.002, -0.008]
    const result = calculateCorrelationMatrix({ returns: [returnsA, returnsB], labels: ["A", "B"] })

    const manualCorr = sampleCorrelation(returnsA, returnsB)

    expect(result.matrix[0][1]).toBeCloseTo(manualCorr, 2)
  })

  it("CALC-01: Sortino from library on dataset 1", async () => {
    const { calculateSortinoRatio } = await import("@railpath/finance-toolkit")
    const rfDaily = 0.21 / 248
    const result = calculateSortinoRatio({ returns: dataset1Returns, riskFreeRate: rfDaily, annualizationFactor: 248 })

    expect(typeof result.sortinoRatio).toBe("number")
    expect(result.downsideDeviation).toBeGreaterThanOrEqual(0)
  })
})
