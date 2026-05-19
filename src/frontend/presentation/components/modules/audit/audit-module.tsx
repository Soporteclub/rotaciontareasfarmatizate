"use client";

import { useAuditLogs, useGroups, useEmployees } from "@/frontend/presentation/lib/query/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ScrollText, Filter, User, Building2, ClipboardCheck, CalendarDays,
  ChevronLeft, ChevronRight, ArrowUpDown, Activity,
} from "lucide-react";
import { AdminGuard } from "@/frontend/presentation/components/shared/admin-guard";
import { BRAND } from "@/frontend/presentation/lib/brand";
import { useState, useMemo } from "react";
import { MONTH_NAMES } from "@/frontend/presentation/components/modules/dashboard/calendar-utils";

/* ─── Labels & Colors ───────────────────────────────────────────── */

const ACTION_LABELS: Record<string, string> = {
  create: "Creado",
  update: "Actualizado",
  delete: "Eliminado",
  deactivate: "Desactivado",
  reactivate: "Reactivado",
  regenerate: "Regenerado",
  lock: "Bloqueado",
  syncEligibility: "Sincronización",
};

const ENTITY_LABELS: Record<string, string> = {
  group: "Grupo",
  employee: "Empleado",
  rule: "Regla",
  assignment: "Asignación",
  holiday: "Festivo",
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  group: <Building2 className="h-3.5 w-3.5" />,
  employee: <User className="h-3.5 w-3.5" />,
  rule: <ClipboardCheck className="h-3.5 w-3.5" />,
  assignment: <CalendarDays className="h-3.5 w-3.5" />,
  holiday: <CalendarDays className="h-3.5 w-3.5" />,
};

