// UI Store - Minimal global state for navigation and active selections

import { create } from "zustand";

type ActiveView = "calendar" | "groups" | "employees" | "rules" | "audit";

interface UIState {
  activeView: ActiveView;
  selectedGroupId: string | null;
  sidebarOpen: boolean;
  setActiveView: (view: ActiveView) => void;
  setSelectedGroupId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeView: "calendar",
  selectedGroupId: null,
  sidebarOpen: true,
  setActiveView: (view) => set({ activeView: view }),
  setSelectedGroupId: (id) => set({ selectedGroupId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
