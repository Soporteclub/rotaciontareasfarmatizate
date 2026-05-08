"use client";

import { useAuditLogs, useGroups } from "@/frontend/presentation/lib/query/hooks";
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
import { ScrollText, Filter } from "lucide-react";
import { useState } from "react";

const ACTION_LABELS: Record<string, string> = {
  create: "Creación",
  update: "Actualización",
  delete: "Eliminación",
  deactivate: "Desactivación",
  reactivate: "Reactivación",
  regenerate: "Regeneración",
  lock: "Bloqueo",
};

const ENTITY_LABELS: Record<string, string> = {
  group: "Grupo",
  employee: "Empleado",
  rule: "Regla",
  assignment: "Asignación",
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-blue-100 text-blue-800",
  update: "bg-sky-100 text-sky-800",
  delete: "bg-red-100 text-red-800",
  deactivate: "bg-orange-100 text-orange-800",
  reactivate: "bg-teal-100 text-teal-800",
  regenerate: "bg-purple-100 text-purple-800",
  lock: "bg-gray-100 text-gray-800",
};

const ACTION_DOT_COLORS: Record<string, string> = {
  create: "#1545cb",
  update: "#066aab",
  delete: "#dc2626",
  deactivate: "#f15a24",
  reactivate: "#00cd98",
  regenerate: "#7c3aed",
  lock: "#6b7280",
};

export function AuditModule() {
  const [entityType, setEntityType] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const { data: groups } = useGroups();
  const { data: auditData, isLoading } = useAuditLogs({
    entityType: entityType || undefined,
    groupId: groupId || undefined,
    limit: 100,
  });

  const logs = auditData?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoría</h1>
        <p className="text-muted-foreground">Registro completo de todas las modificaciones</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            <SelectItem value="group">Grupos</SelectItem>
            <SelectItem value="employee">Empleados</SelectItem>
            <SelectItem value="rule">Reglas</SelectItem>
            <SelectItem value="assignment">Asignaciones</SelectItem>
          </SelectContent>
        </Select>
        <Select value={groupId} onValueChange={setGroupId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los grupos</SelectItem>
            {groups?.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logs */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : logs.length > 0 ? (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {ENTITY_LABELS[log.entityType] ?? log.entityType}
                      </Badge>
                      <Badge className={`text-xs ${ACTION_COLORS[log.action] ?? ""}`}>
                        <span className="w-1.5 h-1.5 rounded-full mr-1 inline-block" style={{ backgroundColor: ACTION_DOT_COLORS[log.action] ?? "#6b7280" }} />
                        {ACTION_LABELS[log.action] ?? log.action}
                      </Badge>
                      {log.groupId && (
                        <Badge variant="secondary" className="text-xs">
                          {groups?.find((g) => g.id === log.groupId)?.name ?? log.groupId.slice(0, 8)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ID: <span className="font-mono">{log.entityId.slice(0, 12)}...</span>
                      {log.changedBy && ` • Por: ${log.changedBy}`}
                    </p>
                    {log.changes && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          Ver cambios
                        </summary>
                        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto max-w-full">
                          {(() => {
                            try {
                              return JSON.stringify(JSON.parse(log.changes), null, 2);
                            } catch (e) {
                              console.warn("Failed to parse audit log changes:", e);
                              return log.changes;
                            }
                          })()}
                        </pre>
                      </details>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("es")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <ScrollText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Sin registros</h3>
            <p className="text-muted-foreground">Aún no hay registros de auditoría.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
