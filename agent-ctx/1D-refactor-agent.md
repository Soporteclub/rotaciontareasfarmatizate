# Task 1D — Split employees-module.tsx into multiple small files

## Summary
Split the 568-line monolithic `employees-module.tsx` into 5 focused files, each with cognitive complexity near 0.

## Files Created/Rewritten

| File | Lines | Purpose |
|------|-------|---------|
| `employee-columns.tsx` | ~52 | Brand constants, StatusFilter type, column config, helper functions (getGroupName, getGroupColor, formatDate) |
| `employee-filters.tsx` | ~88 | EmployeeFilters component — search, group filter, status filter, count badges |
| `employee-form-dialog.tsx` | ~124 | EmployeeFormDialog component — create/edit form dialog, exports EmployeeFormData/FormUpdater types |
| `employee-table.tsx` | ~215 | EmployeeTable + EmployeeRow + delete confirmation dialog |
| `employees-module.tsx` | ~158 | Clean orchestrator — state management, hooks, filter/sort logic, event handlers, composes sub-components |

## Key Design Decisions

1. **Form state lifted to parent**: Initially tried `useEffect` to sync form state inside the dialog component, but React Compiler lint rule (`react-hooks/set-state-in-effect`) rejects `setState` calls inside effects. Solution: lift form state to the parent module, pass `form` and `onFormChange` as props. This avoids side effects entirely.

2. **Delete dialog in table**: The delete confirmation dialog is managed inside `EmployeeTable` rather than the parent module, keeping the table self-contained for its own interactions.

3. **EmployeeRow as local sub-component**: Extracted row rendering into a separate `EmployeeRow` function within `employee-table.tsx` to keep the main table component flat.

4. **Search includes group name**: The filter logic in the module preserves the original behavior of searching by name, email, AND group name.

## Verification
- `bun run lint` — zero errors
- App responds with HTTP 200 on localhost:3000
- All existing imports (`EmployeesModule` from `employees-module`) still work
