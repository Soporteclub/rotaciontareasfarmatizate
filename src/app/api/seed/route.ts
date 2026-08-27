// Seed API Route - Populate data for the rotating task assignment system
// POST /api/seed
// Two groups (Piso 1, Piso 2) with two tasks:
//   - "Sacar Basura" -> Tuesday (2) and Thursday (4)
//   - "Lavar Cafetera" -> Monday-Friday (1-5)
// Includes Colombian holidays (festivos) for 2024-2030

import { NextResponse } from "next/server";
import { db } from "@/backend/infrastructure/database";
import { generateColombianHolidaysForRange } from "@/backend/domain/holidays/colombian-holidays";

// ─── Types ────────────────────────────────────────────────────

interface GroupRecord { id: string }
interface EmployeeRecord { id: string }

interface TaskConfig {
  taskName: string;
  days: number[];
}

// ─── Task definitions ─────────────────────────────────────────

const TASK_CONFIGS: TaskConfig[] = [
  { taskName: "Sacar Basura", days: [2, 4] },
  { taskName: "Lavar Cafetera", days: [1, 2, 3, 4, 5] },
];

// ─── Pure helpers ─────────────────────────────────────────────

// FIX (BC-2): build holiday date keys with UTC accessors so the seed loop
// lines up with the instants as the Fairness Engine's dateToKey (also UTC)
// and with holiday rows stored in the DB. On a TZ≠UTC server (p. ej. UTC de
// Netlify) a local `getDate()` key shifted the day and could skip mismatches.
function buildHolidayDateSet(holidays: Array<{ date: Date }>): Set<string> {
  const dateSet = new Set<string>();
  for (const h of holidays) {
    const d = h.date;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    dateSet.add(key);
  }
  return dateSet;
}

