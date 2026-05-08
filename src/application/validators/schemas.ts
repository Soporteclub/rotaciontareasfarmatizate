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
  email: z.string().email("Email inválido").optional().nullable(),
  groupId: z.string().min(1, "El grupo es requerido"),
  joinDate: z.string().optional(), // ISO date string
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().nullable().optional(),
  groupId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  leaveDate: z.string().nullable().optional(),
});

// ─── Rule Schemas ─────────────────────────────────────────────

export const createRuleSchema = z.object({
  groupId: z.string().min(1, "El grupo es requerido"),
  dayOfWeek: z.number().int().min(0).max(6, "Día inválido (0-6)"),
  frequency: z.number().int().min(1, "Frecuencia mínima: 1").max(52, "Frecuencia máxima: 52"),
  taskLabel: z.string().max(100).optional().nullable(),
  validFrom: z.string().optional(),
  validTo: z.string().nullable().optional(),
});

export const updateRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  frequency: z.number().int().min(1).max(52).optional(),
  taskLabel: z.string().max(100).nullable().optional(),
  validFrom: z.string().optional(),
  validTo: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ─── Assignment Generation Schema ─────────────────────────────

export const generateAssignmentsSchema = z.object({
  groupId: z.string().min(1, "El grupo es requerido"),
  startDate: z.string().min(1, "Fecha inicio requerida"),
  endDate: z.string().min(1, "Fecha fin requerida"),
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  { message: "La fecha inicio debe ser anterior a la fecha fin", path: ["startDate"] }
);

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
export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
