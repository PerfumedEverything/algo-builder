import { NextResponse } from "next/server"
import { SignalChecker } from "@/server/services/signal-checker"

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const checker = new SignalChecker()
    const results = await checker.checkAll()
    const triggered = results.filter((r) => r.triggered)

    return NextResponse.json({
      checked: results.length,
      triggered: triggered.length,
      results,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    )
  }
}
