# ТЗ для Claude Code Agent: AlgoBuilder — Трейдинг с помощью ИИ

## Метаинформация

- **Проект:** AlgoBuilder (рабочее название из прототипа)
- **Тип:** Full-stack веб-приложение
- **Подход:** Сессионная разработка, Claude Max x5
- **Референс:** Прототип на base44 (фронт-архив от заказчика)
- **Плагин:** everything-claude

---

## Решения

| Вопрос | Решение |
|--------|---------|
| БД + Auth + Storage | Supabase self-hosted |
| ORM | Prisma поверх Supabase Postgres |
| Брокер | Т-Инвестиции (единственный на MVP) |
| AI | Claude API / DeepSeek (function calling для конструктора) |
| Уведомления | Telegram Bot API |
| Платежи | Нет на MVP |
| Тарифы | Нет на MVP |

---

## Стек

### Frontend
- **Next.js 15** (App Router, Server Components, Server Actions)
- **TypeScript** (strict)
- **shadcn/ui** + **21st.dev**
- **Tailwind CSS 4**
- **react-hook-form + zod**
- **zustand** (стейт конструктора стратегий)
- **sonner** — тосты
- **lucide-react** — иконки

### Backend
- **Next.js Route Handlers**
- **Prisma ORM**
- **Supabase JS SDK** (@supabase/ssr) — Auth
- **tinkoff-invest-api** (npm) — T-Invest gRPC SDK
- **Anthropic SDK / DeepSeek API** — AI function calling
- **grammy** — Telegram Bot
- **Zod** — валидация

### Инфраструктура
- **Supabase self-hosted** (docker compose)
- **Redis** — кэш котировок, очередь проверки сигналов

---

## Архитектурные правила (для всех сессий)

### Код
```
OOP где применимо (сервисы, провайдеры — классы)
DRY — общая логика в shared-модулях
Без комментариев в коде
Naming: camelCase переменные, PascalCase компоненты/классы, kebab-case файлы
Один экспорт на файл где возможно
Barrel exports (index.ts) для каждого модуля
```

### Паттерны
```
Repository Pattern — Prisma-репозитории
Service Layer — бизнес-логика
Provider Pattern — внешние API за абстракцией (брокер, AI, уведомления)
Server Actions — мутации с фронта
Shared Zod Schemas — front+back валидация
AppError — единый класс ошибок
ApiResponse<T> — { success, data, error }
```

