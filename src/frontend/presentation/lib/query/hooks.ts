// Barrel re-export — keeps all existing imports working
// import { useGroups, ... } from "@/frontend/presentation/lib/query/hooks"

export type {
  GroupResponse,
  EmployeeResponse,
  RuleResponse,
  AssignmentResponse,
  AuditLogResponse,
  BalanceReportItem,
  GenerateResult,
  AutoInitState,
} from "./types";

export { apiFetch, rawFetch } from "./api-client";

export {
  useGroups,
  useGroup,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
} from "./group-hooks";

export {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from "./employee-hooks";

export {
  useRules,
  useCreateRule,
  useUpdateRule,
  useDeleteRule,
} from "./rule-hooks";

export {
  useAssignments,
  useGenerateAssignments,
  useBalanceReport,
} from "./assignment-hooks";

export {
  useAuditLogs,
} from "./audit-hooks";

export {
  useAutoInitialize,
} from "./use-auto-initialize";
