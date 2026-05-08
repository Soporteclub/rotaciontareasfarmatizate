// Seed API Route - Populate data for the rotating task assignment system
// POST /api/seed
// Two groups (Piso 1, Piso 2) with two tasks:
//   - "Sacar Basura" -> Tuesday (2) and Thursday (4)
//   - "Lavar Cafetera" -> Monday-Friday (1-5)

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    // Piso 1 employees
    const piso1Employees = await Promise.all([
      db.employee.create({ data: { name: "Ana García", email: "ana@empresa.com", groupId: piso1.id } }),
      db.employee.create({ data: { name: "Carlos López", email: "carlos@empresa.com", groupId: piso1.id } }),
      db.employee.create({ data: { name: "María Rodríguez", email: "maria@empresa.com", groupId: piso1.id } }),
      db.employee.create({ data: { name: "Pedro Martínez", email: "pedro@empresa.com", groupId: piso1.id } }),
      db.employee.create({ data: { name: "Laura Sánchez", email: "laura@empresa.com", groupId: piso1.id } }),
    ]);

    // Piso 2 employees
    const piso2Employees = await Promise.all([
      db.employee.create({ data: { name: "Diego Fernández", email: "diego@empresa.com", groupId: piso2.id } }),
      db.employee.create({ data: { name: "Sofía Gómez", email: "sofia@empresa.com", groupId: piso2.id } }),
      db.employee.create({ data: { name: "Javier Díaz", email: "javier@empresa.com", groupId: piso2.id } }),
      db.employee.create({ data: { name: "Valentina Ruiz", email: "valentina@empresa.com", groupId: piso2.id } }),
      db.employee.create({ data: { name: "Andrés Morales", email: "andres@empresa.com", groupId: piso2.id } }),
    ]);

    // ─── Create Rules ──────────────────────────────────────────────
    // Task: "Sacar Basura" -> Tuesday (2) and Thursday (4) for BOTH groups
    // Task: "Lavar Cafetera" -> Monday (1) through Friday (5) for BOTH groups

    const rulePromises = [];

    for (const group of [piso1, piso2]) {
      // Sacar Basura: Tuesday and Thursday
      rulePromises.push(
        db.assignmentRule.create({
          data: { groupId: group.id, dayOfWeek: 2, frequency: 1, taskLabel: "Sacar Basura" },
        }),
        db.assignmentRule.create({
          data: { groupId: group.id, dayOfWeek: 4, frequency: 1, taskLabel: "Sacar Basura" },
        }),
      );

      // Lavar Cafetera: Monday through Friday
      for (let day = 1; day <= 5; day++) {
        rulePromises.push(
          db.assignmentRule.create({
            data: { groupId: group.id, dayOfWeek: day, frequency: 1, taskLabel: "Lavar Cafetera" },
          }),
        );
      }
    }

    await Promise.all(rulePromises);

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
    while (datePointer < today) {
      const dayOfWeek = datePointer.getDay();

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
      ],
    });

    const totalRules = 14; // 2 groups × (2 sacar basura + 5 lavar cafetera) = 14

    return NextResponse.json({
      message: "Datos creados exitosamente",
      groups: 2,
      employees: piso1Employees.length + piso2Employees.length,
      rules: totalRules,
      tasks: ["Sacar Basura (Mar, Jue)", "Lavar Cafetera (Lun-Vie)"],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error en seed";
    console.error("Seed error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
