---
Task ID: 1
Agent: Main Agent
Task: Reconfigure rotating task assignment system for 2 groups with specific task rules

Work Log:
- Modified Prisma schema: `taskLabel` now required on `AssignmentRule`, `taskType` required on `Assignment`
- Changed unique constraint from `@@unique([groupId, date])` to `@@unique([groupId, date, taskType])` to support multiple tasks per day
- Added `@@unique([groupId, dayOfWeek, taskLabel])` on AssignmentRule to prevent duplicate rules
- Updated FairnessEngine: included `taskType` in existing assignments map key (`groupId:date:taskType`), added same-day penalty (5.0) to avoid assigning same person multiple tasks on same day
- Updated domain types: `taskLabel` and `taskType` now required (not nullable)
- Added `TASK_LABELS` constant with common task labels
- Updated assignment repository: `findByGroupAndDate` now returns `findMany` instead of `findUnique`
- Updated assignment service: passes `taskType` through to FairnessEngine from historical data
- Updated validators: `taskLabel` now required on create/update rule schemas
- Updated rule service: duplicate check now considers `taskLabel` (allows different tasks on same day)
- Updated seed route: 2 groups (Piso 1, Piso 2), each with "Sacar Basura" (Tue/Thu) and "Lavar Cafetera" (Mon-Fri)
- Replaced FullCalendar with lightweight custom calendar (sandbox memory limitations)
- Custom calendar shows task assignments with color-coded tasks (red=Basura, blue=Cafetera)
- Updated dashboard: weekends shown, task labels, group filter, generate buttons
- Updated rules module: taskLabel as required select field with custom option
- Pushed schema, seeded database, generated assignments for both groups
- Server verified working with all API endpoints

Stage Summary:
- System now supports multiple tasks per day per group (e.g. "Sacar Basura" + "Lavar Cafetera" on Tuesday)
- Two groups: Piso 1 and Piso 2, each with 5 employees and 7 rules
- Seed data: "Sacar Basura" on Tuesdays/Thursdays, "Lavar Cafetera" on Mon-Fri
- FairnessEngine handles same-day task distribution with penalty for double-assignment
- Lightweight calendar replaces FullCalendar due to sandbox memory constraints
- All code changes maintain flexibility to add new tasks (like "Aseo General")
