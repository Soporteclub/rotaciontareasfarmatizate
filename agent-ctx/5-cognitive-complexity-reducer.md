# Task 5: Reduce Cognitive Complexity in Key Files

## Summary
Refactored 4 files with high cognitive complexity by extracting helper functions, using early returns, reducing nesting, and eliminating duplicated logic. All changes are purely structural — no functionality or API contracts were modified.

## Files Changed

### 1. `src/backend/domain/fairness/fairness-engine.ts` (Highest priority)

**Changes made:**

- **`calculateScore`**: Decomposed the monolithic 40-line scoring method into 6 focused sub-methods:
  - `balanceDeficitScore()` — computes balance deficit scoring
  - `monthlyDeficitScore()` — computes monthly balance deficit scoring
  - `cooldownScore()` — computes cooldown/recency penalty with early returns
  - `consecutiveScore()` — computes consecutive assignment penalty with early return
  - `newEmployeeBonus()` — computes new employee bonus
  - `sameDayPenalty()` — computes same-day penalty

- **`generateAssignments`**: Extracted the balance update block into `updateBalanceEntry()`, replacing nested `if (best) { ... }` with `if (!best) continue;` early-continue pattern.

- **`generateAssignmentDates`**: Extracted frequency-matching logic into:
  - `shouldRuleApplyOnDate()` — handles daily/weekly/monthly rule matching with early returns
  - `isHoliday()` — extracted holiday check into a named helper

- **`buildBalanceReports`**: Decomposed into 3 methods:
  - `buildBalanceReports()` — now only coordinates the mapping
  - `buildEmployeeBalanceReport()` — builds a single employee's report
  - `buildMonthlyBalance()` — extracts monthly balance accumulation (reused from both historical and planned)

- **`getLastAssignmentDate`**: Consolidated two separate loops with identical pattern into a single `reduce` operation over combined dates.

### 2. `src/frontend/presentation/components/modules/audit/audit-module.tsx`

**Changes made:**

- **`describeEmployeeChange`**: Decomposed into 4 focused functions:
  - `resolveEmployeeName()` — extracts employee name resolution logic (was inline ternary chain)
  - `describeEmployeeCreate()` — handles "create" action description
  - `describeEmployeeUpdate()` — handles "update" action description with field diffing
  - `describeEmployeeStatusChange()` — merged "deactivate" and "reactivate" into one function (they had identical structure, differing only in the verb)

- The main `describeEmployeeChange` is now a simple dispatcher with early returns.

### 3. `src/frontend/presentation/lib/query/use-auto-initialize.ts`

**Changes made:**

- **Extracted pure helpers** (no hooks, no setState — no lint issues):
  - `formatLocalDate()` — formats a date in local timezone
  - `getGenerationDateRange()` — computes current month ±1 date range
  - `getCurrentMonthRange()` — computes current month start/end
  - `generateAssignmentsForGroups()` — eliminates the duplicated generation loop that appeared twice

- **Eliminated duplication**: The "generate assignments for all groups" loop was copy-pasted in both the no-groups path and the no-assignments path. Now it's a single function called from both places.

- **Simplified date formatting**: Replaced inline `pad()` function and ISO-string-split with named helpers.

### 4. `src/app/api/seed/route.ts`

**Changes made:**

- **Data-driven task configuration**: Extracted `TASK_CONFIGS` array defining task names and their valid days, replacing hardcoded conditionals.

- **Extracted `buildHolidayDateSet()`**: Pure helper to build the holiday date set from holiday objects.

- **Extracted `formatDateKey()`**: Pure helper for date key formatting.

- **Extracted `isTaskDay()`**: Helper to check if a day matches a task config.

- **Extracted `createRulesForGroup()`**: Eliminates the duplicated rule creation loop.

- **Extracted `buildHistoricalAssignments()`**: Replaced the 4 repeated assignment-creation blocks (Piso1 Basura, Piso1 Cafetera, Piso2 Basura, Piso2 Cafetera) with a single data-driven loop over `groups × tasks × dates`. Uses an `indexMap` for rotating employee assignment.

- **Extracted `createPiso1Employees()` and `createPiso2Employees()`**: Separated employee creation into named functions for readability.

- **Dynamic rule count**: Replaced hardcoded `const totalRules = 14` with computed `TASK_CONFIGS.reduce(...)`.

## Verification
- `bun run lint` passes with zero errors after all changes
- Dev server running successfully with no runtime errors
