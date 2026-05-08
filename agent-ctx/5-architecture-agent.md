# Task 5 - Architecture Agent: Reorganize folder structure for clean architecture

## Summary
Reorganized the project folder structure for consistency with clean architecture principles.

## Changes Made

### 1. Moved src/lib/db.ts → src/backend/infrastructure/database.ts
- Updated 8 import references across repositories and API routes
- Deleted old file

### 2. Moved src/lib/utils.ts → src/frontend/lib/utils.ts
- Updated 44 import references across all shadcn/ui components and layout
- Deleted old file and empty src/lib/ directory

### 3. Removed dead calendar-module.tsx
- Confirmed not imported in page.tsx
- Deleted file and empty calendar/ directory

### 4. Removed empty barrel files
- Deleted src/backend/index.ts and src/frontend/index.ts
- No consumers existed for these files

### 5. Merged hooks directories
- Moved use-mobile.ts and use-toast.ts to src/frontend/presentation/hooks/
- Updated imports in sidebar.tsx and toaster.tsx
- Deleted old src/frontend/hooks/ directory

### 6. Created holiday-service.ts
- New service at src/backend/application/services/holiday-service.ts
- Extracted business logic from holiday API routes
- Routes now call service → service calls repository (clean architecture)
- Added to services/index.ts exports

## Verification
- `bun run lint` passes with zero errors
- No broken imports remain