function formatDateKey(date: Date): string {
  // FIX (BC-2): UTC accessors (mirror of fairness-engine.dateToKey) so keys
  // are stable regardless of the server timezone.
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function isTaskDay(taskConfig: TaskConfig, dayOfWeek: number): boolean {
  return taskConfig.days.includes(dayOfWeek);
}

// ─── Database seeding helpers ─────────────────────────────────

async function createRulesForGroup(groupId: string): Promise<void> {
  const rulePromises: Promise<unknown>[] = [];

  for (const task of TASK_CONFIGS) {
    for (const day of task.days) {
      rulePromises.push(
        db.rule.create({
          data: { groupId, dayOfWeek: day, frequencyType: "weekly", frequency: 1, taskLabel: task.taskName },
        }),
      );
    }
  }

  await Promise.all(rulePromises);
}

function buildHistoricalAssignments(
  groups: Array<{ group: GroupRecord; employees: EmployeeRecord[] }>,
  holidayDateSet: Set<string>,
): Promise<unknown>[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pastDate = new Date(today);
  pastDate.setMonth(pastDate.getMonth() - 1);

  // Track rotating index per group+task combination
  const indexMap = new Map<string, number>();

  const assignmentPromises: Promise<unknown>[] = [];

  let datePointer = new Date(pastDate);
  while (datePointer <= today) {
    const dayOfWeek = datePointer.getDay();
    const dateKey = formatDateKey(datePointer);

    if (!holidayDateSet.has(dateKey)) {
      for (const { group, employees } of groups) {
        for (const task of TASK_CONFIGS) {
          if (isTaskDay(task, dayOfWeek)) {
            const key = `${group.id}:${task.taskName}`;
            const idx = indexMap.get(key) ?? 0;
            const emp = employees[idx % employees.length];

            assignmentPromises.push(
              db.assignment.create({
                data: {
                  groupId: group.id,
                  employeeId: emp.id,
                  date: new Date(datePointer),
                  taskName: task.taskName,
                  isLocked: true,
                },
              }),
            );

            indexMap.set(key, idx + 1);
          }
        }
      }
    }

    datePointer.setDate(datePointer.getDate() + 1);
  }

  return assignmentPromises;
}

// ─── Main route handler ───────────────────────────────────────

export async function POST() {
  try {
    // Check if already seeded
    const existingGroups = await db.group.count();
    if (existingGroups > 0) {
      return NextResponse.json({ message: "Ya existen datos. Saltando seed.", skipped: true });
    }

    // ─── Create Groups ─────────────────────────────────────────────
    const piso1 = await db.group.create({
      data: {
        name: "Piso 1",
        description: "Grupo de rotación de tareas para el Piso 1",
        taskType: "cleaning",
        color: "#1545cb", // Farmatizate brand blue
      },
    });

    const piso2 = await db.group.create({
      data: {
        name: "Piso 2",
        description: "Grupo de rotación de tareas para el Piso 2",
        taskType: "cleaning",
        color: "#066aab", // Farmatizate secondary blue
      },
    });

    // ─── Create Employees ──────────────────────────────────────────
    const piso1Employees = await createPiso1Employees(piso1.id);
    const piso2Employees = await createPiso2Employees(piso2.id);

    // ─── Create Rules ──────────────────────────────────────────────
    await createRulesForGroup(piso1.id);
    await createRulesForGroup(piso2.id);

    // ─── Seed Colombian Holidays ───────────────────────────────────
    const colombianHolidays = generateColombianHolidaysForRange(2024, 2030);

    await db.holiday.createMany({
      data: colombianHolidays.map((h) => ({
        date: new Date(h.date.getFullYear(), h.date.getMonth(), h.date.getDate()),
        name: h.name,
        type: h.type,
        isRecurring: h.type === "fixed",
        isActive: true,
      })),
    });

    const holidayDateSet = buildHolidayDateSet(colombianHolidays);

    // ─── Create Historical Assignments (past month) ───────────────
    const groupEmployeePairs = [
      { group: piso1, employees: piso1Employees },
      { group: piso2, employees: piso2Employees },
    ];
    const assignmentPromises = buildHistoricalAssignments(groupEmployeePairs, holidayDateSet);
    await Promise.all(assignmentPromises);

    // ─── Audit Logs ────────────────────────────────────────────────
    await db.auditLog.createMany({
      data: [
        { entityType: "group", entityId: piso1.id, action: "create", changedBy: "seed", groupId: piso1.id },
        { entityType: "group", entityId: piso2.id, action: "create", changedBy: "seed", groupId: piso2.id },
        { entityType: "holiday", entityId: "batch", action: "create", changedBy: "seed", changes: JSON.stringify({ count: colombianHolidays.length, years: "2024-2030" }) },
      ],
    });

    // ─── Initialize Settings ───────────────────────────────────────
    // FIX (API-07, SEC-01, SEC-02): No more hardcoded "farmatizate2025" admin key.
    // The key is now randomly generated (32 hex chars) and returned ONCE to the
    // caller so the admin can note it. It is never written to source control.
    const crypto = await import("crypto");
    const generatedAdminKey = crypto.randomBytes(16).toString("hex"); // 32 chars
    await db.settings.upsert({
      where: { id: "app" },
      update: {},
      create: { id: "app", key: generatedAdminKey, value: generatedAdminKey },
    });

    const totalRules = TASK_CONFIGS.reduce((sum, t) => sum + t.days.length, 0) * 2;

    return NextResponse.json({
      message: "Datos creados exitosamente",
      groups: 2,
      employees: piso1Employees.length + piso2Employees.length,
      rules: totalRules,
      holidays: colombianHolidays.length,
      tasks: ["Sacar Basura (Mar, Jue)", "Lavar Cafetera (Lun-Vie)"],
      // FIX (API-07): return the generated admin key ONCE so the admin can note it.
      // It is stored hashed-equivalent (plaintext in DB for now, but never in source).
      // The admin should change it immediately via PUT /api/settings.
      adminKey: generatedAdminKey,
      adminKeyNotice: "Guarda esta clave en un lugar seguro. No se volvera a mostrar.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error en seed";
    console.error("Seed error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Employee creation helpers ────────────────────────────────
// FIX (SEC-02): Replaced 16 real employees' PII (names, positions, areas) with
// obviously synthetic placeholder data. Real PII must never live in source code.

async function createPiso1Employees(groupId: string): Promise<EmployeeRecord[]> {
  return Promise.all([
    db.employee.create({ data: { name: "Empleado Piso1 01", position: "Auxiliar", area: "Operacion", groupId } }),
    db.employee.create({ data: { name: "Empleado Piso1 02", position: "Auxiliar", area: "Operacion", groupId } }),
    db.employee.create({ data: { name: "Empleado Piso1 03", position: "Auxiliar", area: "Operacion", groupId } }),
    db.employee.create({ data: { name: "Empleado Piso1 04", position: "Auxiliar", area: "Operacion", groupId } }),
    db.employee.create({ data: { name: "Empleado Piso1 05", position: "Auxiliar", area: "Operacion", groupId } }),
    db.employee.create({ data: { name: "Empleado Piso1 06", position: "Coordinador", area: "Operacion", groupId } }),
    db.employee.create({ data: { name: "Empleado Piso1 07", position: "Auxiliar", area: "Operacion", groupId } }),
    db.employee.create({ data: { name: "Empleado Piso1 08", position: "Coordinador", area: "Operacion", groupId } }),
    db.employee.create({ data: { name: "Empleado Piso1 09", position: "Auxiliar", area: "Operacion", groupId } }),
    db.employee.create({ data: { name: "Empleado Piso1 10", position: "Auxiliar", area: "Operacion", groupId } }),
  ]);
}

async function createPiso2Employees(groupId: string): Promise<EmployeeRecord[]> {
  return Promise.all([
    db.employee.create({ data: { name: "Empleado Piso2 01", position: "Auxiliar", area: "Operacion", groupId } }),
    db.employee.create({ data: { name: "Empleado Piso2 02", position: "Coordinador", area: "Operacion", groupId } }),
    db.employee.create({ data: { name: "Empleado Piso2 03", position: "Auxiliar", area: "Operacion", groupId } }),
    db.employee.create({ data: { name: "Empleado Piso2 04", position: "Auxiliar", area: "Operacion", groupId } }),
    db.employee.create({ data: { name: "Empleado Piso2 05", position: "Auxiliar", area: "Operacion", groupId } }),
    db.employee.create({ data: { name: "Empleado Piso2 06", position: "Auxiliar", area: "Operacion", groupId } }),
  ]);
}
