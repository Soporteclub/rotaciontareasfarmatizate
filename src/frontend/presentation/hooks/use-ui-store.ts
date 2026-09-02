// UI Store - Minimal global state for navigation and active selections
// Admin access is global: one key unlocks ALL admin sections at once
// Regular users can only see the Calendar/Dashboard
//
// FIX (BC-05): this store no longer persists anything to localStorage. It used to
// persist the `isAdmin` boolean (the admin key was already in-memory only), but
// that left a STALE flag after a reload: the UI claimed admin rights while the
// key was gone, so the first mutation returned 403 and forced a re-unlock — an
// inconsistency between what the UI believed and what the server accepts. Admin
// is now strictly per-session: after a refresh the user must re-enter the key.

import { create } from "zustand";

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
  lockAdmin: (silent?: boolean) => void;
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

export const useUIStore = create<UIState>()((set) => ({
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
  lockAdmin: (silent?: boolean) =>
    set({
      isAdmin: false,
      adminKey: null,
      // Only prompt for re-unlock if not silent (e.g., when locking from sidebar)
      adminPendingUnlock: !silent,
      // Reset to calendar view when locking
      activeView: "calendar",
    }),

  requestAdminUnlock: () =>
    set({ adminPendingUnlock: true }),

  clearAdminRequest: () =>
    set({ adminPendingUnlock: false }),
}));
