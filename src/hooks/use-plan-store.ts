import { create } from "zustand"
import { persist } from "zustand/middleware"

type PlanTier = "starter" | "pro" | "expert"

type PlanStore = {
  planName: string
  planTier: PlanTier
  setPlan: (name: string) => void
}

const tierMap: Record<string, PlanTier> = {
  "Стартовый": "starter",
  "Профессионал": "pro",
  "Эксперт": "expert",
}

export const usePlanStore = create<PlanStore>()(
  persist(
    (set) => ({
      planName: "Стартовый",
      planTier: "starter",
      setPlan: (name: string) =>
        set({ planName: name, planTier: tierMap[name] ?? "starter" }),
    }),
    { name: "algo-builder-plan" }
  )
)