const ACTION_STYLES: Record<string, { bg: string; dot: string; border: string }> = {
  create:      { bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400", dot: "#10b981", border: "border-l-emerald-500" },
  update:      { bg: "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400", dot: "#0ea5e9", border: "border-l-sky-500" },
  delete:      { bg: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400", dot: "#ef4444", border: "border-l-red-500" },
  deactivate:  { bg: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400", dot: "#f97316", border: "border-l-orange-500" },
  reactivate:  { bg: "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400", dot: "#14b8a6", border: "border-l-teal-500" },
  regenerate:  { bg: "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400", dot: "#8b5cf6", border: "border-l-violet-500" },
  lock:        { bg: "bg-slate-50 text-slate-700 dark:bg-slate-950/30 dark:text-slate-400", dot: "#64748b", border: "border-l-slate-500" },
  syncEligibility:   { bg: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400", dot: "#06b6d4", border: "border-l-cyan-500" },
};

/* ─── Human-readable description generator ──────────────────────── */

function fallbackDescription(entity: string, action: string, groupName: string): string {
  return `${entity} ${action.toLowerCase()}${groupName ? ` — ${groupName}` : ""}`;
}

const FREQ_LABELS: Record<string, string> = {
  daily: "diaria",
  weekly: "semanal",
  monthly: "mensual",
};

function resolveEmployeeName(
  log: AuditLogItem,
  changes: Record<string, unknown> | null,
  employees: EmployeeInfo[],
): string {
  return employees.find(e => e.id === log.entityId)?.name
    ?? (changes?.name as string)
    ?? (changes?.after as Record<string, string>)?.name
    ?? "";
}

function describeEmployeeCreate(
  empName: string,
  groupName: string,
  changes: Record<string, unknown> | null,
): string {
  let detail = `${empName || "Empleado"} registrado en ${groupName}`;
  if (changes?.position) detail += ` — ${changes.position}`;
  if (changes?.area) detail += ` (${changes.area})`;
  return detail;
}

function describeEmployeeUpdate(
  empName: string,
  changes: Record<string, unknown> | null,
  groups: GroupInfo[],
): string {
  const before = (changes?.before ?? {}) as Record<string, string>;
  const after = (changes?.after ?? {}) as Record<string, string>;
  const fields: string[] = [];
  if (after.name && before.name !== after.name) fields.push(`nombre: ${after.name}`);
  if (after.position && before.position !== after.position) fields.push(`cargo: ${after.position}`);
  if (after.area && before.area !== after.area) fields.push(`área: ${after.area}`);
  if (after.groupId && before.groupId !== after.groupId) {
    const newGroup = groups.find(g => g.id === after.groupId)?.name ?? after.groupId;
    fields.push(`movido a ${newGroup}`);
  }
  return fields.length > 0
    ? `${empName || "Empleado"}: ${fields.join(", ")}`
    : `${empName || "Empleado"} actualizado`;
}

function describeEmployeeStatusChange(
  action: string,
  changes: Record<string, unknown> | null,
  empName: string,
  groupName: string,
): string {
  const name = (changes?.name as string) || empName || "Empleado";
  const verb = action === "deactivate" ? "desactivado" : "reactivado";
  return `${name} ${verb}${groupName ? ` en ${groupName}` : ""}`;
}

function describeEmployeeChange(
  log: AuditLogItem,
  changes: Record<string, unknown> | null,
  groupName: string,
  entity: string,
  action: string,
  groups: GroupInfo[],
  employees: EmployeeInfo[],
): string {
  const empName = resolveEmployeeName(log, changes, employees);

  if (log.action === "create") {
    return describeEmployeeCreate(empName, groupName, changes);
  }

  if (log.action === "update") {
    return describeEmployeeUpdate(empName, changes, groups);
  }

  if (log.action === "deactivate" || log.action === "reactivate") {
    return describeEmployeeStatusChange(log.action, changes, empName, groupName);
  }

  return fallbackDescription(empName || entity, action, groupName);
}

function describeGroupChange(
  log: AuditLogItem,
  entity: string,
  action: string,
  groups: GroupInfo[],
): string {
  const gName = groups.find(g => g.id === log.entityId)?.name ?? "";
  return gName
    ? `Grupo "${gName}" ${action.toLowerCase()}`
    : fallbackDescription(entity, action, "");
}

function describeRuleChange(
  changes: Record<string, unknown> | null,
  entity: string,
  action: string,
  groupName: string,
): string {
  if (!changes) {
    return fallbackDescription(entity, action, groupName);
  }
  const taskLabel = (changes.taskLabel as string) ?? (changes.after as Record<string, string>)?.taskLabel ?? "";
  const freq = (changes.frequencyType as string) ?? (changes.after as Record<string, string>)?.frequencyType ?? "";
  const freqLabel = FREQ_LABELS[freq] ?? "";
  return `Regla "${taskLabel}" (${freqLabel}) ${action.toLowerCase()}${groupName ? ` — ${groupName}` : ""}`;
}

function describeAssignmentChange(
  log: AuditLogItem,
  changes: Record<string, unknown> | null,
  entity: string,
  action: string,
  groupName: string,
): string {
  if (log.action === "regenerate") {
    const count = (changes?.count ?? changes?.generated ?? "") as string | number;
    return `Asignaciones regeneradas${groupName ? ` para ${groupName}` : ""}${count ? ` (${count} generadas)` : ""}`;
  }
  if (log.action === "lock") {
    const count = (changes?.count ?? "") as string | number;
    return `Asignaciones bloqueadas${groupName ? ` — ${groupName}` : ""}${count ? ` (${count})` : ""}`;
  }
  return fallbackDescription(entity, action, groupName);
}

const ENTITY_DESCRIBERS: Record<string, (
  log: AuditLogItem,
  changes: Record<string, unknown> | null,
  entity: string,
  action: string,
  groupName: string,
  groups: GroupInfo[],
  employees: EmployeeInfo[],
) => string> = {
  employee: (log, changes, entity, action, groupName, groups, employees) =>
    describeEmployeeChange(log, changes, groupName, entity, action, groups, employees),
  group: (log, _changes, entity, action, _groupName, groups) =>
    describeGroupChange(log, entity, action, groups),
  rule: (_log, changes, entity, action, groupName) =>
    describeRuleChange(changes, entity, action, groupName),
  assignment: (log, changes, entity, action, groupName) =>
    describeAssignmentChange(log, changes, entity, action, groupName),
};

function describeChange(log: AuditLogItem, groups: GroupInfo[], employees: EmployeeInfo[]): string {
  const entity = ENTITY_LABELS[log.entityType] ?? log.entityType;
  const action = ACTION_LABELS[log.action] ?? log.action;
  const groupName = log.groupId
    ? groups.find(g => g.id === log.groupId)?.name ?? ""
    : "";

  try {
    const changes = log.changes ? JSON.parse(log.changes) : null;
    const describer = ENTITY_DESCRIBERS[log.entityType];
    if (describer) {
      return describer(log, changes, entity, action, groupName, groups, employees);
    }
    return fallbackDescription(entity, action, groupName);
  } catch {
    return fallbackDescription(entity, action, groupName);
  }
}

/* ─── Types ─────────────────────────────────────────────────────── */

interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changedBy?: string | null;
  changes?: string | null;
  groupId?: string | null;
  createdAt: string;
}

interface GroupInfo {
  id: string;
  name: string;
  color: string;
}

interface EmployeeInfo {
  id: string;
  name: string;
  groupId: string;
}

/* ─── Date grouping ─────────────────────────────────────────────── */

function groupByDate(logs: AuditLogItem[]): Map<string, AuditLogItem[]> {
  const map = new Map<string, AuditLogItem[]>();
  for (const log of logs) {
    const d = new Date(log.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(log);
  }
  return map;
}

function formatDateHeader(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dayName = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][date.getDay()];
  const monthName = MONTH_NAMES[date.getMonth()];

  let relative = "";
  if (date.getTime() === today.getTime()) relative = " — Hoy";
  else if (date.getTime() === yesterday.getTime()) relative = " — Ayer";

  return `${dayName}, ${d} de ${monthName} de ${y}${relative}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/* ─── Helper: format raw JSON changes ──────────────────────────── */

function formatRawChanges(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

/* ─── Stats ─────────────────────────────────────────────────────── */

function StatsBar({ logs }: { logs: AuditLogItem[] }) {
  const stats = useMemo(() => {
    const byAction: Record<string, number> = {};
    const byEntity: Record<string, number> = {};
    for (const log of logs) {
      byAction[log.action] = (byAction[log.action] ?? 0) + 1;
      byEntity[log.entityType] = (byEntity[log.entityType] ?? 0) + 1;
    }
    return { byAction, byEntity, total: logs.length };
  }, [logs]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="border-l-4" style={{ borderLeftColor: BRAND.PRIMARY }}>
        <CardContent className="p-3">
          <div className="text-xs text-muted-foreground">Total eventos</div>
          <div className="text-xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>
      {Object.entries(stats.byEntity)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([entity, count]) => (
          <Card key={entity}>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {ENTITY_ICONS[entity]}
                {ENTITY_LABELS[entity] ?? entity}
              </div>
              <div className="text-xl font-bold">{count}</div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}

/* ─── Filter Bar ─────────────────────────────────────────────────── */

interface AuditFilterProps {
  entityType: string;
  groupId: string;
  groups: { id: string; name: string }[] | undefined;
  total: number;
  onEntityTypeChange: (v: string) => void;
  onGroupIdChange: (v: string) => void;
  onClear: () => void;
}

function AuditFilters({
  entityType, groupId, groups, total,
  onEntityTypeChange, onGroupIdChange, onClear,
}: AuditFilterProps) {
  const hasFilters = entityType || groupId;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={entityType || "_all"} onValueChange={(v) => onEntityTypeChange(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
              <SelectValue placeholder="Tipo de entidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas</SelectItem>
              <SelectItem value="group">Grupos</SelectItem>
              <SelectItem value="employee">Empleados</SelectItem>
              <SelectItem value="rule">Reglas</SelectItem>
              <SelectItem value="assignment">Asignaciones</SelectItem>
              <SelectItem value="holiday">Festivos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupId || "_all"} onValueChange={(v) => onGroupIdChange(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-48 h-9 text-sm">
              <SelectValue placeholder="Filtrar por grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos los grupos</SelectItem>
              {groups?.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={onClear}>
              Limpiar filtros
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            {total} registro{total !== 1 ? "s" : ""}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Log Card ──────────────────────────────────────────────────── */

function AuditLogCard({
  log, style, description, groupName,
}: {
  log: AuditLogItem;
  style: { bg: string; dot: string; border: string };
  description: string;
  groupName: string | null;
}) {
  return (
    <Card className={`border-l-4 ${style.border} hover:shadow-sm transition-shadow`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="outline" className="text-xs gap-1 h-6">
                {ENTITY_ICONS[log.entityType]}
                {ENTITY_LABELS[log.entityType] ?? log.entityType}
              </Badge>
              <Badge className={`text-xs h-6 ${style.bg}`}>
                <span
                  className="w-1.5 h-1.5 rounded-full mr-1.5 inline-block"
                  style={{ backgroundColor: style.dot }}
                />
                {ACTION_LABELS[log.action] ?? log.action}
              </Badge>
              {groupName && (
                <Badge variant="secondary" className="text-xs h-6 gap-1">
                  <Building2 className="h-3 w-3" />
                  {groupName}
                </Badge>
              )}
            </div>
            {/* Human-readable description */}
            <p className="text-sm font-medium leading-snug">{description}</p>
            {/* Changed by */}
            {log.changedBy && log.changedBy !== "system" && (
              <p className="text-xs text-muted-foreground mt-0.5">Por: {log.changedBy}</p>
            )}
            {/* Expandable raw changes */}
            {log.changes && (
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  Ver detalles técnicos
                </summary>
                <pre className="mt-1.5 text-xs bg-muted/50 p-2.5 rounded-md overflow-x-auto max-w-full font-mono leading-relaxed">
                  {formatRawChanges(log.changes)}
                </pre>
              </details>
            )}
          </div>
          {/* Timestamp */}
          <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
            {formatTime(log.createdAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */

export function AuditModule() {
  const [entityType, setEntityType] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const { data: groups } = useGroups();
  const { data: employeesData } = useEmployees({ includeInactive: true });
  const { data: auditData, isLoading } = useAuditLogs({
    entityType: entityType || undefined,
    groupId: groupId || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const logs: AuditLogItem[] = auditData?.items ?? [];
  const total = auditData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const groupInfo: GroupInfo[] = useMemo(
    () => groups?.map(g => ({ id: g.id, name: g.name, color: g.color })) ?? [],
    [groups]
  );

  const empInfo: EmployeeInfo[] = useMemo(
    () => employeesData?.map(e => ({ id: e.id, name: e.name, groupId: e.groupId })) ?? [],
    [employeesData]
  );

  const grouped = useMemo(() => groupByDate(logs), [logs]);

  return (
    <AdminGuard>
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${BRAND.PRIMARY}15` }}>
          <ScrollText className="h-5 w-5" style={{ color: BRAND.PRIMARY }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Auditoría</h1>
          <p className="text-sm text-muted-foreground">
            Historial completo de todas las acciones realizadas en el sistema
          </p>
        </div>
      </div>

      {/* Stats */}
      {logs.length > 0 && <StatsBar logs={logs} />}

      {/* Filters */}
      <AuditFilters
        entityType={entityType}
        groupId={groupId}
        groups={groups}
        total={total}
        onEntityTypeChange={(v) => { setEntityType(v); setPage(0); }}
        onGroupIdChange={(v) => { setGroupId(v); setPage(0); }}
        onClear={() => { setEntityType(""); setGroupId(""); setPage(0); }}
      />

      {/* Log Timeline */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : logs.length > 0 ? (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([dateKey, dateLogs]) => (
            <div key={dateKey}>
              {/* Date header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold text-muted-foreground px-3 py-1 bg-muted rounded-full">
                  {formatDateHeader(dateKey)}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Log items for this date */}
              <div className="space-y-2">
                {dateLogs.map((log) => {
                  const style = ACTION_STYLES[log.action] ?? ACTION_STYLES.update;
                  const description = describeChange(log, groupInfo, empInfo);
                  const groupName = log.groupId
                    ? groupInfo.find(g => g.id === log.groupId)?.name
                    : null;

                  return (
                    <AuditLogCard
                      key={log.id}
                      log={log}
                      style={style}
                      description={description}
                      groupName={groupName}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">Sin registros de auditoría</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Aquí se registrará automáticamente cada acción realizada en el sistema:
              crear, editar o eliminar empleados, reglas, grupos y asignaciones.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
    </AdminGuard>
  );
}
