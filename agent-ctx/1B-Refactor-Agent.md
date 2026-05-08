# Task 1B — Split dashboard-module.tsx (786 lines) into multiple small files

## Summary

Split the monolithic `dashboard-module.tsx` (786 lines, cognitive complexity ~85) into 7 focused files, each with cognitive complexity near 0.

## Files Created/Modified

| File | Lines | Role |
|---|---|---|
| `color-utils.ts` | 37 | Pure functions: hexToRgb, getEventColor, getEventBgColor |
| `calendar-utils.ts` | 72 | CalendarDay interface, getCalendarDays(), constants |
| `calendar-grid.tsx` | 151 | CalendarGrid + CalendarCell + CalendarLegend components |
| `dashboard-filters.tsx` | 169 | DashboardFilters + FairnessTooltip components |
| `dashboard-sidebar.tsx` | 255 | DashboardSidebar + 5 card sub-components |
| `generate-dialog.tsx` | 107 | GenerateDialog component |
| `dashboard-module.tsx` | 225 | Main orchestrator (state + hooks + composition only) |

## Key Decisions

- All state management stays in the orchestrator (`dashboard-module.tsx`)
- Sub-components receive data via props (no context needed)
- Each card in the sidebar is a separate function component within the same file for cohesion
- CalendarCell and CalendarLegend are private to calendar-grid.tsx
- All comments in Spanish
- No behavioral changes — same UI, same functionality

## Lint Status

ESLint passes with zero errors.
