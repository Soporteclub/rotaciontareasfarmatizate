# Worklog — Farmatízate Project

---
Task ID: 1
Agent: Main Agent
Task: Add Swagger/OpenAPI documentation to the Farmatízate API

Work Log:
- Audited all 17 API route files and documented their methods, parameters, request bodies, and response patterns
- Installed `next-swagger-doc` and `swagger-ui-react` packages (plus `@types/swagger-ui-react`)
- Created comprehensive OpenAPI 3.0.3 specification at `/src/lib/openapi-spec.ts` covering:
  - 9 tags: Grupos, Empleados, Reglas, Asignaciones, Festivos, Elegibilidad, Auditoría, Configuración, Mantenimiento
  - All 22 HTTP method handlers across 17 route files
  - Full request body schemas matching Zod validators
  - Complete response schemas matching Prisma models
  - Reusable components (parameters, schemas, responses)
  - Error responses (400, 401, 404, 409, 500)
- Created API route at `/api/docs` that serves the OpenAPI spec as JSON
- Created Swagger UI page at `/docs` with dynamic import (SSR disabled) and loading state
- Added "API Docs (Swagger)" link in the sidebar footer (both expanded and collapsed states)
- Verified all endpoints work: `/api/docs` returns valid OpenAPI 3.0.3 JSON, `/docs` renders Swagger UI with CSS
- Lint passes with no errors

Stage Summary:
- Full Swagger/OpenAPI 3.0.3 documentation is now available at `/docs`
- API spec JSON available at `/api/docs`
- Sidebar has a link to open API docs in new tab
- All 17 routes fully documented with schemas, parameters, and responses

---
Task ID: 2
Agent: Main Agent
Task: Fix calendar - remove "Hoy" button, add Day view, fix data fetching on navigation

Work Log:
- Removed `today` ("Hoy") button from headerToolbar left section
- Added `dayGridDay` view to the right toolbar: `dayGridDay,dayGridWeek,dayGridMonth`
- Added `datesSet` callback (`handleDatesSet`) that updates `calendarDates` when user navigates
- The `datesSet` callback adds ±7 day padding to ensure surrounding events are visible
- Changed buttonText from `today/month/week` to `day/week/month` in Spanish
- Root cause: `calendarDates` was static (set only on mount) so navigating to other dates/weeks/days showed no data
- Now data is refetched dynamically for the visible date range when the user navigates

Stage Summary:
- "Hoy" button removed from calendar toolbar
- Three views available: Día, Semana, Mes
- Data now fetches correctly for any navigated date range via `datesSet` callback
- Lint passes with no errors

---
Task ID: 3
Agent: Main Agent
Task: Fix "Sin asignaciones para este día" bug — timezone shift in date mapping

Work Log:
- **Root cause identified**: Assignment dates come from the API as ISO UTC strings like `"2026-05-13T00:00:00.000Z"`. When JavaScript parses this with `new Date()`, it creates a local-time Date object. In UTC-5 (Colombia), midnight UTC becomes 7PM on May 12 locally. So `toLocalDateStr()` produced `"2026-05-12"` instead of `"2026-05-13"`.
- Added `toUtcDateStr()` function in `dashboard-hooks.ts` that extracts the date portion directly from the ISO string (`"2026-05-13T00:00:00.000Z"`.split("T")[0] → `"2026-05-13"`) to avoid timezone shift
- Changed `useCalendarDays` to use `toUtcDateStr(a.date)` instead of `toLocalDateStr(new Date(a.date))` when mapping API assignments to calendar days
- Fixed same issue in FullCalendar `calendar-module.tsx`: changed `start: new Date(a.date).toISOString().split("T")[0]` to `typeof a.date === "string" ? a.date.split("T")[0] : new Date(a.date).toISOString().split("T")[0]`
- Fixed `goToday()` in dashboard: removed `setViewMode("day")` so it navigates to today without forcing view change
- FullCalendar: "Hoy" button already removed in previous fix (no `today` in headerToolbar)
- Lint passes with no errors

Stage Summary:
- **Critical timezone bug fixed**: Calendar now correctly maps assignments to their dates regardless of timezone
- "Sin asignaciones para este día" no longer appears incorrectly for days with assignments
- Dashboard "Hoy" button no longer forces view mode change to "day"
- FullCalendar has no "Hoy" button (removed previously)

---
Task ID: 4
Agent: Main Agent
Task: Replace group taskType Select with task toggle switches in create/edit dialog

Work Log:
- Analyzed current group form: had a confusing `taskType` Select dropdown (cleaning/kitchen/etc.) that didn't correspond to actual rules
- Replaced `taskType` Select with toggle switches for each `TASK_LABEL` (Sacar Basura, Lavar Cafetera, Aseo General, etc.)
- Each toggle shows the task icon, name, default days, and a Switch component
- Active toggles get colored background matching the task's theme color
- On **create**: after creating the group, auto-creates rules for enabled tasks using default day assignments
- On **edit**: loads existing rules as enabled toggles; toggling off soft-deletes rules, toggling on creates new rules
- Added task badge display on group cards showing which tasks each group has
- Removed `useEffect` setState pattern — replaced with `useMemo` + conditional render-time state init to avoid lint error
- Used `rulesLoaded` flag to prevent re-applying initial state on every render

