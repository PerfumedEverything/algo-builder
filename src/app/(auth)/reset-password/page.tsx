"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resetPasswordAction } from "@/server/actions/auth"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const password = formData.get("password") as string
    const confirm = formData.get("confirm") as string

    if (password !== confirm) {
      toast.error("Пароли не совпадают")
      return
    }

    setLoading(true)
    try {
      const result = await resetPasswordAction(formData)
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Новый пароль</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Придумайте новый пароль для вашего аккаунта
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Новый пароль</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Минимум 6 символов"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Повторите пароль</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              placeholder="Повторите пароль"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Сохранение..." : "Сохранить пароль"}
          </Button>
        </form>
      </div>
    </div>
  )
}
