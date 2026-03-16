"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAction } from "@/server/actions/auth"

const DEV_EMAIL = "dev@algobuilder.local"
const DEV_PASSWORD = "dev123456"
const isDev = process.env.NODE_ENV === "development"

export const LoginForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await loginAction(formData)

    if (result.success) {
      toast.success("Вход выполнен")
      router.push("/dashboard")
      router.refresh()
    } else {
      toast.error(result.error)
      setLoading(false)
    }
  }

  const handleDevLogin = () => {
    if (!formRef.current) return
    const emailInput = formRef.current.querySelector<HTMLInputElement>("[name=email]")
    const passwordInput = formRef.current.querySelector<HTMLInputElement>("[name=password]")
    if (emailInput) emailInput.value = DEV_EMAIL
    if (passwordInput) passwordInput.value = DEV_PASSWORD
    formRef.current.requestSubmit()
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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
        <Label htmlFor="password">Пароль</Label>
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
      {isDev && (
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed border-primary/50 text-primary"
          onClick={handleDevLogin}
          disabled={loading}
        >
          Dev Login ({DEV_EMAIL})
        </Button>
      )}
    </form>
  )
}
