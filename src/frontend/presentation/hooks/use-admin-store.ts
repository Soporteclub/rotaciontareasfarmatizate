// Admin Auth Store - Controls access to configuration and generation features
// All users can VIEW the calendar, only admin key holders can modify
//
// FIX (BC-05): this store no longer uses zustand/persist. Persisting `isAdmin`
// left a STALE flag in localStorage: after a reload the UI claimed admin rights
// (isAdmin=true) while the admin key (never persisted) was gone, so the first
// mutation returned 403 and forced a re-unlock — a real UX inconsistency between
// what the UI believed and what the server accepts. Admin is now strictly a
// per-session, in-memory state; nothing touches localStorage and each reload
// requires re-entering the admin key.

import { create } from "zustand";

interface AdminState {
  isAdmin: boolean;
  adminKey: string | null;
  lock: () => void;
  unlock: (key: string) => Promise<boolean>;
  verifyKey: (key: string) => Promise<boolean>;
}

export const useAdminStore = create<AdminState>()((set, _get) => ({
  isAdmin: false,
  adminKey: null,

  lock: () => {
    set({ isAdmin: false, adminKey: null });
  },

  unlock: async (key: string) => {
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.data?.valid) {
        set({ isAdmin: true, adminKey: key });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  verifyKey: async (key: string) => {
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      return data.data?.valid === true;
    } catch {
      return false;
    }
  },
}));
