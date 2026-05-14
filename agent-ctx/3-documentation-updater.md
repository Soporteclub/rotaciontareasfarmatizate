# Task 3 — documentation-updater

## Task
Fix and update all documentation files to accurately reflect the current state of the project.

## Work Done

### docs/README.md
- Added "Sistema de Clave Admin por Módulo" section with table of 5 protected modules
- Added eligibility/ and settings/ to project structure listing

### docs/architecture.md
- Added "Sistema de Autenticación por Módulo" section with:
  - Architecture diagram (UI Store → Admin Key Modal → AdminGuard/AdminOnly)
  - 5 modules table with AdminModule type values and protection patterns
  - AdminModule type definition
  - 10-step unlock flow
  - AdminGuard, AdminOnly, ModuleAdminBadge component descriptions
  - Admin key details (default, storage, validation, change)
  - Master lock pattern (LockAllButton in Groups only)
  - page.tsx usage pattern

### docs/data-models.md
- Added Settings model (singleton id="app", key/value fields)
- Added TaskEligibility model (employeeId, taskName, isEnabled)
- Fixed model names: AssignmentGroup→Group, AssignmentRule→Rule
- Fixed Assignment field: taskType→taskName
- Updated ER diagram with Settings and TaskEligibility
- Added audit admin access note

### docs/api-reference.md
- Added Section 6: Elegibilidad (/api/eligibility) — GET and POST
- Added Section 7: Configuración (/api/settings) — GET, POST (validate), PUT (change key)
- Renumbered sections 8-10
- Added audit admin access requirement note

## Key Decisions
- Used Spanish throughout to match existing doc style
- Kept same format/structure as original docs
- Corrected model names to match actual Prisma schema (Group, Rule)
- Documented the full per-module auth architecture including the 5-module AdminModule type with "audit"
