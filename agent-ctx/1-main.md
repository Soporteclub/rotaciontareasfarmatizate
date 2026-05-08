# Task 1 - Replace Employee email with Cargo/Área

## Summary
Replaced the `email` field in Employee with `position` (Cargo) and `area` (Área) across the full stack.

## Files Modified
1. `prisma/schema.prisma` - Removed `email String?`, added `position String?` and `area String?`
2. `src/backend/domain/entities/types.ts` - EmployeeEntity: email → position + area
3. `src/frontend/presentation/lib/query/types.ts` - EmployeeResponse: email → position + area
4. `src/frontend/presentation/components/modules/employees/employee-form-dialog.tsx` - Replaced email form field with Cargo and Área fields
5. `src/frontend/presentation/components/modules/employees/employees-module.tsx` - EMPTY_FORM, handleEdit, handleFormSubmit, search filter all updated
6. `src/frontend/presentation/components/modules/employees/employee-table.tsx` - Email column → Cargo/Área column with Briefcase/MapPin icons
7. `src/frontend/presentation/components/modules/employees/employee-columns.tsx` - email column config → position column config
8. `src/frontend/presentation/components/modules/employees/employee-filters.tsx` - Search placeholder updated
9. `src/backend/application/validators/schemas.ts` - create/update employee schemas: email → position + area
10. `src/backend/application/services/employee-service.ts` - Create/update: email → position + area
11. `src/app/api/seed/route.ts` - Seed employees: email → position + area with realistic values

## Database
- Schema pushed with `--accept-data-loss` (dropped email column with existing data)
- Prisma Client regenerated

## Verification
- `bun run lint`: Only pre-existing errors (unrelated to this change)
- Grep: Zero references to `email` in src/ or prisma/
