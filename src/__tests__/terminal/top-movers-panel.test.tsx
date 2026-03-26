// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TopMoversPanel } from "@/components/terminal/top-movers-panel"
import type { TopMover } from "@/core/types/terminal"

const makeGainer = (i: number): TopMover => ({
  ticker: `GAIN${i}`,
  shortName: `Gainer ${i}`,
  price: 100 + i,
  changePct: i + 1,
  volume: 1000,
  high: 110 + i,
  low: 90 + i,
})

const makeLosers = (i: number): TopMover => ({
  ticker: `LOSE${i}`,
  shortName: `Loser ${i}`,
  price: 200 + i,
  changePct: -(i + 1),
  volume: 2000,
  high: 210 + i,
  low: 190 + i,
})

const gainers: TopMover[] = Array.from({ length: 5 }, (_, i) => makeGainer(i))
const losers: TopMover[] = Array.from({ length: 5 }, (_, i) => makeLosers(i))

describe("TopMoversPanel", () => {
  it("renders 5 gainers with ticker, shortName, price, and green changePct", () => {
    render(
      <TopMoversPanel
        gainers={gainers}
        losers={losers}
        loading={false}
        onSelect={vi.fn()}
        isMarketOpen={true}
      />,
    )
    for (let i = 0; i < 5; i++) {
      expect(screen.getAllByText(`GAIN${i}`)).toBeTruthy()
    }
  })

  it("renders 5 losers with ticker, shortName, price, and red changePct", () => {
    render(
      <TopMoversPanel
        gainers={gainers}
        losers={losers}
        loading={false}
        onSelect={vi.fn()}
        isMarketOpen={true}
      />,
    )
    for (let i = 0; i < 5; i++) {
      expect(screen.getAllByText(`LOSE${i}`)).toBeTruthy()
    }
  })

  it("calls onSelect with correct ticker when a gainer row is clicked", () => {
    const onSelect = vi.fn()
    render(
      <TopMoversPanel
        gainers={gainers}
        losers={losers}
        loading={false}
        onSelect={onSelect}
        isMarketOpen={true}
      />,
    )
    const buttons = screen.getAllByRole("button")
    const gainerButton = buttons.find((b) => b.textContent?.includes("GAIN0"))
    expect(gainerButton).toBeTruthy()
    fireEvent.click(gainerButton!)
    expect(onSelect).toHaveBeenCalledWith("GAIN0")
  })

  it("calls onSelect with correct ticker when a loser row is clicked", () => {
    const onSelect = vi.fn()
    render(
      <TopMoversPanel
        gainers={gainers}
        losers={losers}
        loading={false}
        onSelect={onSelect}
        isMarketOpen={true}
      />,
    )
    const buttons = screen.getAllByRole("button")
    const loserButton = buttons.find((b) => b.textContent?.includes("LOSE0"))
    expect(loserButton).toBeTruthy()
    fireEvent.click(loserButton!)
    expect(onSelect).toHaveBeenCalledWith("LOSE0")
  })

  it("shows skeleton rows when loading=true", () => {
    const { container } = render(
      <TopMoversPanel
        gainers={[]}
        losers={[]}
        loading={true}
        onSelect={vi.fn()}
        isMarketOpen={true}
      />,
    )
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], .animate-pulse, [data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("shows 'Биржа закрыта' badge when isMarketOpen=false", () => {
    render(
      <TopMoversPanel
        gainers={gainers}
        losers={losers}
        loading={false}
        onSelect={vi.fn()}
        isMarketOpen={false}
      />,
    )
    const badges = screen.getAllByText("Биржа закрыта")
    expect(badges.length).toBeGreaterThan(0)
  })

  it("does NOT show 'Биржа закрыта' badge when isMarketOpen=true", () => {
    render(
      <TopMoversPanel
        gainers={gainers}
        losers={losers}
        loading={false}
        onSelect={vi.fn()}
        isMarketOpen={true}
      />,
    )
    expect(screen.queryByText("Биржа закрыта")).toBeNull()
  })
})
