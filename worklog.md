---
Task ID: 1-4
Agent: Main Agent
Task: Implement 4 user-requested features: Employee fields, Rules frequency, Calendar views, Fairness equity

Work Log:
- Analyzed codebase: Employee already has position (cargo) and area fields, no email - Task 1 already done
- Calendar already has day/week/month ViewModeToggle - Task 3 already done
- Added frequencyType field (daily/weekly/monthly) to Prisma schema AssignmentRule model
- Updated domain types with FrequencyType and FREQUENCY_TYPE_LABELS
- Updated Zod validators with frequencyType enum
- Updated rule service to handle frequencyType in create/update
- Updated FairnessEngine: added frequencyType support (daily=all weekdays, weekly=specific day, monthly=first occurrence)
- Improved FairnessEngine equity: added maxImbalance=1 constraint, increased balanceWeight from 3.0 to 5.0
- Updated frontend types (RuleResponse) with frequencyType field
- Updated rules-constants.ts with FREQUENCY_OPTIONS (Diaria/Semanal/Mensual)
- Updated create-rule-dialog.tsx with frequencyType selector
- Updated edit-rule-dialog.tsx with frequencyType selector
- Updated rule-card.tsx to display frequency type label
- Updated seed data with frequencyType: "weekly" for all rules
- Reset database and re-seeded
- Test: Piso 1 shows 12/12/11/12/12 (max diff=1), Piso 2 shows 12/12/12/12/11 (max diff=1)

Stage Summary:
- frequencyType field added (daily/weekly/monthly) replacing old numeric frequency concept
- Fairness engine enforces max difference of 1 between employees
- Distribution now equitable instead of 7/7/6/5/5 pattern
