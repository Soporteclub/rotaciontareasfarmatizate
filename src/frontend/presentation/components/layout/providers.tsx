"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

// FIX (FE-03): Removed <AutoBackupProvider> wrapper.
// Previously, this component fired POST /api/backup every 5 minutes
// (and 30s after mount) for EVERY visitor — including anonymous ones.
// Combined with the old GET /api/backup that wrote to public/backup.json,
// this continuously exfiltrated the admin key + PII to a publicly
// downloadable static file. Backups are now an explicit admin action
// via POST /api/backup with an admin key (header x-admin-key).

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
