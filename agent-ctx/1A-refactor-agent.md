# Task 1A — Refactor Agent Work Record

## Task: Split monolithic hooks.ts + Fix raw fetch calls

### What was done
Split the 469-line `src/frontend/presentation/lib/query/hooks.ts` into 9 focused files:

| File | Lines | Purpose |
|------|-------|---------|
| `types.ts` | ~70 | 8 TypeScript interfaces (removed "REQUIRED" comments) |
| `api-client.ts` | ~30 | `apiFetch<T>()` and `rawFetch<T>()` utility functions |
| `group-hooks.ts` | ~55 | useGroups, useGroup, useCreateGroup, useUpdateGroup, useDeleteGroup |
| `employee-hooks.ts` | ~55 | useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee |
| `rule-hooks.ts` | ~55 | useRules, useCreateRule, useUpdateRule, useDeleteRule |
| `assignment-hooks.ts` | ~40 | useAssignments, useGenerateAssignments, useBalanceReport |
| `audit-hooks.ts` | ~20 | useAuditLogs |
| `use-auto-initialize.ts` | ~120 | useAutoInitialize with **3 raw fetch fixes** |
| `hooks.ts` (barrel) | ~55 | Re-exports everything so existing imports still work |

### Critical Fixes in use-auto-initialize.ts
1. **Line 365**: `fetch("/api/groups?includeInactive=false")` → `queryClient.fetchQuery({ queryKey: ["groups", {includeInactive: false}], queryFn: () => apiFetch<GroupResponse[]>(...) })`
2. **Line 379**: Same pattern for re-fetching groups after seed
3. **Line 424**: `fetch("/api/assignments?...")` → `queryClient.fetchQuery({ queryKey: ["assignments", ...], queryFn: () => apiFetch<AssignmentResponse[]>(...) })`
4. Replaced `rawFetch` with `apiFetch` for `/api/seed` POST
5. Added `console.warn()` in catch blocks instead of silent swallowing

### Verification
- `bun run lint` passes with zero errors
- All existing imports (`from "@/frontend/presentation/lib/query/hooks"`) remain unchanged
- Each file has cognitive complexity near 0
