import { create } from "zustand"
import type { SignalCondition, SignalChannel } from "@/core/types"

const DEFAULT_CONDITION: SignalCondition = {
  indicator: "RSI",
  params: { period: 14 },
  condition: "LESS_THAN",
  value: 30,
}

type SignalStore = {
  conditions: SignalCondition[]
  channels: SignalChannel[]
  activeTab: string
  addCondition: () => void
  updateCondition: (index: number, condition: SignalCondition) => void
  removeCondition: (index: number) => void
  setChannels: (channels: SignalChannel[]) => void
  toggleChannel: (channel: SignalChannel) => void
  setActiveTab: (tab: string) => void
  reset: () => void
  initFromExisting: (conditions: SignalCondition[], channels: SignalChannel[]) => void
}

export const useSignalStore = create<SignalStore>((set) => ({
  conditions: [DEFAULT_CONDITION],
  channels: ["max"] as SignalChannel[],
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
  setActiveTab: (activeTab) => set({ activeTab }),
  reset: () =>
    set({
      conditions: [DEFAULT_CONDITION],
      channels: ["max"] as SignalChannel[],
      activeTab: "general",
    }),
  initFromExisting: (conditions, channels) =>
    set({ conditions, channels, activeTab: "general" }),
}))
