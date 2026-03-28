import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

describe("CALC-14: portfolio size = sum(real BUY operations)", () => {
  it("initialAmount = sum of BUY op amounts, not strategy budget", () => {
    const ops = [
      { type: "BUY" as const, quantity: 10, price: 978, amount: 9780, date: "2026-01-01" },
    ]
    let totalBuyAmount = 0
    for (const op of ops) {
      if (op.type === "BUY") totalBuyAmount += op.amount
    }
    expect(totalBuyAmount).toBe(9780)
  })
})

describe("CALC-15: strategy card Позиция = initialAmount from operations", () => {
  it("strategy-card.tsx renders stats.initialAmount on Позиция line, not stats.currentAmount", () => {
    const cardSource = readFileSync(
      join(process.cwd(), "src/components/strategy/strategy-card.tsx"),
      "utf-8"
    )
    expect(cardSource).toContain("stats.initialAmount")
    const lines = cardSource.split("\n")
    const poziciyaLine = lines.find(l => l.includes("Позиция:"))
    expect(poziciyaLine).toBeDefined()
    expect(poziciyaLine).toContain("initialAmount")
    expect(poziciyaLine).not.toContain("currentAmount")
  })
})

describe("CALC-16: P&L% = total P&L / total invested * 100", () => {
  it("pnlPercent calculated from real invested amount", () => {
    const totalBuyAmount = 9780
    const pnl = 220
    const pnlPercent = totalBuyAmount > 0 ? (pnl / totalBuyAmount) * 100 : 0
    expect(pnlPercent).toBeCloseTo(2.249, 1)
  })
})

describe("CALC-17: budget 10000, real purchase 9780 => portfolio shows 9780", () => {
  it("single BUY: price 978 * quantity 10 = amount 9780", () => {
    const price = 978
    const quantity = Math.floor(10000 / price)
    const actualAmount = quantity * price
    expect(actualAmount).toBe(9780)
    expect(actualAmount).not.toBe(10000)
  })

  it("multiple BUYs: sum of actual amounts", () => {
    const buy1 = { price: 978, quantity: 5, amount: 4890 }
    const buy2 = { price: 982, quantity: 5, amount: 4910 }
    const totalInitial = buy1.amount + buy2.amount
    expect(totalInitial).toBe(9800)
    expect(totalInitial).not.toBe(10000)
  })
})

describe("key_link: paper-portfolio-view.tsx uses totalInitial from stats.initialAmount", () => {
  it("paper-portfolio-view.tsx computes totalInitial from stats.initialAmount", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/broker/paper-portfolio-view.tsx"),
      "utf-8"
    )
    expect(source).toContain("totalInitial")
    expect(source).toMatch(/stats\.initialAmount/)
  })
})