### Структура проекта
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── page.tsx              # Рабочий стол
│   │   ├── strategies/
│   │   │   ├── page.tsx          # Список стратегий
│   │   │   └── [id]/page.tsx     # Редактирование стратегии
│   │   ├── signals/
│   │   │   └── page.tsx          # Список сигналов
│   │   ├── broker/
│   │   │   └── page.tsx          # Подключение Т-Инвестиции
│   │   └── settings/
│   │       └── page.tsx          # Настройки + Telegram
│   └── api/
│       ├── ai/
│       ├── broker/
│       ├── signals/
│       └── webhooks/
├── core/
│   ├── config/
│   │   ├── env.ts
│   │   ├── instruments.ts        # Конфиг поддерживаемых инструментов
│   │   └── indicators.ts         # Конфиг индикаторов для конструктора
│   ├── errors/
│   │   └── app-error.ts
│   ├── types/
│   │   ├── api.ts
│   │   ├── strategy.ts           # Типы стратегии (главная доменная модель)
│   │   └── signal.ts
│   └── schemas/
│       ├── auth.ts
│       ├── strategy.ts           # Zod-схема стратегии (shared с AI)
│       └── signal.ts
├── server/
│   ├── repositories/
│   │   ├── base-repository.ts
│   │   ├── user-repository.ts
│   │   ├── strategy-repository.ts
│   │   └── signal-repository.ts
│   ├── services/
│   │   ├── strategy-service.ts
│   │   ├── signal-service.ts
│   │   ├── signal-checker.ts     # Проверка условий сигналов
│   │   └── notification-service.ts
│   ├── providers/
│   │   ├── ai/
│   │   │   ├── ai-provider.interface.ts
│   │   │   ├── claude-provider.ts
│   │   │   └── index.ts
│   │   ├── broker/
│   │   │   ├── broker-provider.interface.ts
│   │   │   ├── tinkoff-provider.ts
│   │   │   └── index.ts
│   │   └── notification/
│   │       ├── notification-provider.interface.ts
│   │       ├── telegram-provider.ts
│   │       └── index.ts
│   └── actions/
│       ├── strategy-actions.ts
│       ├── signal-actions.ts
│       └── broker-actions.ts
├── components/
│   ├── ui/                       # shadcn
│   ├── shared/
│   │   ├── instrument-picker.tsx  # Выбор инструмента с поиском
│   │   └── condition-builder.tsx  # Билдер условий (переиспользуется)
│   ├── strategy/
│   │   ├── strategy-form.tsx      # Табы: Основное/Вход/Выход/Риски
│   │   ├── ai-generator.tsx       # AI-чат сверху формы
│   │   └── strategy-card.tsx
│   ├── signal/
│   │   ├── signal-form.tsx
│   │   └── signal-card.tsx
│   ├── forms/
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   └── layouts/
│       └── dashboard-layout.tsx
├── hooks/
│   ├── use-strategy-store.ts     # Zustand store стратегии
│   └── use-broker.ts
├── lib/
│   ├── prisma.ts
│   ├── redis.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── utils.ts
└── styles/
    └── globals.css
```

---

## Prisma-схема

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String       @id @default(cuid())
  supabaseId    String       @unique
  email         String       @unique
  name          String?
  telegramChatId String?
  brokerToken   String?
  brokerAccountId String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  strategies    Strategy[]
  signals       Signal[]
}

model Strategy {
  id            String          @id @default(cuid())
  userId        String
  user          User            @relation(fields: [userId], references: [id])
  name          String
  description   String?
  status        StrategyStatus  @default(DRAFT)
  instrument    String
  instrumentType InstrumentType @default(STOCK)
  timeframe     String
  config        Json            // Полная конфигурация: entry, exit, risks
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([userId])
}

enum StrategyStatus {
  DRAFT
  ACTIVE
  PAUSED
  ARCHIVED
}

enum InstrumentType {
  STOCK
  BOND
  CURRENCY
  FUTURES
}

model Signal {
  id            String        @id @default(cuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  name          String
  description   String?
  instrument    String
  instrumentType InstrumentType @default(STOCK)
  timeframe     String
  signalType    SignalType
  conditions    Json          // Массив условий срабатывания
  channels      Json          // ["telegram"]
  isActive      Boolean       @default(true)
  lastTriggered DateTime?
  triggerCount  Int           @default(0)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([userId])
  @@index([isActive])
}

enum SignalType {
  BUY
  SELL
}

model SignalLog {
  id            String    @id @default(cuid())
  signalId      String
  instrument    String
  message       String
  triggeredAt   DateTime  @default(now())
}
```

---

## Ключевая доменная модель: Strategy Config (JSON)

Это самая важная часть — схема, которую заполняет и AI, и форма.

```typescript
// core/types/strategy.ts

type StrategyConfig = {
  entry: {
    indicator: IndicatorType
    params: Record<string, number>
    condition: ConditionType
    value?: number
  }
  exit: {
    indicator: IndicatorType
    params: Record<string, number>
    condition: ConditionType
    value?: number
  }
  risks: {
    stopLoss?: number        // процент
    takeProfit?: number      // процент
    maxPositionSize?: number // в лотах
    trailingStop?: number    // процент
  }
}

type IndicatorType =
  | "SMA"           // Simple Moving Average
  | "EMA"           // Exponential Moving Average
  | "RSI"           // Relative Strength Index
  | "MACD"          // Moving Average Convergence Divergence
  | "BOLLINGER"     // Bollinger Bands
  | "PRICE"         // Просто цена

type ConditionType =
  | "CROSSES_ABOVE"
  | "CROSSES_BELOW"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "EQUALS"
  | "BETWEEN"
```

