// Seed API Route - Populate data for the rotating task assignment system
// POST /api/seed
// Two groups (Piso 1, Piso 2) with two tasks:
//   - "Sacar Basura" -> Tuesday (2) and Thursday (4)
//   - "Lavar Cafetera" -> Monday-Friday (1-5)
// Includes Colombian holidays (festivos) for 2024-2030

import { NextResponse } from "next/server";
import { db } from "@/backend/infrastructure/database";
import { generateColombianHolidaysForRange } from "@/backend/domain/holidays/colombian-holidays";

export async function POST() {
  try {
    // Check if already seeded
    const existingGroups = await db.assignmentGroup.count();
    if (existingGroups > 0) {
      return NextResponse.json({ message: "Ya existen datos. Saltando seed.", skipped: true });
    }

    // ─── Create Groups ─────────────────────────────────────────────
    const piso1 = await db.assignmentGroup.create({
      data: {
        name: "Piso 1",
        description: "Grupo de rotación de tareas para el Piso 1",
        taskType: "cleaning",
        color: "#1545cb", // Farmatizate brand blue
      },
    });

    const piso2 = await db.assignmentGroup.create({
      data: {
        name: "Piso 2",
        description: "Grupo de rotación de tareas para el Piso 2",
        taskType: "cleaning",
        color: "#066aab", // Farmatizate secondary blue
      },
    });

    // ─── Create Employees ──────────────────────────────────────────
    // Piso 1 employees (10)
    const piso1Employees = await Promise.all([
      db.employee.create({ data: { name: "Camila Guerrero", position: "Asesora integral de producto", area: "POS", groupId: piso1.id } }),
      db.employee.create({ data: { name: "Danna Gamboa", position: "Asesora técnica de producto", area: "Calidad", groupId: piso1.id } }),
      db.employee.create({ data: { name: "David Rampla", position: "Asesor comercial", area: "Comercial", groupId: piso1.id } }),
      db.employee.create({ data: { name: "Estella Puerta", position: "Asesora técnica de producto", area: "SSTAPP", groupId: piso1.id } }),
      db.employee.create({ data: { name: "Fernando Neira", position: "Asesor comercial", area: "Comercial", groupId: piso1.id } }),
      db.employee.create({ data: { name: "Jeniffer López", position: "Líder asesoras calidad", area: "Calidad", groupId: piso1.id } }),
      db.employee.create({ data: { name: "Johana Filo", position: "Asesora técnica de producto", area: "SSTAPP", groupId: piso1.id } }),
      db.employee.create({ data: { name: "Julian Vélez", position: "Coordinador Comercial", area: "Comercial", groupId: piso1.id } }),
      db.employee.create({ data: { name: "Karime Santamaria", position: "Asesora técnica de producto", area: "Calidad", groupId: piso1.id } }),
      db.employee.create({ data: { name: "Marcela Bonilla", position: "Asesora técnica de producto", area: "POS", groupId: piso1.id } }),
    ]);

    // Piso 2 employees (6)
    const piso2Employees = await Promise.all([
      db.employee.create({ data: { name: "Jamiel Jackson", position: "Desarrollador", area: "Ingeniería", groupId: piso2.id } }),
      db.employee.create({ data: { name: "José Luis Mariño", position: "Director de proyectos", area: "Ingeniería", groupId: piso2.id } }),
      db.employee.create({ data: { name: "Kevin López", position: "Publicista Junior", area: "Marketing", groupId: piso2.id } }),
      db.employee.create({ data: { name: "Roberto José", position: "Desarrollador", area: "Ingeniería", groupId: piso2.id } }),
      db.employee.create({ data: { name: "Sebastian Camacho", position: "Soporte Software", area: "Ingeniería", groupId: piso2.id } }),
      db.employee.create({ data: { name: "Yirson Alejandro Ordoñez", position: "Contador", area: "Administrativo", groupId: piso2.id } }),
    ]);

    // ─── Create Rules ──────────────────────────────────────────────
    const rulePromises = [];

    for (const group of [piso1, piso2]) {
      // Sacar Basura: Tuesday and Thursday (weekly)
      rulePromises.push(
        db.assignmentRule.create({
          data: { groupId: group.id, dayOfWeek: 2, frequencyType: "weekly", frequency: 1, taskLabel: "Sacar Basura" },
        }),
        db.assignmentRule.create({
          data: { groupId: group.id, dayOfWeek: 4, frequencyType: "weekly", frequency: 1, taskLabel: "Sacar Basura" },
        }),
      );

      // Lavar Cafetera: Monday through Friday (weekly)
      for (let day = 1; day <= 5; day++) {
        rulePromises.push(
          db.assignmentRule.create({
            data: { groupId: group.id, dayOfWeek: day, frequencyType: "weekly", frequency: 1, taskLabel: "Lavar Cafetera" },
          }),
        );
      }
    }

    await Promise.all(rulePromises);

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

    // Build holiday set for assignment generation (skip holidays)
    const holidayDateSet = new Set<string>();
    for (const h of colombianHolidays) {
      const key = `${h.date.getFullYear()}-${String(h.date.getMonth() + 1).padStart(2, "0")}-${String(h.date.getDate()).padStart(2, "0")}`;
      holidayDateSet.add(key);
    }

    // ─── Create Historical Assignments (past month) ───────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pastDate = new Date(today);
    pastDate.setMonth(pastDate.getMonth() - 1);

    const assignmentPromises = [];
    let piso1BasuraIdx = 0;
    let piso1CafeteraIdx = 0;
    let piso2BasuraIdx = 0;
    let piso2CafeteraIdx = 0;

    let datePointer = new Date(pastDate);
    while (datePointer <= today) {
      const dayOfWeek = datePointer.getDay();
      const dateKey = `${datePointer.getFullYear()}-${String(datePointer.getMonth() + 1).padStart(2, "0")}-${String(datePointer.getDate()).padStart(2, "0")}`;

      // Skip holidays - no assignments on festivos
      if (holidayDateSet.has(dateKey)) {
        datePointer.setDate(datePointer.getDate() + 1);
        continue;
      }

      // Piso 1: Sacar Basura (Tue, Thu)
      if (dayOfWeek === 2 || dayOfWeek === 4) {
        const emp = piso1Employees[piso1BasuraIdx % piso1Employees.length];
        assignmentPromises.push(
          db.assignment.create({
            data: {
              groupId: piso1.id,
              employeeId: emp.id,
              date: new Date(datePointer),
              taskType: "Sacar Basura",
              isLocked: true,
            },
          })
        );
        piso1BasuraIdx++;
      }

      // Piso 1: Lavar Cafetera (Mon-Fri)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const emp = piso1Employees[piso1CafeteraIdx % piso1Employees.length];
        assignmentPromises.push(
          db.assignment.create({
            data: {
              groupId: piso1.id,
              employeeId: emp.id,
              date: new Date(datePointer),
              taskType: "Lavar Cafetera",
              isLocked: true,
            },
          })
        );
        piso1CafeteraIdx++;
      }

      // Piso 2: Sacar Basura (Tue, Thu)
      if (dayOfWeek === 2 || dayOfWeek === 4) {
        const emp = piso2Employees[piso2BasuraIdx % piso2Employees.length];
        assignmentPromises.push(
          db.assignment.create({
            data: {
              groupId: piso2.id,
              employeeId: emp.id,
              date: new Date(datePointer),
              taskType: "Sacar Basura",
              isLocked: true,
            },
          })
        );
        piso2BasuraIdx++;
      }

      // Piso 2: Lavar Cafetera (Mon-Fri)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const emp = piso2Employees[piso2CafeteraIdx % piso2Employees.length];
        assignmentPromises.push(
          db.assignment.create({
            data: {
              groupId: piso2.id,
              employeeId: emp.id,
              date: new Date(datePointer),
              taskType: "Lavar Cafetera",
              isLocked: true,
            },
          })
        );
        piso2CafeteraIdx++;
      }

      datePointer.setDate(datePointer.getDate() + 1);
    }

    await Promise.all(assignmentPromises);

    // ─── Audit Logs ────────────────────────────────────────────────
    await db.auditLog.createMany({
      data: [
        { entityType: "group", entityId: piso1.id, action: "create", changedBy: "seed", groupId: piso1.id },
        { entityType: "group", entityId: piso2.id, action: "create", changedBy: "seed", groupId: piso2.id },
        { entityType: "holiday", entityId: "batch", action: "create", changedBy: "seed", changes: JSON.stringify({ count: colombianHolidays.length, years: "2024-2030" }) },
      ],
    });

    const totalRules = 14; // 2 groups × (2 sacar basura + 5 lavar cafetera) = 14

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
