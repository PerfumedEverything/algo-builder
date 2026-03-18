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
    const [signalResults, strategyResults] = await Promise.all([
      new SignalChecker().checkAll(),
      new StrategyChecker().checkAll(),
    ])

    return NextResponse.json({
      signals: {
        checked: signalResults.length,
        triggered: signalResults.filter((r) => r.triggered).length,
        results: signalResults,
      },
      strategies: {
        checked: strategyResults.length,
        triggered: strategyResults.filter((r) => r.triggered).length,
        results: strategyResults,
      },
    })
  } catch (e) {
    console.error("[Checker] Error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    )
  }
}