Эта же схема = Zod-схема для валидации = function calling schema для AI.

---

## ENV-переменные

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres

# Redis
REDIS_URL=redis://localhost:6379

# AI Provider
AI_PROVIDER=claude              # claude | deepseek
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com

# T-Invest
TINKOFF_INVEST_TOKEN=
TINKOFF_SANDBOX=true            # true для тестов

# Telegram Bot
TELEGRAM_BOT_TOKEN=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Сессия 0: Инициализация

### Цель
Скелет проекта, Supabase + Redis, Prisma, структура.

### Задачи
1. Supabase self-hosted (docker compose) + Redis
2. `create-next-app` с TypeScript, Tailwind, App Router, src/
3. Установить зависимости:
   ```
   npm i @supabase/supabase-js @supabase/ssr prisma @prisma/client
   npm i tinkoff-invest-api ioredis zod zustand react-hook-form @hookform/resolvers sonner grammy
   npm i -D tsx
   npx shadcn@latest init
   ```
4. Prisma init + полная схема из ТЗ
5. Создать структуру папок
6. Базовые модули:
   - `core/config/env.ts` — zod-парсинг env
   - `core/config/indicators.ts` — массив доступных индикаторов с параметрами
   - `core/config/instruments.ts` — конфиг типов инструментов
   - `core/errors/app-error.ts`
   - `core/types/api.ts` — ApiResponse<T>
   - `core/types/strategy.ts` — StrategyConfig, IndicatorType, ConditionType
   - `core/schemas/strategy.ts` — strategyConfigSchema (zod)
   - `core/schemas/signal.ts` — signalSchema (zod)
   - `lib/prisma.ts`, `lib/redis.ts`, `lib/supabase/*`
7. `middleware.ts` — Supabase Auth
8. `prisma db push`
9. `.env.example`

### Результат
Проект запускается, структура готова, схема применена.

---

## Сессия 1: Аутентификация

### Цель
Регистрация, вход, защита роутов.

