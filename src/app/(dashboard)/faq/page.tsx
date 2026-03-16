"use client"

import { useState, useMemo } from "react"
import { Search, HelpCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { faqCategories } from "@/core/config/faq"
import { cn } from "@/lib/utils"

export default function FaqPage() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return faqCategories

    const query = search.toLowerCase()
    return faqCategories
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) =>
            item.question.toLowerCase().includes(query) ||
            item.answer.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.items.length > 0)
  }, [search])

  const totalQuestions = faqCategories.reduce(
    (acc, cat) => acc + cat.items.length,
    0
  )

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <HelpCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Часто задаваемые вопросы
        </h1>
        <p className="text-muted-foreground">
          {totalQuestions} ответов на популярные вопросы о работе с AlgoBuilder
        </p>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по вопросам..."
          className="h-12 rounded-xl border-border/50 bg-card pl-11 text-sm shadow-sm transition-shadow focus:shadow-md"
        />
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
            !activeCategory
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          Все
        </button>
        {faqCategories.map((category) => {
          const Icon = category.icon
          return (
            <button
              key={category.id}
              onClick={() =>
                setActiveCategory(
                  activeCategory === category.id ? null : category.id
                )
              }
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                activeCategory === category.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {category.title}
            </button>
          )
        })}
      </div>

      <div className="space-y-8">
        {filteredCategories
          .filter((cat) => !activeCategory || cat.id === activeCategory)
          .map((category) => {
            const Icon = category.icon
            return (
              <section key={category.id}>
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">{category.title}</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {category.items.length}
                  </span>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
                  <Accordion type="single" collapsible>
                    {category.items.map((item, idx) => (
                      <AccordionItem
                        key={idx}
                        value={`${category.id}-${idx}`}
                        className={cn(
                          "px-5",
                          idx === category.items.length - 1 && "border-b-0"
                        )}
                      >
                        <AccordionTrigger className="text-left text-[15px] font-medium hover:text-primary">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </section>
            )
          })}

        {filteredCategories.filter(
          (cat) => !activeCategory || cat.id === activeCategory
        ).length === 0 && (
          <div className="py-16 text-center">
            <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              По запросу «{search}» ничего не найдено
            </p>
            <button
              onClick={() => setSearch("")}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Сбросить поиск
            </button>
          </div>
        )}
      </div>

      <div className="mt-12 rounded-xl border border-border/50 bg-card/50 p-6 text-center backdrop-blur-sm">
        <p className="mb-1 text-sm font-medium">Не нашли ответ?</p>
        <p className="text-sm text-muted-foreground">
          Напишите нам в{" "}
          <a
            href="https://t.me/algobuilder_support"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Telegram
          </a>{" "}
          — ответим в течение часа
        </p>
      </div>
    </div>
  )
}
