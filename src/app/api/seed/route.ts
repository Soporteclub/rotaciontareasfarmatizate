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

function buildHolidayDateSet(holidays: Array<{ date: Date }>): Set<string> {
  const dateSet = new Set<string>();
  for (const h of holidays) {
    const key = `${h.date.getFullYear()}-${String(h.date.getMonth() + 1).padStart(2, "0")}-${String(h.date.getDate()).padStart(2, "0")}`;
    dateSet.add(key);
  }
  return dateSet;
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isTaskDay(taskConfig: TaskConfig, dayOfWeek: number): boolean {
  return taskConfig.days.includes(dayOfWeek);
}

// ─── Database seeding helpers ─────────────────────────────────

async function createRulesForGroup(groupId: string): Promise<void> {
  const rulePromises = [];

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
    await db.settings.upsert({
      where: { id: "app" },
      update: {},
      create: { id: "app", key: "farmatizate2025", value: "farmatizate2025" },
    });

    const totalRules = TASK_CONFIGS.reduce((sum, t) => sum + t.days.length, 0) * 2;

    return NextResponse.json({
      message: "Datos creados exitosamente",
      groups: 2,
      employees: piso1Employees.length + piso2Employees.length,
      rules: totalRules,
      holidays: colombianHolidays.length,
      tasks: ["Sacar Basura (Mar, Jue)", "Lavar Cafetera (Lun-Vie)"],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error en seed";
    console.error("Seed error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Employee creation helpers ────────────────────────────────

async function createPiso1Employees(groupId: string): Promise<EmployeeRecord[]> {
  return Promise.all([
    db.employee.create({ data: { name: "Camila Guerrero", position: "Asesora integral de producto", area: "POS", groupId } }),
    db.employee.create({ data: { name: "Danna Gamboa", position: "Asesora técnica de producto", area: "Calidad", groupId } }),
    db.employee.create({ data: { name: "David Rampla", position: "Asesor comercial", area: "Comercial", groupId } }),
    db.employee.create({ data: { name: "Estella Puerta", position: "Asesora técnica de producto", area: "SSTAPP", groupId } }),
    db.employee.create({ data: { name: "Fernando Neira", position: "Asesor comercial", area: "Comercial", groupId } }),
    db.employee.create({ data: { name: "Jeniffer López", position: "Líder asesoras calidad", area: "Calidad", groupId } }),
    db.employee.create({ data: { name: "Johana Filo", position: "Asesora técnica de producto", area: "SSTAPP", groupId } }),
    db.employee.create({ data: { name: "Julian Vélez", position: "Coordinador Comercial", area: "Comercial", groupId } }),
    db.employee.create({ data: { name: "Karime Santamaria", position: "Asesora técnica de producto", area: "Calidad", groupId } }),
    db.employee.create({ data: { name: "Marcela Bonilla", position: "Asesora técnica de producto", area: "POS", groupId } }),
  ]);
}

async function createPiso2Employees(groupId: string): Promise<EmployeeRecord[]> {
  return Promise.all([
    db.employee.create({ data: { name: "Jamiel Jackson", position: "Desarrollador", area: "Ingeniería", groupId } }),
    db.employee.create({ data: { name: "José Luis Mariño", position: "Director de proyectos", area: "Ingeniería", groupId } }),
    db.employee.create({ data: { name: "Kevin López", position: "Publicista Junior", area: "Marketing", groupId } }),
    db.employee.create({ data: { name: "Roberto José", position: "Desarrollador", area: "Ingeniería", groupId } }),
    db.employee.create({ data: { name: "Sebastian Camacho", position: "Soporte Software", area: "Ingeniería", groupId } }),
    db.employee.create({ data: { name: "Yirson Alejandro Ordoñez", position: "Contador", area: "Administrativo", groupId } }),
  ]);
}
