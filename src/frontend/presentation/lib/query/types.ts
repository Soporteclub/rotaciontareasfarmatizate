// Shared TypeScript interfaces for API responses

export interface GroupResponse {
  id: string;
  name: string;
  description: string | null;
  taskType: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employees?: EmployeeResponse[];
  rules?: RuleResponse[];
  _count?: { employees: number; rules: number; assignments: number };
}

export interface EmployeeResponse {
  id: string;
  name: string;
  position: string | null;
  area: string | null;
  groupId: string;
  isActive: boolean;
  joinDate: string;
  leaveDate: string | null;
  createdAt: string;
  updatedAt: string;
  group?: GroupResponse;
}

export interface RuleResponse {
  id: string;
  groupId: string;
  dayOfWeek: number;
  frequencyType: string;
  frequency: number;
  taskLabel: string;
  // FIX (Tarea 1+2): per-task color and icon (stored on the Rule)
  color: string | null;
  icon: string | null;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  group?: GroupResponse;
}

export interface AssignmentResponse {
  id: string;
  groupId: string;
  employeeId: string;
  ruleId: string | null;
  date: string;
  taskName: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  employee?: EmployeeResponse;
  group?: GroupResponse;
}

export interface AuditLogResponse {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changedBy: string | null;
  changes: string | null;
  groupId: string | null;
  createdAt: string;
}

export interface BalanceReportItem {
  employeeId: string;
  employeeName: string;
  totalAssignments: number;
  monthlyBalance: Record<string, number>;
  fairnessScore?: number;
  // FIX: per-task breakdown (taskName → count). Returned by the backend but
  // was missing from the frontend type. Used by the Balance section in the
  // DashboardInfoModal to show a per-task detail per employee.
  taskBreakdown?: Record<string, number>;
}

export interface BalanceReportResponse {
  report: BalanceReportItem[];
  dateRange: { from: string | null; to: string | null };
  totalAssignments: number;
  employeeCount: number;
  averagePerEmployee: number;
}

export interface GenerateResult {
  assignments: AssignmentResponse[];
  balanceReport: BalanceReportItem[];
  generatedAt: string;
}

export interface TaskEligibilityResponse {
  id: string;
  employeeId: string;
  taskName: string;
  isEnabled: boolean;
  deletedAssignments?: number; // Count of future assignments removed when disabling
}

export interface SettingsResponse {
  isConfigured: boolean;
  keyHint: string | null;
  createdAt: string | null;
}

export interface AutoInitState {
  isInitializing: boolean;
  step: "idle" | "checking-groups" | "seeding" | "checking-assignments" | "generating" | "done" | "error";
  message: string;
}
