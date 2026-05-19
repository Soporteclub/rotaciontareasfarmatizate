// UI Store - Minimal global state for navigation and active selections
// Admin access is global: one key unlocks ALL admin sections at once
// Regular users can only see the Calendar/Dashboard

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ActiveView = "calendar" | "groups" | "employees" | "rules" | "audit";

interface UIState {
  activeView: ActiveView;
  selectedGroupId: string | null;
  sidebarOpen: boolean;
  // Global admin state — single key unlocks everything
  isAdmin: boolean;
  // Whether the admin key modal is open
  adminPendingUnlock: boolean;

  setActiveView: (view: ActiveView) => void;
  setSelectedGroupId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;

  // Global admin
  unlockAdmin: () => void;
  lockAdmin: () => void;
  requestAdminUnlock: () => void;
  clearAdminRequest: () => void;
}

// Sidebar closed by default on mobile, open on desktop
const getInitialSidebarOpen = () => {
  if (typeof window !== "undefined") {
    return window.innerWidth >= 768;
  }
  return true;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeView: "calendar",
      selectedGroupId: null,
      sidebarOpen: getInitialSidebarOpen(),
      isAdmin: false,
      adminPendingUnlock: false,

      setActiveView: (view) => set({ activeView: view }),
      setSelectedGroupId: (id) => set({ selectedGroupId: id }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      unlockAdmin: () =>
        set({
          isAdmin: true,
          adminPendingUnlock: false,
        }),

      lockAdmin: () =>
        set({
          isAdmin: false,
          // Reset to calendar view when locking
          activeView: "calendar",
        }),

      requestAdminUnlock: () =>
        set({ adminPendingUnlock: true }),

      clearAdminRequest: () =>
        set({ adminPendingUnlock: false }),
    }),
    {
      name: "farmatizate-ui",
      partialize: (state) => ({ isAdmin: state.isAdmin }),
    }
  )
);
