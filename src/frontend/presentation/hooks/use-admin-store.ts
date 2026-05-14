// Admin Auth Store - Controls access to configuration and generation features
// All users can VIEW the calendar, only admin key holders can modify

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AdminState {
  isAdmin: boolean;
  adminKey: string | null;
  lock: () => void;
  unlock: (key: string) => Promise<boolean>;
  verifyKey: (key: string) => Promise<boolean>;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
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
    }),
    {
      name: "farmatizate-admin",
      partialize: (state) => ({ isAdmin: state.isAdmin }),
    }
  )
);
