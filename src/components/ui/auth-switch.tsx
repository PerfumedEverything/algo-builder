"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { LoginForm } from "@/components/forms/login-form"
import { RegisterForm } from "@/components/forms/register-form"

export const AuthSwitch = () => {
  const [isSignUp, setIsSignUp] = useState(false)

  return (
    <div
        className={cn(
          "auth-container border border-border/50 bg-card shadow-2xl",
          isSignUp && "sign-up-mode"
        )}
      >
        <div className="auth-forms">
          <div className="auth-signin-signup">
            <div className="auth-form-wrapper auth-form-signin">
              <h2 className="mb-2 text-2xl font-bold">Вход</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Войдите в свой аккаунт
              </p>
              <div className="w-full max-w-[340px]">
                <LoginForm />
              </div>
            </div>
            <div className="auth-form-wrapper auth-form-signup">
              <h2 className="mb-2 text-2xl font-bold">Регистрация</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Создайте новый аккаунт
              </p>
              <div className="w-full max-w-[340px]">
                <RegisterForm />
              </div>
            </div>
          </div>
        </div>

        <div className="auth-panels">
          <div className="auth-panel auth-panel-left">
            <div className="auth-panel-content">
              <h3 className="mb-2 text-2xl font-bold">Впервые здесь?</h3>
              <p className="mb-4 text-sm text-white/80">
                Присоединяйтесь к AlgoBuilder и создавайте торговые стратегии с
                помощью AI.
              </p>
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="rounded-full border-2 border-white/60 bg-transparent px-8 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition-all hover:bg-white/10 hover:-translate-y-0.5"
              >
                Регистрация
              </button>
            </div>
          </div>
          <div className="auth-panel auth-panel-right">
            <div className="auth-panel-content">
              <h3 className="mb-2 text-2xl font-bold">Уже с нами?</h3>
              <p className="mb-4 text-sm text-white/80">
                Войдите в аккаунт чтобы продолжить работу с вашими стратегиями.
              </p>
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="rounded-full border-2 border-white/60 bg-transparent px-8 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition-all hover:bg-white/10 hover:-translate-y-0.5"
              >
                Войти
              </button>
            </div>
          </div>
        </div>
    </div>
  )
}
