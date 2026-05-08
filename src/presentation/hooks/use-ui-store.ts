// UI Store - Minimal global state for navigation and active selections
// No business logic here - that lives in TanStack Query and the backend

import { create } from "zustand";

type ActiveView = "dashboard" | "groups" | "employees" | "rules" | "calendar" | "audit";

interface UIState {
  activeView: ActiveView;
  selectedGroupId: string | null;
  sidebarOpen: boolean;
  setActiveView: (view: ActiveView) => void;
  setSelectedGroupId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeView: "dashboard",
  selectedGroupId: null,
  sidebarOpen: true,
  setActiveView: (view) => set({ activeView: view }),
  setSelectedGroupId: (id) => set({ selectedGroupId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
