# Task 7: Final cleanup — comments, empty catch blocks, safe typing

## Agent: Cleanup Agent
## Status: COMPLETED

## Changes Made

### 1. Removed "REQUIRED" comments from type definitions
- `src/backend/domain/entities/types.ts`: Lines 32, 46 — removed "REQUIRED:" prefix, kept description examples
- `src/backend/domain/fairness/fairness-engine.ts`: Lines 25, 36 — removed "REQUIRED:" prefix

### 2. Fixed empty catch block
- `src/frontend/presentation/components/modules/audit/audit-module.tsx`: Added `console.warn("Failed to parse audit log changes:", e)` to previously empty catch block

### 3. Fixed unsafe type assertions in groups-module.tsx
- Imported `GroupResponse` from types
- `handleEdit(group: Record<string, unknown>)` → `handleEdit(group: GroupResponse)`
- Removed inline `as { id: string; name: string; ... }` assertion
- Replaced `group as Record<string, unknown>` + nested `as unknown[]` + `as Record<string, unknown>` with proper `group.employees?.filter((e) => e.isActive)` and `group.rules?.length`

### 4. Cleaned up unnecessary type assertions in fairness-engine.ts
- `{} as Record<string, number>` → `{}` (2 places)
- `null as Date | null` → `null` (2 places)

### 5. Cleaned up weird/unnecessary comments
- `src/app/api/seed/route.ts`: Removed "Changed from < to <=" historical note
- `src/backend/application/services/rule-service.ts`: Simplified self-doubting "anymore" comment
- `src/frontend/presentation/lib/query/use-auto-initialize.ts`: Replaced self-doubting "might fail" with confident "Expected if"; removed redundant "Silently handle" comment

### 6. Verified no raw fetch() calls in frontend code
- Only `fetch()` in `api-client.ts` (the centralized wrapper) — all components use hooks/apiFetch

### Intentionally kept assertions (documented)
- Service files `input as Record<string, unknown>` — required by `CreateAuditLogInput.changes` interface
- `database.ts` `globalThis as unknown as` — standard Prisma pattern
- `api-client.ts` generic `as T` — inherent to API wrapper
- Mutation hooks `Record<string, unknown>` params — changing would alter hook API

## Lint Result
- `bun run lint` — zero errors
