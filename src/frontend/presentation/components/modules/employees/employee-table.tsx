"use client";

import { useState } from "react";
import { useUIStore } from "@/frontend/presentation/hooks/use-ui-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Briefcase,
  MapPin,
  CalendarDays,
  Pencil,
  Trash2,
  MoreHorizontal,
  ShieldCheck,
  ShieldOff,
  UserCircle,
  Search,
  ToggleRight,
} from "lucide-react";
import type {
  EmployeeResponse,
  GroupResponse,
} from "@/frontend/presentation/lib/query/hooks";
import { BRAND } from "@/frontend/presentation/lib/brand";
import {
  getGroupName,
  getGroupColor,
  formatDate,
} from "./employee-columns";

interface EmployeeTableProps {
  employees: EmployeeResponse[];
  allEmployees: EmployeeResponse[] | undefined;
  groups: GroupResponse[] | undefined;
  searchQuery: string;
  onEdit: (emp: EmployeeResponse) => void;
  onToggleActive: (emp: EmployeeResponse) => void;
  onDelete: (emp: EmployeeResponse) => Promise<void>;
  onManageEligibility: (emp: EmployeeResponse) => void;
  isDeletePending: boolean;
}

export function EmployeeTable({
  employees,
  allEmployees,
  groups,
  searchQuery,
  onEdit,
  onToggleActive,
  onDelete,
  onManageEligibility,
  isDeletePending,
}: EmployeeTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] =
    useState<EmployeeResponse | null>(null);

  const handleDeleteClick = (emp: EmployeeResponse) => {
    setEmployeeToDelete(emp);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;
    await onDelete(employeeToDelete);
    setDeleteDialogOpen(false);
    setEmployeeToDelete(null);
  };

  // Estado vacío: no hay empleados en absoluto
  if (allEmployees && allEmployees.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <UserCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No hay empleados</h3>
        <p className="text-muted-foreground">
          Agrega empleados a los grupos para comenzar.
        </p>
      </div>
    );
  }

  // Sin resultados de búsqueda/filtro
  if (employees.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">
          No se encontraron resultados
          {searchQuery && <span> para &quot;{searchQuery}&quot;</span>}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border overflow-hidden shadow-sm overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow
              className="border-b-2"
              style={{ backgroundColor: `${BRAND.PRIMARY}0A` }}
            >
              <TableHead className="w-[260px]">Nombre</TableHead>
              <TableHead className="hidden sm:table-cell">Cargo / Área</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead className="hidden md:table-cell">Estado</TableHead>
              <TableHead className="hidden lg:table-cell">Ingreso</TableHead>
              <TableHead className="w-[70px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp, index) => (
              <EmployeeRow
                key={emp.id}
                employee={emp}
                index={index}
                groups={groups}
                onEdit={onEdit}
                onToggleActive={onToggleActive}
                onDelete={handleDeleteClick}
                onManageEligibility={onManageEligibility}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar empleado</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar a{" "}
              <span className="font-semibold">{employeeToDelete?.name}</span>?
              Esta acción no se puede deshacer y se eliminarán todas sus
              asignaciones.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeletePending}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Fila de empleado en la tabla
function EmployeeRow({
  employee: emp,
  index,
  groups,
  onEdit,
  onToggleActive,
  onDelete,
  onManageEligibility,
}: {
  employee: EmployeeResponse;
  index: number;
  groups: GroupResponse[] | undefined;
  onEdit: (emp: EmployeeResponse) => void;
  onToggleActive: (emp: EmployeeResponse) => void;
  onDelete: (emp: EmployeeResponse) => void;
  onManageEligibility: (emp: EmployeeResponse) => void;
}) {
  const isAdmin = useUIStore((s) => s.adminModules.employees === true);
  const requestAdminUnlock = useUIStore((s) => s.requestAdminUnlock);
  const groupColor = getGroupColor(groups, emp.groupId);
  const isEven = index % 2 === 0;

  return (
    <TableRow
      className={!emp.isActive ? "opacity-55" : undefined}
      style={{ backgroundColor: isEven ? undefined : `${BRAND.PRIMARY}04` }}
    >
      {/* Nombre con avatar */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
            style={{ backgroundColor: emp.isActive ? groupColor : "#9ca3af" }}
          >
            {emp.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span
              className={`font-medium text-sm block truncate ${!emp.isActive ? "line-through" : ""}`}
            >
              {emp.name}
            </span>
            <span className="sm:hidden text-xs text-muted-foreground truncate block">
              {emp.position ?? emp.area ?? "—"}
            </span>
          </div>
        </div>
      </TableCell>

      {/* Cargo / Área */}
      <TableCell className="hidden sm:table-cell">
        <div className="space-y-0.5">
          {emp.position && (
            <div className="flex items-center gap-1.5 text-sm">
              <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{emp.position}</span>
            </div>
          )}
          {emp.area && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{emp.area}</span>
            </div>
          )}
          {!emp.position && !emp.area && (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </TableCell>

      {/* Grupo */}
      <TableCell>
        <Badge
          variant="outline"
          className="text-xs font-medium"
          style={{
            borderColor: emp.isActive ? groupColor : undefined,
            color: emp.isActive ? groupColor : undefined,
          }}
        >
          <div
            className="w-2 h-2 rounded-full mr-1.5"
            style={{ backgroundColor: emp.isActive ? groupColor : "#9ca3af" }}
          />
          {getGroupName(groups, emp.groupId)}
        </Badge>
      </TableCell>

      {/* Estado */}
      <TableCell className="hidden md:table-cell">
        {emp.isActive ? (
          <Badge
            className="text-xs font-medium border-0"
            style={{ backgroundColor: `${BRAND.ACCENT}18`, color: BRAND.ACCENT }}
          >
            <ShieldCheck className="h-3 w-3 mr-1" />
            Activo
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-xs font-medium text-muted-foreground"
          >
            <ShieldOff className="h-3 w-3 mr-1" />
            Inactivo
          </Badge>
        )}
      </TableCell>

      {/* Fecha de ingreso */}
      <TableCell className="hidden lg:table-cell">
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          {formatDate(emp.joinDate)}
        </div>
      </TableCell>

      {/* Acciones */}
      <TableCell className="text-right">
        {isAdmin ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onEdit(emp)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onManageEligibility(emp)}>
              <ToggleRight className="h-4 w-4 mr-2" />
              Actividades
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive(emp)}>
              {emp.isActive ? (
                <>
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Desactivar
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Reactivar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(emp)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground"
              onClick={() => onManageEligibility(emp)}
              title="Ver actividades"
            >
              <ToggleRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground"
              onClick={() => requestAdminUnlock("employees")}
              title="Requiere clave admin"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
