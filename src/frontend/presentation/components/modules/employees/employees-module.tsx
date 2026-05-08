"use client";

import { useState } from "react";
import {
  useEmployees,
  useGroups,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from "@/frontend/presentation/lib/query/hooks";
import { toast } from "sonner";
import type { EmployeeResponse } from "@/frontend/presentation/lib/query/hooks";
import { type StatusFilter, getGroupName } from "./employee-columns";
import { EmployeeFilters } from "./employee-filters";
import {
  EmployeeFormDialog,
  type EmployeeFormData,
} from "./employee-form-dialog";
import { EmployeeTable } from "./employee-table";

const EMPTY_FORM: EmployeeFormData = {
  name: "",
  email: "",
  groupId: "",
  joinDate: new Date().toISOString().split("T")[0],
};

export function EmployeesModule() {
  const { data: groups, isLoading: loadingGroups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("_all");
  const { data: employees, isLoading: loadingEmployees } = useEmployees(
    selectedGroupId && selectedGroupId !== "_all" ? selectedGroupId : undefined,
    true
  );
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] =
    useState<EmployeeResponse | null>(null);
  const [form, setForm] = useState<EmployeeFormData>(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingEmployee(null);
  };

  const handleEdit = (emp: EmployeeResponse) => {
    setForm({
      name: emp.name,
      email: emp.email ?? "",
      groupId: emp.groupId,
      joinDate: emp.joinDate.split("T")[0],
    });
    setEditingEmployee(emp);
    setDialogOpen(true);
  };

  const handleFormSubmit = async () => {
    try {
      if (editingEmployee) {
        await updateEmployee.mutateAsync({
          id: editingEmployee.id,
          name: form.name,
          email: form.email || null,
          groupId: form.groupId || undefined,
        });
        toast.success("Empleado actualizado");
      } else {
        const gid =
          form.groupId || (selectedGroupId !== "_all" ? selectedGroupId : "");
        if (!gid) {
          toast.error("Selecciona un grupo");
          return;
        }
        await createEmployee.mutateAsync({
          name: form.name,
          email: form.email || null,
          groupId: gid,
          joinDate: form.joinDate,
        });
        toast.success("Empleado creado");
      }
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  const handleToggleActive = async (emp: EmployeeResponse) => {
    try {
      await updateEmployee.mutateAsync({
        id: emp.id,
        isActive: !emp.isActive,
        leaveDate: emp.isActive ? new Date().toISOString() : null,
      });
      toast.success(
        emp.isActive ? `${emp.name} desactivado` : `${emp.name} reactivado`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const handleDelete = async (emp: EmployeeResponse) => {
    try {
      await deleteEmployee.mutateAsync(emp.id);
      toast.success(`${emp.name} eliminado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  // Filtrar empleados por búsqueda y estado
  const filteredEmployees = employees
    ? employees
        .filter((e) => {
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesName = e.name.toLowerCase().includes(q);
            const matchesEmail = e.email?.toLowerCase().includes(q) ?? false;
            const matchesGroup = getGroupName(groups, e.groupId)
              .toLowerCase()
              .includes(q);
            if (!matchesName && !matchesEmail && !matchesGroup) return false;
          }
          if (statusFilter === "active" && !e.isActive) return false;
          if (statusFilter === "inactive" && e.isActive) return false;
          return true;
        })
        .sort((a, b) => {
          if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
    : [];

  const activeCount = employees?.filter((e) => e.isActive).length ?? 0;
  const inactiveCount = employees?.filter((e) => !e.isActive).length ?? 0;

  if (loadingGroups || loadingEmployees) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Empleados</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empleados</h1>
          <p className="text-muted-foreground text-sm">
            Gestiona el personal de los grupos de rotación
          </p>
        </div>
        <EmployeeFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
          form={form}
          onFormChange={setForm}
          isEdit={editingEmployee !== null}
          groups={groups}
          defaultGroupId={selectedGroupId}
          onSubmit={handleFormSubmit}
          isPending={createEmployee.isPending || updateEmployee.isPending}
        />
      </div>

      {/* Filtros */}
      <EmployeeFilters
        search={searchQuery}
        onSearchChange={setSearchQuery}
        groupFilter={selectedGroupId}
        onGroupFilterChange={setSelectedGroupId}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        groups={groups}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
      />

      {/* Tabla de datos */}
      <EmployeeTable
        employees={filteredEmployees}
        allEmployees={employees}
        groups={groups}
        searchQuery={searchQuery}
        onEdit={handleEdit}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
        isDeletePending={deleteEmployee.isPending}
      />
    </div>
  );
}
