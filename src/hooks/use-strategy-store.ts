import { create } from "zustand"
import type { StrategyCondition, StrategyConfig, StrategyRisks } from "@/core/types"

const DEFAULT_ENTRY: StrategyCondition = {
  indicator: "SMA",
  params: { period: 20 },
  condition: "CROSSES_ABOVE",
}

const DEFAULT_EXIT: StrategyCondition = {
  indicator: "SMA",
  params: { period: 20 },
  condition: "CROSSES_BELOW",
}

const DEFAULT_RISKS: StrategyRisks = {
  stopLoss: 2,
  takeProfit: 4,
}

type StrategyStore = {
  config: StrategyConfig
  activeTab: string
  isGenerating: boolean
  setEntry: (entry: StrategyCondition) => void
  setExit: (exit: StrategyCondition) => void
  setRisks: (risks: StrategyRisks) => void
  setFromAI: (config: StrategyConfig) => void
  setActiveTab: (tab: string) => void
  setIsGenerating: (v: boolean) => void
  reset: () => void
  initFromExisting: (config: StrategyConfig) => void
}

export const useStrategyStore = create<StrategyStore>((set) => ({
  config: { entry: DEFAULT_ENTRY, exit: DEFAULT_EXIT, risks: DEFAULT_RISKS },
  activeTab: "general",
  isGenerating: false,
  setEntry: (entry) => set((s) => ({ config: { ...s.config, entry } })),
  setExit: (exit) => set((s) => ({ config: { ...s.config, exit } })),
  setRisks: (risks) => set((s) => ({ config: { ...s.config, risks } })),
  setFromAI: (config) => set({ config, activeTab: "general" }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  reset: () =>
    set({
      config: { entry: DEFAULT_ENTRY, exit: DEFAULT_EXIT, risks: DEFAULT_RISKS },
      activeTab: "general",
      isGenerating: false,
    }),
  initFromExisting: (config) => set({ config, activeTab: "general" }),
}))
