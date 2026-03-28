import Link from "next/link"
import {
  Bot,
  TrendingUp,
  Shield,
  BarChart3,
  Zap,
  LineChart,
  ArrowRight,
  ChevronRight,
  Activity,
  BrainCircuit,
  Bell,
  Wallet,
} from "lucide-react"

export const metadata = {
  title: "AculaTrade — AI-Powered Algorithmic Trading",
  description: "Алгоритмическая торговля с AI. Создавайте стратегии, анализируйте рынок, торгуйте на MOEX и Bybit.",
}

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "AI-анализ рынка",
    description: "DeepSeek AI анализирует графики и генерирует стратегии за секунды. Мультитаймфреймовый анализ с учётом индикаторов.",
  },
  {
    icon: LineChart,
    title: "Профессиональный терминал",
    description: "Графики в реальном времени, стакан, дневная статистика. Полный набор инструментов для принятия решений.",
  },
  {
    icon: Activity,
    title: "Мониторинг сигналов",
    description: "Отслеживание условий входа/выхода в реальном времени. Telegram-уведомления при срабатывании стратегии.",
  },
  {
    icon: Wallet,
    title: "Портфельная аналитика",
    description: "P&L, Sharpe, VaR, корреляции, Health Score. Всё для оценки эффективности вашего портфеля.",
  },
]

const ADVANTAGES = [
  {
    icon: Bot,
    title: "AI генерирует стратегии",
    description: "Опишите идею — AI создаст полную торговую стратегию с условиями входа, стоп-лоссом и тейк-профитом.",
  },
  {
    icon: TrendingUp,
    title: "Мульти-брокер",
    description: "T-Invest для российского рынка, Bybit для криптовалют. Единый интерфейс для всех бирж.",
  },
  {
    icon: Shield,
    title: "Безопасно",
    description: "Ваши ключи хранятся зашифрованно. Платформа не имеет доступа к выводу средств.",
  },
  {
    icon: Zap,
    title: "Бэктестинг",
    description: "Проверьте стратегию на исторических данных прежде чем торговать реальными деньгами.",
  },
]

