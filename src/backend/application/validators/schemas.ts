// Zod Validation Schemas - Shared between frontend and backend
import { z } from "zod/v4";

// ─── Group Schemas ────────────────────────────────────────────

export const createGroupSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres"),
  description: z.string().max(500, "Máximo 500 caracteres").optional(),
  taskType: z.enum([
    "cleaning", "kitchen", "reception",
    "opening", "closing", "inventory", "other"
  ], { message: "Tipo de tarea inválido" }),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido (formato: #RRGGBB)"),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres").optional(),
  description: z.string().max(500, "Máximo 500 caracteres").nullable().optional(),
  taskType: z.enum([
    "cleaning", "kitchen", "reception",
    "opening", "closing", "inventory", "other"
  ]).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido").optional(),
  isActive: z.boolean().optional(),
});

// ─── Employee Schemas ─────────────────────────────────────────

export const createEmployeeSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres"),
  position: z.string().max(100, "Máximo 100 caracteres").optional().nullable(),
  area: z.string().max(100, "Máximo 100 caracteres").optional().nullable(),
  groupId: z.string().min(1, "El grupo es requerido"),
  joinDate: z.string().optional(), // ISO date string
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  position: z.string().max(100).nullable().optional(),
  area: z.string().max(100).nullable().optional(),
  groupId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  joinDate: z.string().optional(),
  leaveDate: z.string().nullable().optional(),
});

// ─── Rule Schemas ─────────────────────────────────────────────

// FIX (Tarea 1+2): added optional `color` (hex) and `icon` (lucide name) fields
// so each task can have its own visual identity independent of the group color.
const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const createRuleSchema = z.object({
  groupId: z.string().min(1, "El grupo es requerido"),
  dayOfWeek: z.number().int().min(0).max(6, "Día inválido (0-6)"),
  frequencyType: z.enum(["daily", "weekly", "monthly"], { message: "Frecuencia inválida" }).default("weekly"),
  frequency: z.number().int().min(1).max(52).optional(), // legacy
  taskLabel: z.string().min(1, "La etiqueta de tarea es requerida").max(100, "Máximo 100 caracteres"),
  color: z.string().regex(hexColorRegex, "Color inválido (formato: #RRGGBB)").optional(),
  icon: z.string().min(1).max(60).optional(), // lucide icon name, e.g. "trash-2"
  validFrom: z.string().optional(),
  validTo: z.string().nullable().optional(),
});

export const updateRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  frequencyType: z.enum(["daily", "weekly", "monthly"]).optional(),
  frequency: z.number().int().min(1).max(52).optional(), // legacy
  taskLabel: z.string().min(1).max(100).optional(),
  color: z.string().regex(hexColorRegex, "Color inválido").nullable().optional(),
  icon: z.string().min(1).max(60).nullable().optional(),
  validFrom: z.string().optional(),
  validTo: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ─── Assignment Generation Schema ─────────────────────────────

// FIX (BC-3): startDate/endDate must be REAL ISO dates (YYYY-MM-DD), not just
// non-empty strings. `new Date("garbage")` becomes Invalid Date and previously
// slipped past the `<` comparison (NaN < NaN is false, yielding a confusing
// downstream failure). Range is also capped to 366 days so a caller cannot
// book a year+ of assignments in a single request.
const isoDate = z
  .string()
  .min(1, "Fecha requerida")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
  .refine((s) => !Number.isNaN(new Date(`${s}T00:00:00.000Z`).getTime()), {
    message: "Fecha inválida",
  });

// FIX (BC-3): 86400s = 24h; used to cap the generation range above.
const MS_PER_DAY = 86_400_000;

export const generateAssignmentsSchema = z
  .object({
    groupId: z.string().min(1, "El grupo es requerido"),
    employeeId: z.string().optional(),
    startDate: isoDate,
    endDate: isoDate,
  })
  .refine((data) => new Date(`${data.endDate}T00:00:00.000Z`) >= new Date(`${data.startDate}T00:00:00.000Z`), {
    message: "La fecha inicio no puede ser posterior a la fecha fin",
    path: ["startDate"],
  })
  .refine(
    (data) =>
      (new Date(`${data.endDate}T00:00:00.000Z`).getTime() -
        new Date(`${data.startDate}T00:00:00.000Z`).getTime()) /
        MS_PER_DAY <=
      366,
    { message: "El rango no puede superar 366 días", path: ["endDate"] },
    );

// ─── Assignment Deletion Schema ─────────────────────────────────
// FIX (BC-3): reuses the strict isoDate helper so date strings are validated
// (YYYY-MM-DD + real calendar day) before being passed to the service. Previously
// the delete route validated dates as plain optional strings, which let invalid
// values reach the service silently.

export const deleteAssignmentsSchema = z
  .object({
    groupId: z.string().min(1, "groupId es requerido"),
    employeeId: z.string().optional(),
    startDate: isoDate.optional().nullable().transform((v) => v ?? null),
    endDate: isoDate.optional().nullable().transform((v) => v ?? null),
    force: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && !data.endDate) {
      ctx.addIssue({ code: "custom", message: "startDate requiere endDate", path: ["endDate"] });
    }
    if (data.endDate && !data.startDate) {
      ctx.addIssue({ code: "custom", message: "endDate requiere startDate", path: ["startDate"] });
    }
    if (
      data.startDate &&
      data.endDate &&
      new Date(`${data.endDate}T00:00:00.000Z`) < new Date(`${data.startDate}T00:00:00.000Z`)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "La fecha inicio debe ser anterior a la fecha fin",
        path: ["startDate"],
      });
    }
  });

// ─── Audit Query Schema ───────────────────────────────────────

export const auditQuerySchema = z.object({
  entityType: z.enum(["group", "employee", "rule", "assignment"]).optional(),
  entityId: z.string().optional(),
  groupId: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// ─── Type Exports ─────────────────────────────────────────────

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;
export type GenerateAssignmentsInput = z.infer<typeof generateAssignmentsSchema>;
export type DeleteAssignmentsInput = z.infer<typeof deleteAssignmentsSchema>;
export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
