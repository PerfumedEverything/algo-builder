// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

vi.mock('@/server/actions/grid-actions', () => ({
  createGridAction: vi.fn(),
  stopGridAction: vi.fn(),
  getGridStatusAction: vi.fn(),
  suggestGridParamsAction: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('lightweight-charts', () => ({
  LineStyle: { Dashed: 2 },
}))

import {
  createGridAction,
  stopGridAction,
  getGridStatusAction,
  suggestGridParamsAction,
} from '@/server/actions/grid-actions'
import { useGridLevelsOverlay } from '@/app/(dashboard)/terminal/_components/grid-levels-overlay'
import { calculateGridLevels } from '@/lib/grid-calculator'

const mockCreatePriceLine = vi.fn()
const mockRemovePriceLine = vi.fn()

function makeSeriesRef() {
  return {
    current: {
      createPriceLine: mockCreatePriceLine,
      removePriceLine: mockRemovePriceLine,
    },
  }
}

function makeChartRef() {
  return { current: {} }
}

const sampleLevels = [
  { price: 100, side: 'BUY' as const, status: 'PENDING' as const, index: 0 },
  { price: 120, side: 'BUY' as const, status: 'PENDING' as const, index: 1 },
  { price: 140, side: 'SELL' as const, status: 'PENDING' as const, index: 2 },
]

describe('calculateGridLevels (client-safe)', () => {
  it('arithmetic: 3 levels between 100 and 200', () => {
    const levels = calculateGridLevels(100, 200, 3, 'ARITHMETIC')
    expect(levels).toHaveLength(3)
    expect(levels[0]).toBeCloseTo(100)
    expect(levels[1]).toBeCloseTo(150)
    expect(levels[2]).toBeCloseTo(200)
  })

  it('geometric: 3 levels between 100 and 400', () => {
    const levels = calculateGridLevels(100, 400, 3, 'GEOMETRIC')
    expect(levels).toHaveLength(3)
    expect(levels[0]).toBeCloseTo(100)
    expect(levels[1]).toBeCloseTo(200)
    expect(levels[2]).toBeCloseTo(400)
  })
})

describe('useGridLevelsOverlay', () => {
  beforeEach(() => {
    mockCreatePriceLine.mockReturnValue({})
    mockRemovePriceLine.mockReturnValue(undefined)
    vi.clearAllMocks()
  })

  it('Test 1: enabled=true with levels — calls createPriceLine for each level', () => {
    mockCreatePriceLine.mockReturnValue({})
    const seriesRef = makeSeriesRef()
    const chartRef = makeChartRef()

    renderHook(() =>
      useGridLevelsOverlay({
        chartRef: chartRef as never,
        seriesRef: seriesRef as never,
        levels: sampleLevels,
        enabled: true,
      }),
    )

    expect(mockCreatePriceLine).toHaveBeenCalledTimes(sampleLevels.length)
  })

  it('Test 2: when levels change, removes old price lines and creates new ones', () => {
    const mockLine1 = { id: 'line1' }
    const mockLine2 = { id: 'line2' }
    const mockLine3 = { id: 'line3' }
    mockCreatePriceLine
      .mockReturnValueOnce(mockLine1)
      .mockReturnValueOnce(mockLine2)
      .mockReturnValueOnce(mockLine3)

    const seriesRef = makeSeriesRef()
    const chartRef = makeChartRef()

    const { rerender } = renderHook(
      ({ levels }) =>
        useGridLevelsOverlay({
          chartRef: chartRef as never,
          seriesRef: seriesRef as never,
          levels,
          enabled: true,
        }),
      { initialProps: { levels: sampleLevels } },
    )

    expect(mockCreatePriceLine).toHaveBeenCalledTimes(3)

    const newLevels = [
      { price: 200, side: 'BUY' as const, status: 'PENDING' as const, index: 0 },
    ]

    mockCreatePriceLine.mockReturnValueOnce({ id: 'newline1' })
    rerender({ levels: newLevels })

    expect(mockRemovePriceLine).toHaveBeenCalledTimes(3)
    expect(mockCreatePriceLine).toHaveBeenCalledTimes(4)
  })

  it('Test 3: enabled=false — removes all price lines', () => {
    const mockLine = { id: 'line1' }
    mockCreatePriceLine.mockReturnValue(mockLine)

    const seriesRef = makeSeriesRef()
    const chartRef = makeChartRef()

    const { rerender } = renderHook(
      ({ enabled }) =>
        useGridLevelsOverlay({
          chartRef: chartRef as never,
          seriesRef: seriesRef as never,
          levels: sampleLevels,
          enabled,
        }),
      { initialProps: { enabled: true } },
    )

    expect(mockCreatePriceLine).toHaveBeenCalledTimes(3)

    rerender({ enabled: false })

    expect(mockRemovePriceLine).toHaveBeenCalled()
    expect(mockCreatePriceLine).toHaveBeenCalledTimes(3)
  })
})

describe('GridForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createGridAction).mockResolvedValue({ success: true, data: { gridId: 'grid-123' } })
    vi.mocked(suggestGridParamsAction).mockResolvedValue({
      success: true,
      data: {
        lowerPrice: 90,
        upperPrice: 110,
        gridLevels: 5,
        amountPerOrder: 50,
        gridDistribution: 'ARITHMETIC',
        feeRate: 0.001,
        reasoning: 'Test reasoning',
      },
    })
    vi.mocked(getGridStatusAction).mockResolvedValue({
      success: true,
      data: {
        orders: [],
        stats: { totalBuys: 0, totalSells: 0, realizedPnl: 0 },
      },
    })
  })

  it('Test 4: on submit with valid params, calls createGridAction with type GRID', async () => {
    const { GridForm } = await import('@/app/(dashboard)/terminal/_components/grid-form')

    const onSuccess = vi.fn()
    const { getByRole, getByLabelText } = render(
      React.createElement(GridForm, {
        instrument: 'BTCUSDT',
        instrumentId: 'BTC-figi',
        instrumentType: 'SPOT',
        currentPrice: 100,
        onSuccess,
      }),
    )

    fireEvent.change(getByLabelText(/нижняя цена/i), { target: { value: '90', valueAsNumber: 90 } })
    fireEvent.change(getByLabelText(/верхняя цена/i), { target: { value: '110', valueAsNumber: 110 } })
    fireEvent.change(getByLabelText(/уровней/i), { target: { value: '5', valueAsNumber: 5 } })
    fireEvent.change(getByLabelText(/usdt на уровень/i), { target: { value: '50', valueAsNumber: 50 } })

    const submitBtn = getByRole('button', { name: /запустить grid bot/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(createGridAction).toHaveBeenCalled()
      const callArg = vi.mocked(createGridAction).mock.calls[0][0]
      expect(callArg.config.type).toBe('GRID')
    })
  })

  it('Test 5: AI suggest button calls suggestGridParamsAction', async () => {
    const { GridForm } = await import('@/app/(dashboard)/terminal/_components/grid-form')

    const { getByRole } = render(
      React.createElement(GridForm, {
        instrument: 'BTCUSDT',
        instrumentId: 'BTC-figi',
        instrumentType: 'SPOT',
        currentPrice: 100,
        onSuccess: vi.fn(),
      }),
    )

    const aiBtn = getByRole('button', { name: /ai подбор/i })
    fireEvent.click(aiBtn)

    await waitFor(() => {
      expect(suggestGridParamsAction).toHaveBeenCalledWith(
        expect.objectContaining({ instrumentId: 'BTC-figi', instrument: 'BTCUSDT' }),
      )
    })
  })
})

