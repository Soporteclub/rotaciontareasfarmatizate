// Domain Entity Types - Strict TypeScript, no `any`
// These are the pure domain types, independent of any framework or database

export interface AssignmentGroupEntity {
  id: string;
  name: string;
  description: string | null;
  taskType: string;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeEntity {
  id: string;
  name: string;
  position: string | null;
  area: string | null;
  groupId: string;
  isActive: boolean;
  joinDate: Date;
  leaveDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FrequencyType = "daily" | "weekly" | "monthly";

export const FREQUENCY_TYPE_LABELS: Record<FrequencyType, string> = {
  daily: "Diaria",
  weekly: "Semanal",
  monthly: "Mensual",
};

export interface AssignmentRuleEntity {
  id: string;
  groupId: string;
  dayOfWeek: DayOfWeek;
  frequencyType: FrequencyType;
  frequency: number; // legacy
  taskLabel: string; // e.g. "Sacar Basura", "Lavar Cafetera"
  validFrom: Date;
  validTo: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentEntity {
  id: string;
  groupId: string;
  employeeId: string;
  ruleId: string | null;
  date: Date;
  taskType: string; // e.g. "Sacar Basura", "Lavar Cafetera"
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogEntity {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  changedBy: string | null;
  changes: string | null;
  groupId: string | null;
  createdAt: Date;
}

// Enums as union types for strict typing
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type EntityType = "group" | "employee" | "rule" | "assignment";
export type AuditAction = "create" | "update" | "delete" | "deactivate" | "reactivate" | "regenerate" | "lock";

export const DAY_NAMES: Record<DayOfWeek, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

export const TASK_TYPES = [
  { value: "cleaning", label: "Aseo" },
  { value: "kitchen", label: "Cocina" },
  { value: "reception", label: "Recepción" },
  { value: "opening", label: "Apertura Oficina" },
  { value: "closing", label: "Cierre Oficina" },
  { value: "inventory", label: "Inventarios" },
  { value: "other", label: "Otro" },
] as const;

// Common task labels used in rules - these are what appear on the calendar
export const TASK_LABELS = [
  "Sacar Basura",
  "Lavar Cafetera",
  "Aseo General",
  "Organizar Cocina",
  "Recepción",
  "Apertura",
  "Cierre",
] as const;

export type TaskType = (typeof TASK_TYPES)[number]["value"];