const STATS = [
  { value: "15+", label: "Индикаторов" },
  { value: "2", label: "Биржи" },
  { value: "24/7", label: "Мониторинг" },
  { value: "AI", label: "Генерация стратегий" },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[hsl(222,33%,6%)] text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[hsl(222,33%,6%)]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <BarChart3 className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">AculaTrade</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Возможности</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Как это работает</a>
            <a href="#advantages" className="hover:text-white transition-colors">Преимущества</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-white/70 hover:text-white transition-colors hidden sm:block"
            >
              Войти
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            >
              Начать бесплатно
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(224,100%,58%,0.15),transparent_60%)]" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400 mb-8">
            <Zap className="h-3.5 w-3.5" />
            AI-powered алгоритмическая торговля
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Торгуйте умнее
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              с искусственным интеллектом
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            AI создаёт стратегии, анализирует рынок и отслеживает сигналы. Вы принимаете решения на основе данных, а не эмоций.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group rounded-xl bg-blue-600 px-8 py-3.5 text-base font-medium text-white hover:bg-blue-500 transition-all hover:shadow-[0_0_30px_hsl(224,100%,58%,0.3)] flex items-center gap-2"
            >
              Создать аккаунт
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/15 px-8 py-3.5 text-base font-medium text-white/80 hover:bg-white/5 transition-colors"
            >
              Войти в платформу
            </Link>
          </div>
        </div>

        <div className="relative mx-auto max-w-5xl mt-16">
          <div className="rounded-2xl border border-white/10 bg-[hsl(222,28%,10%)] p-2 shadow-2xl shadow-blue-500/5">
            <div className="rounded-xl bg-[hsl(222,28%,12%)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                  <div className="h-3 w-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-white/30 ml-2">aculatrade.com/terminal</span>
              </div>
              <div className="p-6 grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-3">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-lg bg-blue-600/20 px-3 py-1.5 text-sm font-mono text-blue-400">SBER</div>
                    <span className="text-2xl font-semibold font-mono">314,26 ₽</span>
                    <span className="text-sm text-emerald-400">+0,74%</span>
                  </div>
                  <div className="h-48 rounded-lg bg-gradient-to-b from-blue-600/5 to-transparent border border-white/5 flex items-end p-4 gap-1">
                    {[40, 35, 45, 42, 38, 50, 55, 48, 52, 58, 45, 60, 65, 55, 62, 70, 68, 72, 65, 75, 78, 72, 80, 76, 82, 85, 78, 88, 84, 90].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-blue-500/40"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg border border-white/5 p-3">
                    <span className="text-xs text-white/40 block mb-2">Стакан</span>
                    <div className="space-y-1">
                      {[314.62, 314.60, 314.59, 314.50].map((p) => (
                        <div key={p} className="flex justify-between text-xs">
                          <span className="text-red-400 font-mono">{p.toFixed(2)}</span>
                          <span className="text-white/30 font-mono">{Math.floor(Math.random() * 200 + 10)}</span>
                        </div>
                      ))}
                      <div className="h-px bg-white/10 my-1" />
                      {[314.28, 314.26, 314.14, 314.00].map((p) => (
                        <div key={p} className="flex justify-between text-xs">
                          <span className="text-emerald-400 font-mono">{p.toFixed(2)}</span>
                          <span className="text-white/30 font-mono">{Math.floor(Math.random() * 300 + 50)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-y border-white/5">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">{stat.value}</div>
              <div className="text-sm text-white/40">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Всё для алгоритмической торговли</h2>
            <p className="text-white/40 max-w-2xl mx-auto">
              От анализа рынка до исполнения сделок — один инструмент для всего цикла
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/5 bg-[hsl(222,28%,10%)] p-8 hover:border-blue-500/30 transition-all hover:shadow-[0_0_40px_hsl(224,100%,58%,0.05)]"
              >
                <div className="h-12 w-12 rounded-xl bg-blue-600/10 flex items-center justify-center mb-5 group-hover:bg-blue-600/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-white/40 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 px-6 bg-[hsl(222,28%,8%)]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Как это работает</h2>
            <p className="text-white/40">Три шага от идеи до торговли</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Bell,
                title: "Подключите брокера",
                description: "Введите API-токен T-Invest или Bybit. Ваши средства остаются на бирже — мы только анализируем.",
              },
              {
                step: "02",
                icon: BrainCircuit,
                title: "AI создаёт стратегию",
                description: "Опишите торговую идею в чате с AI. Он проанализирует рынок и создаст стратегию с конкретными условиями.",
              },
              {
                step: "03",
                icon: Activity,
                title: "Мониторинг и сигналы",
                description: "Платформа отслеживает условия входа в реальном времени и уведомляет в Telegram при срабатывании.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-6xl font-bold text-white/[0.03] absolute -top-4 -left-2">{item.step}</div>
                <div className="relative rounded-2xl border border-white/5 bg-[hsl(222,28%,10%)] p-8">
                  <div className="h-10 w-10 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4">
                    <item.icon className="h-5 w-5 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="advantages" className="py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Почему AculaTrade</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ADVANTAGES.map((adv) => (
              <div
                key={adv.title}
                className="rounded-2xl border border-white/5 bg-[hsl(222,28%,10%)] p-6 hover:border-blue-500/20 transition-all"
              >
                <adv.icon className="h-8 w-8 text-blue-400 mb-4" />
                <h3 className="text-base font-semibold mb-2">{adv.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{adv.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-[hsl(222,28%,8%)]">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-transparent p-12 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Начните торговать умнее</h2>
            <p className="text-white/40 max-w-xl mx-auto mb-8">
              Бесплатная регистрация. Подключите брокера и создайте первую AI-стратегию за 5 минут.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="group rounded-xl bg-blue-600 px-8 py-3.5 text-base font-medium text-white hover:bg-blue-500 transition-all hover:shadow-[0_0_30px_hsl(224,100%,58%,0.3)] flex items-center gap-2"
              >
                Создать аккаунт бесплатно
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="text-sm text-white/50 hover:text-white transition-colors"
              >
                Уже есть аккаунт? Войти
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-white/5">
        <div className="mx-auto max-w-5xl grid md:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-white/5 bg-[hsl(222,28%,10%)] p-8">
            <h3 className="text-xl font-semibold mb-3">MOEX — Российский рынок</h3>
            <p className="text-white/40 text-sm leading-relaxed mb-4">
              Акции, облигации, ETF через T-Invest API. Реалтайм котировки, стакан, история операций. Поддержка основной и вечерней сессии.
            </p>
            <div className="flex flex-wrap gap-2">
              {["SBER", "GAZP", "LKOH", "YNDX", "TCSG"].map((t) => (
                <span key={t} className="rounded-md bg-white/5 px-2.5 py-1 text-xs font-mono text-white/50">{t}</span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[hsl(222,28%,10%)] p-8">
            <h3 className="text-xl font-semibold mb-3">Bybit — Криптовалюты</h3>
            <p className="text-white/40 text-sm leading-relaxed mb-4">
              Спотовая торговля на крупнейшей криптобирже. BTC, ETH и 100+ токенов. WebSocket стриминг цен в реальном времени.
            </p>
            <div className="flex flex-wrap gap-2">
              {["BTC", "ETH", "SOL", "XRP", "DOGE"].map((t) => (
                <span key={t} className="rounded-md bg-white/5 px-2.5 py-1 text-xs font-mono text-white/50">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center">
                <BarChart3 className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-semibold">AculaTrade</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/30">
              <a href="mailto:support@aculatrade.com" className="hover:text-white/60 transition-colors">
                support@aculatrade.com
              </a>
              <Link href="/login" className="hover:text-white/60 transition-colors">
                Платформа
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-white/20">
            AculaTrade является программным обеспечением для анализа финансовых рынков. Не является инвестиционной рекомендацией.
            Торговля на финансовых рынках сопряжена с рисками потери капитала.
          </div>
        </div>
      </footer>
    </div>
  )
}
