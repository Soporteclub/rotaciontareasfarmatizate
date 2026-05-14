// UI Store - Minimal global state for navigation and active selections
// Admin access is per-module: each module unlocks independently
// Only the Groups module can "lock all" (master lock)

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ActiveView = "calendar" | "groups" | "employees" | "rules" | "audit";
type AdminModule = "groups" | "employees" | "rules" | "calendar" | "audit";

interface UIState {
  activeView: ActiveView;
  selectedGroupId: string | null;
  sidebarOpen: boolean;
  // Per-module admin state: { groups: true, employees: false, ... }
  adminModules: Partial<Record<AdminModule, boolean>>;
  // Which module is requesting the admin key (for the modal)
  adminPendingModule: AdminModule | null;
  // Legacy compat — computed from adminModules
  isAdmin: boolean;

  setActiveView: (view: ActiveView) => void;
  setSelectedGroupId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;

  // Per-module admin
  unlockModule: (module: AdminModule) => void;
  lockModule: (module: AdminModule) => void;
  lockAllModules: () => void;
  isModuleAdmin: (module: AdminModule) => boolean;
  requestAdminUnlock: (module: AdminModule) => void;
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
    (set, get) => ({
      activeView: "calendar",
      selectedGroupId: null,
      sidebarOpen: getInitialSidebarOpen(),
      adminModules: {},
      adminPendingModule: null,
      // Computed: true if ANY module is unlocked (for legacy compat)
      isAdmin: false,

      setActiveView: (view) => set({ activeView: view }),
      setSelectedGroupId: (id) => set({ selectedGroupId: id }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      unlockModule: (module) =>
        set((state) => {
          const newModules = { ...state.adminModules, [module]: true };
          const anyUnlocked = Object.values(newModules).some(Boolean);
          return {
            adminModules: newModules,
            adminPendingModule: null,
            isAdmin: anyUnlocked,
          };
        }),

      lockModule: (module) =>
        set((state) => {
          const newModules = { ...state.adminModules, [module]: false };
          const anyUnlocked = Object.values(newModules).some(Boolean);
          return {
            adminModules: newModules,
            isAdmin: anyUnlocked,
          };
        }),

      lockAllModules: () =>
        set({
          adminModules: {},
          isAdmin: false,
        }),

      isModuleAdmin: (module) => {
        return get().adminModules[module] === true;
      },

      requestAdminUnlock: (module) =>
        set({ adminPendingModule: module }),

      clearAdminRequest: () =>
        set({ adminPendingModule: null }),
    }),
    {
      name: "farmatizate-ui",
      partialize: (state) => ({ adminModules: state.adminModules }),
    }
  )
);

export type { AdminModule };
