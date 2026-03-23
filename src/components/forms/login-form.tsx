"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAction } from "@/server/actions/auth"

export const LoginForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const result = await loginAction(formData)

      if (result.success) {
        toast.success("Вход выполнен")
        router.push("/dashboard")
        router.refresh()
      } else {
        toast.error(result.error || "Ошибка входа")
        setLoading(false)
      }
    } catch {
      toast.error("Ошибка подключения к серверу")
      setLoading(false)
    }
  }

  return (
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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Пароль</Label>
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Забыл пароль?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Минимум 6 символов"
          required
          minLength={6}
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Вход..." : "Войти"}
      </Button>
    </form>
  )
}