Stage Summary:
- Group create/edit dialog now has intuitive task toggles instead of confusing Select
- Tasks are automatically created/deleted as rules when toggles change
- Group cards show task badges for quick visual identification
- Lint passes with no errors

---
Task ID: 5
Agent: Main Agent
Task: Fix task eligibility sync — toggling OFF a task should remove future assignments immediately

Work Log:
- Investigated the full data flow: TaskEligibilityDialog → eligibility API → taskEligibilityService → TaskEligibility table → assignmentService → FairnessEngine
- Found that the fairness engine already correctly filters out disabled tasks via `isTaskDisabled()` in `selectBestEmployee()`
- Root cause: when toggling OFF a task for an employee, the `TaskEligibility` record was updated but existing future assignments were NOT removed. The user had to regenerate manually, and even then the old assignments remained visible in the UI until queries were invalidated
- Added `deleteUnlockedByEmployeeAndTask()` method to assignment repository — deletes unlocked future assignments for a specific employee+task combination
- Added `syncEligibilityChange()` method to assignment service — orchestrates assignment cleanup when eligibility changes, includes audit logging
- Updated `taskEligibilityService.toggle()` to call `assignmentService.syncEligibilityChange()` after updating the eligibility record, returning `deletedAssignments` count
- Updated eligibility API route to return `deletedAssignments` count in the response
- Updated `TaskEligibilityResponse` type to include optional `deletedAssignments` field
- Updated `useToggleEligibility` hook to invalidate assignment and dashboard queries after toggle (previously only invalidated eligibility queries)
- Updated `TaskEligibilityDialog` with better UX: amber styling for disabled tasks, detailed toast messages showing count of removed assignments, prompt to regenerate for redistribution
- Added "syncEligibility" to `AuditAction` union type
- Lint passes with no errors

Stage Summary:
- Task eligibility is now fully synchronized with assignments
- When a task is toggled OFF for an employee, all their future unlocked assignments for that task are immediately deleted
- UI shows clear feedback: "Se eliminaron X asignaciones futuras. Regenera para redistribuir."
- When toggled ON: "Esta actividad se incluirá en la próxima regeneración."
- Assignment and dashboard queries are automatically invalidated after toggling
- Full audit trail maintained for eligibility sync operations

---
Task ID: 6
Agent: Main Agent
Task: Complete all pending items from previous sessions

Work Log:
- **Employee edit**: Updated employee-form-dialog.tsx to show isActive toggle in both create and edit modes. Added leaveDate field that appears when deactivating. Enhanced dialog titles and button text.
- **Calendar text too small**: Added custom CSS styling for FullCalendar - increased event text to 12px, day headers, proper padding, better contrast with text-shadow, mobile responsive breakpoints.
- **Balance date range**: The balance sidebar card now shows the date range (from-to) from the API response. Fixed a bug where balanceReport was accessed as an array when it's actually a BalanceReportResponse object.
- **Balance filterable by date**: Added startDate/endDate params to the balance API route, assignment service getBalanceReport(), and useBalanceReport hook. Added date range filter UI in the calendar sidebar with quick range buttons (Este mes, Mes pasado, Este año).
- **Regenerate syncs with employee changes**: Added `deleteUnlockedByEmployee()` and `deleteUnlockedByEmployeeAndGroup()` methods to assignment repository. Updated employee-service to automatically remove future assignments when an employee is deactivated, moved to another group, or soft-deleted. Updated frontend hooks to invalidate assignment/dashboard queries on employee mutations.
- **Lock Auditar with admin key**: Added AdminGuard wrapper to AuditModule component. Added syncEligibility to ACTION_LABELS and ACTION_STYLES.
- **Rule editing like creating**: Enhanced edit-rule-dialog.tsx with multi-day checkbox selector, "Lun-Vie" and "Limpiar" shortcuts, change summary showing which rules will be updated vs created, and save logic that creates additional rules for extra days.
- **Farmatizate branding**: Created shared brand constants file at /frontend/presentation/lib/brand.ts. Updated all modules to use BRAND.PRIMARY and BRAND.ACCENT from the shared file instead of hardcoded colors. Changed all orange (#f15a24) action buttons to brand blue (#1545cb). Updated sidebar, groups, rules, employees, calendar, audit, and dashboard modules.

Stage Summary:
- All 8 pending tasks completed
- Full lint passes with no errors
- Consistent Farmatizate brand colors (#1545cb / #00cd98) throughout the app
- Employee changes (deactivate, move group, delete) now auto-sync with assignments
- Calendar is much more legible with proper text sizes
- Balance is filterable by date range
- Rule editing supports multi-day selection with auto-creation of extra rules
