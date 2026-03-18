import { create } from "zustand"
import type { SignalCondition, SignalChannel, LogicOperator } from "@/core/types"

const DEFAULT_CONDITION: SignalCondition = {
  indicator: "PRICE",
  params: {},
  condition: "GREATER_THAN",
  value: 0,
}

type SignalStore = {
  conditions: SignalCondition[]
  channels: SignalChannel[]
  logicOperator: LogicOperator
  activeTab: string
  addCondition: () => void
  updateCondition: (index: number, condition: SignalCondition) => void
  removeCondition: (index: number) => void
  setChannels: (channels: SignalChannel[]) => void
  toggleChannel: (channel: SignalChannel) => void
  setLogicOperator: (op: LogicOperator) => void
  setActiveTab: (tab: string) => void
  reset: () => void
  initFromExisting: (conditions: SignalCondition[], channels: SignalChannel[], logicOperator?: LogicOperator) => void
}

export const useSignalStore = create<SignalStore>((set) => ({
  conditions: [DEFAULT_CONDITION],
  channels: ["telegram"] as SignalChannel[],
  logicOperator: "AND",
  activeTab: "general",
  addCondition: () =>
    set((s) => ({ conditions: [...s.conditions, { ...DEFAULT_CONDITION }] })),
  updateCondition: (index, condition) =>
    set((s) => ({
      conditions: s.conditions.map((c, i) => (i === index ? condition : c)),
    })),
  removeCondition: (index) =>
    set((s) => ({
      conditions: s.conditions.filter((_, i) => i !== index),
    })),
  setChannels: (channels) => set({ channels }),
  toggleChannel: (channel) =>
    set((s) => ({
      channels: s.channels.includes(channel)
        ? s.channels.filter((c) => c !== channel)
        : [...s.channels, channel],
    })),
  setLogicOperator: (logicOperator) => set({ logicOperator }),
  setActiveTab: (activeTab) => set({ activeTab }),
  reset: () =>
    set({
      conditions: [DEFAULT_CONDITION],
      channels: ["telegram"] as SignalChannel[],
      logicOperator: "AND",
      activeTab: "general",
    }),
  initFromExisting: (conditions, channels, logicOperator) =>
    set({ conditions, channels, logicOperator: logicOperator ?? "AND", activeTab: "general" }),
}))