### Задачи
1. `core/schemas/auth.ts` — loginSchema, registerSchema
2. `server/repositories/user-repository.ts`
3. `server/services/auth-service.ts` — signUp, signIn, getSessionUser, ensurePrismaUser
4. `server/actions/auth-actions.ts`
5. Страницы: `app/(auth)/login`, `app/(auth)/register`
6. Компоненты: `login-form.tsx`, `register-form.tsx`
7. `middleware.ts` — защита /dashboard/*
8. shadcn: Card, Input, Button, Label

### Результат
Регистрация → Supabase Auth + Prisma User. Защита роутов.

---

## Сессия 2: Рабочий стол + Dashboard Layout

### Цель
Основной layout приложения и рабочий стол как в прототипе.

### Задачи
1. **Dashboard Layout** (`components/layouts/dashboard-layout.tsx`):
   - Сайдбар как в прототипе:
     - Рабочий стол
     - Стратегии
     - Сигналы
     - API Интеграция (подключение брокера)
     - Настройки
   - Хедер: имя пользователя
   - Тёмная тема (как в прототипе)
   - Mobile: Sheet для сайдбара

2. **Рабочий стол** (`app/(dashboard)/page.tsx`):
   - Карточки-виджеты:
     - Активных стратегий: N
     - Активных сигналов: N
     - Срабатываний сигналов за сегодня: N
     - Статус брокера: подключен/нет
   - Последние срабатывания сигналов (таблица, 5-10 записей)
   - Быстрые действия: "Создать стратегию", "Создать сигнал"

3. Server Actions для получения статистики

### UI
- shadcn: Card, Table, Badge, Button, Sheet, Avatar
- 21st.dev: sidebar
- Тёмная тема — фиолетовые/зелёные акценты как в прототипе

### Результат
Пользователь видит дашборд с виджетами статистики и навигацией.

---

## Сессия 3: Конструктор стратегий + AI-генератор

### Цель
Главная фича — форма стратегии с AI-чатом.

### Задачи

1. **Zustand store** (`hooks/use-strategy-store.ts`):
   - Хранит текущее состояние формы стратегии (StrategyConfig)
   - Методы: setEntry, setExit, setRisks, setFromAI(config), reset

2. **AI Provider** (`server/providers/ai/`):
   ```typescript
   interface AiProviderInterface {
     generateStrategy(prompt: string): Promise<StrategyConfig>
   }
   ```
   - ClaudeProvider — через Anthropic SDK с function calling
   - System prompt: описание доступных индикаторов, условий, формат ответа
   - Function/tool: `fill_strategy` с zod-схемой strategyConfigSchema
   - AI возвращает структурированный JSON → store обновляется → форма заполняется

3. **AI Generator** (`components/strategy/ai-generator.tsx`):
   - Textarea + кнопка "Сгенерировать стратегию"
   - Плейсхолдер: "Например: трендовая стратегия для BTCUSD с использованием пересечения EMA и подтверждением RSI"
   - При генерации: loading → результат применяется к форме
   - Фиолетовый блок сверху формы (как в прототипе)

4. **Strategy Form** (`components/strategy/strategy-form.tsx`):
   - **Таб Основное:** название, статус (Draft/Active), описание, тип инструмента (Select), таймфрейм (Select), инструмент (InstrumentPicker с поиском), подключённый брокер
   - **Таб Вход:** индикатор (Select из конфига), параметры индикатора (динамические поля), условие (Select), значение
   - **Таб Выход:** аналогично табу Вход
   - **Таб Риски:** стоп-лосс %, тейк-профит %, макс размер позиции, трейлинг-стоп %
   - Все поля двусторонне связаны с zustand store
   - Кнопки: Сохранить, Отмена

5. **InstrumentPicker** (`components/shared/instrument-picker.tsx`):
   - Поиск по тикеру/названию
   - Список с бейджами (Tech, Finance и т.д.)
   - Данные: из T-Invest API (кэш в Redis) или статический конфиг на MVP

6. **Список стратегий** (`app/(dashboard)/strategies/page.tsx`):
   - Карточки стратегий: название, инструмент, статус-бейдж, дата
   - Кнопка "Новая стратегия" → модалка или отдельная страница
   - Фильтр по статусу

7. Server Actions:
   - `createStrategyAction`, `updateStrategyAction`, `deleteStrategyAction`
   - `generateStrategyAction` — вызов AI provider

8. API endpoint:
   - `POST /api/ai/generate-strategy` — для стриминга ответа AI (опционально)

### Результат
Пользователь пишет промпт → AI заполняет форму → пользователь корректирует → сохраняет стратегию.

---

## Сессия 4: Конструктор сигналов

### Цель
Создание и управление сигналами.

### Задачи

1. **Signal Form** (`components/signal/signal-form.tsx`):
   - Название сигнала
   - Описание
   - Тип инструмента (Select) + InstrumentPicker
   - Таймфрейм (Select)
   - Тип сигнала: Buy / Sell (Select)
   - **Условия срабатывания** — динамический список:
     - Кнопка "+ Добавить условие"
     - Каждое условие: индикатор (Select) + параметры + условие (> < = пересечение) + значение
     - Удаление условия
   - Каналы уведомлений: чекбокс Telegram (на MVP только он)
   - Кнопки: Создать сигнал, Отмена

2. **ConditionBuilder** (`components/shared/condition-builder.tsx`):
   - Переиспользуемый компонент для построения условий
   - Используется и в сигналах, и потенциально в стратегиях (табы Вход/Выход)
   - Динамическое добавление/удаление строк условий

3. **Список сигналов** (`app/(dashboard)/signals/page.tsx`):
   - Карточки: название, инструмент, тип (Buy/Sell бейдж), статус (Active/Paused), кол-во срабатываний
   - Toggle активности (Switch)
   - Кнопка "Создать сигнал" → модалка

4. Server Actions:
   - `createSignalAction`, `updateSignalAction`, `deleteSignalAction`, `toggleSignalAction`

### Результат
Пользователь создаёт сигнал с условиями, включает/выключает, видит список.

---

## Сессия 5: Интеграция Т-Инвестиции

### Цель
Подключение брокера, получение данных портфеля и котировок.

### Задачи

1. **Broker Provider** (`server/providers/broker/`):
   ```typescript
   interface BrokerProviderInterface {
     connect(token: string): Promise<void>
     getAccounts(): Promise<Account[]>
     getPortfolio(accountId: string): Promise<Portfolio>
     getInstruments(type: InstrumentType): Promise<Instrument[]>
     getCandles(params: CandleParams): Promise<Candle[]>
     getCurrentPrice(instrumentId: string): Promise<number>
   }
   ```

2. **TinkoffProvider** — реализация:
   - `npm i tinkoff-invest-api`
   - Подключение по токену пользователя
   - Sandbox-режим для тестов (env: TINKOFF_SANDBOX=true)
   - Получение списка счетов
   - Получение портфеля (позиции, баланс)
   - Получение списка инструментов (акции, облигации, валюты)
   - Получение свечей (исторические данные)
   - Получение текущей цены
   - Кэширование инструментов в Redis (TTL 24h)

3. **Страница подключения брокера** (`app/(dashboard)/broker/page.tsx`):
   - Поле для ввода токена T-Invest API
   - Инструкция: как получить токен (ссылка на tinkoff.ru/invest)
   - Кнопка "Подключить" → проверка токена → сохранение
   - После подключения: отображение счетов, выбор активного
   - Карточка портфеля: список позиций, общая стоимость

4. Server Actions:
   - `connectBrokerAction(token)` — проверить + сохранить
   - `getPortfolioAction` — получить портфель
   - `getInstrumentsAction(type)` — список инструментов

5. Безопасность:
   - Токен брокера шифровать перед сохранением в БД
   - Никогда не отдавать токен на фронт

### Результат
Пользователь вводит токен → видит свой портфель → инструменты доступны в конструкторах.

---

## Сессия 6: Telegram-уведомления + Проверка сигналов

### Цель
ТГ-бот для уведомлений, фоновая проверка условий сигналов.

### Задачи

1. **Notification Provider** (`server/providers/notification/`):
   ```typescript
   interface NotificationProviderInterface {
     send(chatId: string, message: string): Promise<void>
   }
   ```

2. **TelegramProvider** — реализация через grammy:
   - Бот с командой /start → возвращает chatId
   - Пользователь копирует chatId в настройки
   - Отправка сообщения с форматированием (Markdown)

3. **Страница настроек** (`app/(dashboard)/settings/page.tsx`):
   - Имя пользователя
   - Telegram Chat ID (input + инструкция "напишите /start боту @AlgoBuilderBot")
   - Кнопка "Проверить" — отправить тестовое сообщение
   - Email (только чтение)
   - Кнопка "Выйти"

4. **Signal Checker** (`server/services/signal-checker.ts`):
   - Класс, который периодически проверяет активные сигналы
   - Для каждого сигнала: получить текущую цену → проверить условия → если сработало → уведомить
   - Запись в SignalLog при срабатывании
   - Запуск: cron через `node-cron` или отдельный скрипт-воркер

5. **API endpoint для cron:**
   - `POST /api/signals/check` — вызывается по расписанию
   - Или `scripts/signal-worker.ts` — отдельный процесс

6. **Формат уведомления в ТГ:**
   ```
   🔔 Сигнал: [название]
   📊 [инструмент] — [Buy/Sell]
   💰 Цена: [текущая цена]
   📋 Условие: [описание]
   🕐 [время]
   ```

### Результат
Активные сигналы проверяются по расписанию, при срабатывании — уведомление в Telegram.

---

## Сессия 7: Полировка и деплой

### Цель
Баг-фиксы, edge cases, продакшен.

### Задачи

1. **Error boundaries:** error.tsx, not-found.tsx
2. **Loading states:** скелетоны на всех страницах
3. **Edge cases:**
   - Брокер не подключен → показать CTA на странице стратегий
   - Telegram не настроен → предупреждение при создании сигнала
   - Токен брокера протух → понятное сообщение + кнопка переподключения
   - Двойной клик на кнопках → disable
   - AI не ответил / ошибка → fallback сообщение
4. **Disclaimer:** "Не является инвестиционной рекомендацией" — на каждой странице в футере
5. **Dockerfile** + docker-compose.prod.yml
6. **Seed-скрипт:** тестовый пользователь + 2 стратегии + 3 сигнала
7. **README.md**

### Результат
Проект готов к деплою.

---

## Правила для агента

### Общие
```
Не пиши комментарии в коде
Не используй any — создай тип
Не используй default export кроме page.tsx, layout.tsx
Каждый файл — одна ответственность
Максимум 150 строк на файл
Early return вместо вложенных if
Ошибки через new AppError(message, statusCode)
Server Actions: try/catch → ApiResponse<T>
Supabase — только Auth. Prisma — все данные
```

### Именование
```
Файлы: kebab-case
Компоненты: PascalCase
Хуки: camelCase с use
Типы: PascalCase
Zod-схемы: camelCase + Schema
Server Actions: camelCase + Action
Enum: UPPER_SNAKE_CASE
```

### Импорты (порядок)
```
1. React / Next.js
2. Внешние библиотеки
3. @/core/*
4. @/server/*
5. @/components/*
6. @/hooks/*
7. @/lib/*
8. Относительные
```

### Компоненты
```
Arrow functions
Props деструктурируются в аргументах
type ComponentNameProps = { ... }
Не использовать React.FC
Сложная логика → хук
Формы → react-hook-form + zodResolver
```

### Масштабирование (задел на будущее)
```
Провайдер брокера абстрагирован — добавить другого брокера = новый класс
Провайдер AI абстрагирован — переключение Claude/DeepSeek через env
Провайдер уведомлений абстрагирован — Email/Push добавляются как новый класс
StrategyConfig в JSON — расширяется без миграций
Индикаторы в конфиге — добавить новый = строка в массив
```

---

## Промпт для начала каждой сессии

```
Контекст: проект AlgoBuilder — трейдинг с помощью ИИ.
Сессия N из 7.

Стек: Next.js 15 (App Router) + Supabase self-hosted (Auth) + Prisma + PostgreSQL + Redis + tinkoff-invest-api + Claude/DeepSeek API + grammy (Telegram) + shadcn/ui + 21st.dev.

[Вставить блок "Архитектурные правила"]
[Вставить блок "Правила для агента"]
[Вставить блок текущей сессии]

Предыдущие сессии завершены.
Текущая структура: [tree src/ --dirsfirst -I node_modules]
```

---

## Оценка

| Сессия | Описание | Часы |
|--------|----------|------|
| 0 | Инициализация | 1-2 |
| 1 | Аутентификация | 2-3 |
| 2 | Рабочий стол + Layout | 3-4 |
| 3 | Конструктор стратегий + AI | 5-7 |
| 4 | Конструктор сигналов | 3-4 |
| 5 | Интеграция Т-Инвестиции | 3-4 |
| 6 | Telegram + проверка сигналов | 3-4 |
| 7 | Полировка + деплой | 2-3 |
| **Итого** | | **~22-31** |
