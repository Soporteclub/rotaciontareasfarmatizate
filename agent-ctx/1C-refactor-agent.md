# Task 1C — Split rules-module.tsx

## Summary
Split the 984-line `rules-module.tsx` monolith into 5 focused files with cognitive complexity near 0.

## Files Created / Modified

| File | Lines | Purpose |
|------|-------|---------|
| `rules-constants.ts` | ~90 | WEEKDAYS, ALL_DAYS, DAY_ABBR, RuleTemplate, TEMPLATES, getTaskConfig, getDaySummary |
| `weekly-strip.tsx` | ~60 | WeeklyStrip display component (activeDays + color → strip) |
| `create-rule-dialog.tsx` | ~280 | Full create rule dialog with 5-step form, template selection, submit logic |
| `rule-card.tsx` | ~110 | TaskGroupCard component rendering one task group with weekly strip + rule rows |
| `rules-module.tsx` | ~190 | Orchestrator: state, hooks, data grouping, event handlers, JSX composition |

## Key Decisions
- `getDaySummary` and `getTaskConfig` moved to constants file since they are pure functions with no React dependency
- `CreateRuleDialog` manages its own form state internally (selectedTemplate, form fields) rather than lifting to parent
- `TaskGroupCard` receives pre-computed `days`, `groupIds`, `frequencies` sets rather than computing them
- All existing imports (`RulesModule` from `rules-module`) remain unchanged — no breaking changes
- Comments in Spanish, minimal and clear

## Verification
- ESLint: zero errors
- TypeScript: no errors in rules/ files
- All functionality preserved: templates, create dialog, day picker, task cards, delete, regenerate-all, inactive rules, empty state
