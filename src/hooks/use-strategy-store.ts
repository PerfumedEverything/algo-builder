import { create } from "zustand"
import type { StrategyCondition, StrategyConfig, StrategyRisks, LogicOperator } from "@/core/types"

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

const DEFAULT_CONFIG: StrategyConfig = {
  entry: [DEFAULT_ENTRY],
  exit: [DEFAULT_EXIT],
  entryLogic: "AND",
  exitLogic: "AND",
  risks: DEFAULT_RISKS,
}

type StrategyStore = {
  config: StrategyConfig
  activeTab: string
  isGenerating: boolean
  addCondition: (type: "entry" | "exit") => void
  updateCondition: (type: "entry" | "exit", index: number, condition: StrategyCondition) => void
  removeCondition: (type: "entry" | "exit", index: number) => void
  setLogicOperator: (type: "entry" | "exit", op: LogicOperator) => void
  setRisks: (risks: StrategyRisks) => void
  setFromAI: (config: StrategyConfig) => void
  setActiveTab: (tab: string) => void
  setIsGenerating: (v: boolean) => void
  reset: () => void
  initFromExisting: (config: StrategyConfig) => void
}

export const useStrategyStore = create<StrategyStore>((set) => ({
  config: DEFAULT_CONFIG,
  activeTab: "general",
  isGenerating: false,

  addCondition: (type) =>
    set((s) => ({
      config: {
        ...s.config,
        [type]: [...s.config[type], type === "entry" ? { ...DEFAULT_ENTRY } : { ...DEFAULT_EXIT }],
      },
    })),

  updateCondition: (type, index, condition) =>
    set((s) => ({
      config: {
        ...s.config,
        [type]: s.config[type].map((c, i) => (i === index ? condition : c)),
      },
    })),

  removeCondition: (type, index) =>
    set((s) => ({
      config: {
        ...s.config,
        [type]: s.config[type].filter((_, i) => i !== index),
      },
    })),

  setLogicOperator: (type, op) =>
    set((s) => ({
      config: {
        ...s.config,
        [type === "entry" ? "entryLogic" : "exitLogic"]: op,
      },
    })),

  setRisks: (risks) => set((s) => ({ config: { ...s.config, risks } })),
  setFromAI: (config) => set({ config, activeTab: "general" }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  reset: () =>
    set({
      config: DEFAULT_CONFIG,
      activeTab: "general",
      isGenerating: false,
    }),
  initFromExisting: (config) => set({ config, activeTab: "general" }),
}))
