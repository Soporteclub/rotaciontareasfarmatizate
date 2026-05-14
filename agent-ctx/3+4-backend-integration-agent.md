# Task 3+4 — Backend Integration Agent

## Summary
Created backup hooks, modified auto-initialize to prefer restore over seed, added auto-backup provider, and wired everything into the app.

## Files Created
- `/src/frontend/presentation/lib/query/backup-hooks.ts` — useBackupStatus, useCreateBackup, useRestoreBackup, triggerAutoBackup
- `/src/frontend/presentation/components/shared/auto-backup-provider.tsx` — Periodic backup every 5 min + initial after 30s

## Files Modified
- `/src/frontend/presentation/lib/query/use-auto-initialize.ts` — Added restore-before-seed logic + triggerAutoBackup calls
- `/src/frontend/presentation/components/layout/providers.tsx` — Added AutoBackupProvider wrapper
- `/src/frontend/presentation/components/layout/sidebar.tsx` — Added BackupSection component (was referenced but missing)
- `/home/z/my-project/worklog.md` — Appended task log

## Key Decisions
- Restore attempt uses `rawFetch` (not `apiFetch`) since backup/restore endpoints return unwrapped JSON
- `triggerAutoBackup()` is a standalone function with 5s debounce, not a hook — can be called from anywhere
- AutoBackupProvider wraps children inside QueryClientProvider in providers.tsx
- BackupSection in sidebar shows status, create/restore buttons with loading states and relative timestamps
