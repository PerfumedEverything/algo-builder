"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>
      <h2 className="text-xl font-bold">Что-то пошло не так</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {error.message || "Произошла непредвиденная ошибка. Попробуйте обновить страницу."}
      </p>
      <Button onClick={reset} className="mt-6">
        <RefreshCw className="mr-2 h-4 w-4" />
        Попробовать снова
      </Button>
    </div>
  )
}
