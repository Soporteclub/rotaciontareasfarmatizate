# Task 3+4 - Main Agent

## Task: Add Day/Week/Month views to calendar + Improve fairness distribution

## Changes Made

### Change 1: Calendar Views (Day/Week/Month)

**Files modified:**
1. `src/frontend/presentation/components/modules/dashboard/calendar-utils.ts`
   - Added `DAY_NAMES_FULL`, `ViewMode` type, `getWeekDays()`, `getDayView()`, `formatFullDate()`, `formatWeekRange()`

2. `src/frontend/presentation/components/modules/dashboard/dashboard-module.tsx`
   - Added `viewDay` and `viewMode` states
   - Unified navigation (navigatePrev/Next/Today) adapts to current view mode
   - calendarDays computed per view mode (month/week/day)
   - Passed viewMode + setViewMode to CalendarGrid
   - Removed all useCallback wrappers (React Compiler compliance)

3. `src/frontend/presentation/components/modules/dashboard/calendar-grid.tsx`
   - Added `ViewModeToggle` component (Día | Semana | Mes buttons)
   - Added `WeekDayColumn` for week view (7 columns, full details)
   - Added `DayAssignmentCard` for day view (detailed cards)
   - Updated header to show contextual date per view mode
   - Updated CalendarGridProps with viewDay, viewMode, setViewMode

### Change 2: Fairness Distribution

**File modified:** `src/backend/domain/fairness/fairness-engine.ts`
- `balanceWeight`: 1.0 → 3.0
- `monthlyBalanceWeight`: 1.5 → 2.5
- Added hard constraint after scoring: if best candidate has 2+ more assignments than second-best AND score gap < 0.5, prefer second-best

## Lint: Zero errors
