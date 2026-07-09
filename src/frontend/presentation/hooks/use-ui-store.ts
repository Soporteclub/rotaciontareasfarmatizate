// UI Store - Minimal global state for navigation and active selections
// Admin access is global: one key unlocks ALL admin sections at once
// Regular users can only see the Calendar/Dashboard
//
// FIX (FE-01, FE-04): adminKey is NO LONGER persisted to localStorage.
// Previously it was stored in plaintext and could be injected by anyone with
// DevTools access, bypassing the backend verification. Now only `isAdmin`
// (a boolean flag) is persisted; the actual key lives in memory only and must
// be re-entered after a page refresh. When a mutation returns 403, the frontend
// calls lockAdmin() + requestAdminUnlock() to prompt for the key again.

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ActiveView = "calendar" | "groups" | "employees" | "rules" | "audit";

interface UIState {
  activeView: ActiveView;
  selectedGroupId: string | null;
  sidebarOpen: boolean;
  // Global admin state — single key unlocks everything
  isAdmin: boolean;
  // The verified admin key (IN-MEMORY ONLY — not persisted to localStorage)
  adminKey: string | null;
  // Whether the admin key modal is open
  adminPendingUnlock: boolean;

  setActiveView: (view: ActiveView) => void;
  setSelectedGroupId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;

  // Global admin
  unlockAdmin: (key: string) => void;
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
      adminKey: null,
      adminPendingUnlock: false,

      setActiveView: (view) => set({ activeView: view }),
      setSelectedGroupId: (id) => set({ selectedGroupId: id }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      unlockAdmin: (key: string) =>
        set({
          isAdmin: true,
          adminKey: key,
          adminPendingUnlock: false,
        }),

      // FIX (FE-04): lockAdmin clears adminKey AND opens the unlock modal so
      // the admin can re-enter the key after a 403.
      lockAdmin: () =>
        set({
          isAdmin: false,
          adminKey: null,
          adminPendingUnlock: true, // prompt for re-unlock
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
      // FIX (FE-01): only persist the isAdmin boolean, NOT the adminKey.
      // On rehydration, isAdmin may be true but adminKey will be null, so the
      // first protected mutation will 403 and trigger lockAdmin() -> re-unlock.
      partialize: (state) => ({ isAdmin: state.isAdmin }),
    }
  )
);
