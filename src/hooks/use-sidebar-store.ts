import { create } from "zustand"

type SidebarStore = {
  collapsed: boolean
  toggle: () => void
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  collapsed: false,
  toggle: () => set((s) => ({ collapsed: !s.collapsed })),
}))
