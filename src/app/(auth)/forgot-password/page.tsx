"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { forgotPasswordAction } from "@/server/actions/auth"

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await forgotPasswordAction(new FormData(e.currentTarget))
      if (result.success) {
        setSent(true)
      } else {
        toast.error(result.error || "Ошибка отправки письма")
      }
    } catch {
      toast.error("Ошибка подключения к серверу")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Назад ко входу
        </Link>

        <div>
          <h1 className="text-2xl font-bold">Восстановление пароля</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Введите email — мы отправим ссылку для сброса пароля
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
            Письмо отправлено. Проверьте почту и перейдите по ссылке для сброса пароля.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Отправка..." : "Отправить ссылку"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
