# Task 2 - Rules Feature Agent

## Task: Add edit/delete capabilities to rules + frequency as Semanal/Quincenal/Mensual

### Changes Made

#### Backend Changes
1. **rule-repository.ts** — Added `hardDelete(id)` method using `db.assignmentRule.delete()`
2. **rule-service.ts** — Added `hardDelete(id)` method with existence check and audit log (action: "delete")
3. **api/rules/[id]/route.ts** — Updated DELETE handler to support `?permanent=true` query param for hard delete

#### Frontend Changes
4. **rules-constants.ts** — Added `FREQUENCY_LABELS`, `FREQUENCY_OPTIONS`, and `getFrequencyLabel()` helper
5. **rule-hooks.ts** — Updated `useDeleteRule` to accept `{ id, permanent? }` object param
6. **edit-rule-dialog.tsx** — New file: EditRuleDialog + EditRuleForm components for editing rules
7. **rule-card.tsx** — Added edit (Pencil) and delete (Trash2) buttons per rule row; replaced frequency labels
8. **rules-module.tsx** — Added editingRule state, editDialogOpen, handleEdit, updated handleDelete for permanent deletion
9. **create-rule-dialog.tsx** — Changed frequency step from "Cada N semanas" to "Semanal/Quincenal/Mensual" with descriptions

### Files Modified
- `src/backend/infrastructure/repositories/rule-repository.ts`
- `src/backend/application/services/rule-service.ts`
- `src/app/api/rules/[id]/route.ts`
- `src/frontend/presentation/lib/query/rule-hooks.ts`
- `src/frontend/presentation/components/modules/rules/rules-constants.ts`
- `src/frontend/presentation/components/modules/rules/edit-rule-dialog.tsx` (NEW)
- `src/frontend/presentation/components/modules/rules/rule-card.tsx`
- `src/frontend/presentation/components/modules/rules/rules-module.tsx`
- `src/frontend/presentation/components/modules/rules/create-rule-dialog.tsx`

### Verification
- `bun run lint` — zero new errors (pre-existing dashboard-module.tsx errors unrelated to this task)
- Dev server running correctly on port 3000
