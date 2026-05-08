// Seed API Route - Populate demo data for testing
// POST /api/seed

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    // Check if already seeded
    const existingGroups = await db.assignmentGroup.count();
    if (existingGroups > 0) {
      return NextResponse.json({ message: "Ya existen datos. Saltando seed.", skipped: true });
    }

    // Create groups
    const piso2 = await db.assignmentGroup.create({
      data: {
        name: "Piso 2 - Aseo",
        description: "Grupo de aseo para el piso 2 de la oficina",
        taskType: "cleaning",
        color: "#10b981",
      },
    });

    const piso3 = await db.assignmentGroup.create({
      data: {
        name: "Piso 3 - Aseo",
        description: "Grupo de aseo para el piso 3 de la oficina",
        taskType: "cleaning",
        color: "#f59e0b",
      },
    });

    const cocina = await db.assignmentGroup.create({
      data: {
        name: "Cocina",
        description: "Turnos de cocina y comedor",
        taskType: "kitchen",
        color: "#ef4444",
      },
    });

    const recepcion = await db.assignmentGroup.create({
      data: {
        name: "Recepción",
        description: "Turnos de recepción de visitantes",
        taskType: "reception",
        color: "#8b5cf6",
      },
    });

    // Create employees for Piso 2
    const piso2Employees = await Promise.all([
      db.employee.create({ data: { name: "Ana García", email: "ana@empresa.com", groupId: piso2.id } }),
      db.employee.create({ data: { name: "Carlos López", email: "carlos@empresa.com", groupId: piso2.id } }),
      db.employee.create({ data: { name: "María Rodríguez", email: "maria@empresa.com", groupId: piso2.id } }),
      db.employee.create({ data: { name: "Pedro Martínez", email: "pedro@empresa.com", groupId: piso2.id } }),
      db.employee.create({ data: { name: "Laura Sánchez", email: "laura@empresa.com", groupId: piso2.id } }),
    ]);

    // Create employees for Piso 3
    const piso3Employees = await Promise.all([
      db.employee.create({ data: { name: "Diego Fernández", email: "diego@empresa.com", groupId: piso3.id } }),
      db.employee.create({ data: { name: "Sofía Gómez", email: "sofia@empresa.com", groupId: piso3.id } }),
      db.employee.create({ data: { name: "Javier Díaz", email: "javier@empresa.com", groupId: piso3.id } }),
      db.employee.create({ data: { name: "Valentina Ruiz", email: "valentina@empresa.com", groupId: piso3.id } }),
    ]);

    // Create employees for Cocina
    const cocinaEmployees = await Promise.all([
      db.employee.create({ data: { name: "Roberto Torres", email: "roberto@empresa.com", groupId: cocina.id } }),
      db.employee.create({ data: { name: "Camila Herrera", email: "camila@empresa.com", groupId: cocina.id } }),
      db.employee.create({ data: { name: "Andrés Morales", email: "andres@empresa.com", groupId: cocina.id } }),
    ]);

    // Create employees for Recepción
    const recepcionEmployees = await Promise.all([
      db.employee.create({ data: { name: "Isabella Castro", email: "isabella@empresa.com", groupId: recepcion.id } }),
      db.employee.create({ data: { name: "Mateo Vargas", email: "mateo@empresa.com", groupId: recepcion.id } }),
    ]);

    // Create rules - Piso 2: Tuesday and Thursday
    await Promise.all([
      db.assignmentRule.create({
        data: { groupId: piso2.id, dayOfWeek: 2, frequency: 1, taskLabel: "Aseo Piso 2" },
      }),
      db.assignmentRule.create({
        data: { groupId: piso2.id, dayOfWeek: 4, frequency: 1, taskLabel: "Aseo Piso 2" },
      }),
    ]);

    // Piso 3: Monday, Wednesday, Friday
    await Promise.all([
      db.assignmentRule.create({
        data: { groupId: piso3.id, dayOfWeek: 1, frequency: 1, taskLabel: "Aseo Piso 3" },
      }),
      db.assignmentRule.create({
        data: { groupId: piso3.id, dayOfWeek: 3, frequency: 1, taskLabel: "Aseo Piso 3" },
      }),
      db.assignmentRule.create({
        data: { groupId: piso3.id, dayOfWeek: 5, frequency: 1, taskLabel: "Aseo Piso 3" },
      }),
    ]);

    // Cocina: Monday to Friday
    for (let day = 1; day <= 5; day++) {
      await db.assignmentRule.create({
        data: { groupId: cocina.id, dayOfWeek: day, frequency: 1, taskLabel: "Cocina" },
      });
    }

    // Recepción: Monday to Friday, every 2 weeks
    for (let day = 1; day <= 5; day++) {
      await db.assignmentRule.create({
        data: { groupId: recepcion.id, dayOfWeek: day, frequency: 2, taskLabel: "Recepción" },
      });
    }

    // Create some historical (locked) assignments for the past month
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setMonth(pastDate.getMonth() - 1);

    let datePointer = new Date(pastDate);
    let empIndex2 = 0;
    let empIndex3 = 0;

    while (datePointer < today) {
      const dayOfWeek = datePointer.getDay();

      // Piso 2: Tuesday and Thursday
      if (dayOfWeek === 2 || dayOfWeek === 4) {
        await db.assignment.create({
          data: {
            groupId: piso2.id,
            employeeId: piso2Employees[empIndex2 % piso2Employees.length].id,
            date: new Date(datePointer),
            taskType: "Aseo Piso 2",
            isLocked: true,
          },
        });
        empIndex2++;
      }

      // Piso 3: Monday, Wednesday, Friday
      if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
        await db.assignment.create({
          data: {
            groupId: piso3.id,
            employeeId: piso3Employees[empIndex3 % piso3Employees.length].id,
            date: new Date(datePointer),
            taskType: "Aseo Piso 3",
            isLocked: true,
          },
        });
        empIndex3++;
      }

      datePointer.setDate(datePointer.getDate() + 1);
    }

    // Create audit logs
    await db.auditLog.createMany({
      data: [
        { entityType: "group", entityId: piso2.id, action: "create", changedBy: "seed", groupId: piso2.id },
        { entityType: "group", entityId: piso3.id, action: "create", changedBy: "seed", groupId: piso3.id },
        { entityType: "group", entityId: cocina.id, action: "create", changedBy: "seed", groupId: cocina.id },
        { entityType: "group", entityId: recepcion.id, action: "create", changedBy: "seed", groupId: recepcion.id },
      ],
    });

    return NextResponse.json({
      message: "Datos demo creados exitosamente",
      groups: 4,
      employees: piso2Employees.length + piso3Employees.length + cocinaEmployees.length + recepcionEmployees.length,
      rules: 2 + 3 + 5 + 5, // 15 rules
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error en seed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
