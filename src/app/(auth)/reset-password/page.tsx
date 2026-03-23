"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resetPasswordWithOtpAction } from "@/server/actions/auth"

const ResetPasswordForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("reset_email") ?? ""
    return ""
  })
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают")
      return
    }

    setLoading(true)
    try {
      const result = await resetPasswordWithOtpAction(email, code, newPassword, confirmPassword)
      if (result.success) {
        toast.success("Пароль успешно изменён")
        router.push("/login")
      } else {
        toast.error(result.error || "Ошибка сброса пароля")
      }
    } catch {
      toast.error("Ошибка подключения к серверу")
    } finally {
      setLoading(false)
    }
  }

  const isValid = email.trim() && code.length === 6 && newPassword.length >= 8 && confirmPassword

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/forgot-password" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>

        <div>
          <h1 className="text-2xl font-bold">Новый пароль</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Введите код из Telegram и новый пароль
          </p>
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
          <div className="space-y-2">
            <Label htmlFor="code">Код из Telegram</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-значный код"
              required
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="text-center text-lg tracking-widest"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Новый пароль</Label>
            <Input
              id="password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Минимум 8 символов"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Повторите пароль</Label>
            <Input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !isValid}>
            {loading ? "Сохранение..." : "Сохранить пароль"}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