describe('GridMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getGridStatusAction).mockResolvedValue({
      success: true,
      data: {
        orders: [],
        stats: { totalBuys: 0, totalSells: 0, realizedPnl: 0 },
      },
    })
    vi.mocked(stopGridAction).mockResolvedValue({
      success: true,
      data: { cancelledCount: 2, stats: { totalBuys: 1, totalSells: 1, realizedPnl: 5.5 } },
    })
  })

  it('Test 6: stop button calls stopGridAction with gridId', async () => {
    const { GridMonitor } = await import('@/app/(dashboard)/terminal/_components/grid-monitor')

    const onStop = vi.fn()
    render(
      React.createElement(GridMonitor, { gridId: 'grid-abc', onStop }),
    )

    await waitFor(() => {
      expect(getGridStatusAction).toHaveBeenCalledWith('grid-abc')
    }, { timeout: 3000 })

    const stopBtn = screen.getByRole('button', { name: /остановить grid bot/i })
    fireEvent.click(stopBtn)

    const confirmBtn = await screen.findByRole('button', { name: /^остановить$/i }, { timeout: 2000 })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(stopGridAction).toHaveBeenCalledWith('grid-abc')
    }, { timeout: 3000 })
  })

  it('Test 7: polls getGridStatusAction on 5s interval', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    const { GridMonitor } = await import('@/app/(dashboard)/terminal/_components/grid-monitor')

    render(
      React.createElement(GridMonitor, { gridId: 'grid-poll', onStop: vi.fn() }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    const initialCallCount = vi.mocked(getGridStatusAction).mock.calls.length
    expect(initialCallCount).toBeGreaterThanOrEqual(1)

    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    expect(vi.mocked(getGridStatusAction).mock.calls.length).toBeGreaterThan(initialCallCount)
    vi.useRealTimers()
  }, 10000)
})
