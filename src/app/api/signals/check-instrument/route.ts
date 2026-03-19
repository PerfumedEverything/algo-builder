import { NextResponse } from "next/server"
import { SignalChecker } from "@/server/services/signal-checker"
import { StrategyChecker } from "@/server/services/strategy-checker"

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { instrumentId, price } = (await request.json()) as {
      instrumentId: string
      price: number
    }

    if (!instrumentId || typeof price !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const [signalResults, strategyResults] = await Promise.all([
      new SignalChecker().checkByInstrument(instrumentId, price),
      new StrategyChecker().checkByInstrument(instrumentId, price),
    ])

    const triggered = [
      ...signalResults.filter((r) => r.triggered),
      ...strategyResults.filter((r) => r.triggered),
    ]

    return NextResponse.json({
      instrument: instrumentId,
      price,
      signals: { checked: signalResults.length, triggered: signalResults.filter((r) => r.triggered).length },
      strategies: { checked: strategyResults.length, triggered: strategyResults.filter((r) => r.triggered).length },
      totalTriggered: triggered.length,
    })
  } catch (e) {
    console.error("[CheckInstrument] Error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    )
  }
}
