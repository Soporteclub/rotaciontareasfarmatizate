"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import type { GroupResponse } from "@/frontend/presentation/lib/query/hooks";
import { BRAND_ACCENT, type StatusFilter } from "./employee-columns";

interface EmployeeFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  groupFilter: string;
  onGroupFilterChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  groups: GroupResponse[] | undefined;
  activeCount: number;
  inactiveCount: number;
}

export function EmployeeFilters({
  search,
  onSearchChange,
  groupFilter,
  onGroupFilterChange,
  statusFilter,
  onStatusFilterChange,
  groups,
  activeCount,
  inactiveCount,
}: EmployeeFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Búsqueda */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nombre, cargo, área..."
          className="pl-9"
        />
      </div>

      {/* Filtro de grupo */}
      <Select value={groupFilter} onValueChange={onGroupFilterChange}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Todos los grupos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos los grupos</SelectItem>
          {groups?.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: g.color }}
                />
                {g.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtro de estado */}
      <Select
        value={statusFilter}
        onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}
      >
        <SelectTrigger className="w-36">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Estado" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active">Activos</SelectItem>
          <SelectItem value="inactive">Inactivos</SelectItem>
        </SelectContent>
      </Select>

      {/* Contadores */}
      <div className="flex items-center gap-2 text-sm">
        <Badge
          variant="outline"
          className="font-medium"
          style={{ borderColor: BRAND_ACCENT, color: BRAND_ACCENT }}
        >
          {activeCount} activo{activeCount !== 1 ? "s" : ""}
        </Badge>
        {inactiveCount > 0 && (
          <Badge
            variant="outline"
            className="font-medium text-muted-foreground"
          >
            {inactiveCount} inactivo{inactiveCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>
    </div>
  );
}
