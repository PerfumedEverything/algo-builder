"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { ArrowLeft, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestPasswordOtpAction } from "@/server/actions/auth"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await requestPasswordOtpAction(email)
      if (result.success) {
        toast.success("Если аккаунт найден и Telegram подключён — код отправлен")
        sessionStorage.setItem("reset_email", email)
        router.push("/reset-password")
      } else {
        toast.error(result.error || "Ошибка отправки кода")
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
            Введите email — мы отправим код в Telegram
          </p>
        </div>

        <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm">
          <div className="flex items-start gap-2">
            <Send className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
            <p className="text-muted-foreground">
              Код будет отправлен в Telegram. Убедитесь, что бот{" "}
              <a
                href="https://t.me/AculaTradeNot_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sky-400 underline underline-offset-2 hover:text-sky-300"
              >
                @AculaTradeNot_bot
              </a>{" "}
              подключён в настройках профиля.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
            {loading ? "Отправка..." : "Отправить код"}
          </Button>
        </form>
      </div>
    </div>
  )
}
