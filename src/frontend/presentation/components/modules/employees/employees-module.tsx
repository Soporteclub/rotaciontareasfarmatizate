"use client";

import { useState } from "react";
import {
  useEmployees,
  useGroups,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from "@/frontend/presentation/lib/query/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserPlus,
  Pencil,
  Trash2,
  MoreHorizontal,
  ArrowRightLeft,
  UserCircle,
  Mail,
  CalendarDays,
  Users,
  Search,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";

export function EmployeesModule() {
  const { data: groups, isLoading: loadingGroups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const { data: employees, isLoading: loadingEmployees } = useEmployees(
    selectedGroupId || undefined,
    true
  );
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    groupId: "",
    joinDate: new Date().toISOString().split("T")[0],
  });

  const resetForm = () => {
    setForm({ name: "", email: "", groupId: "", joinDate: new Date().toISOString().split("T")[0] });
    setEditingId(null);
  };

  const handleEdit = (emp: Record<string, unknown>) => {
    const e = emp as { id: string; name: string; email: string | null; groupId: string; joinDate: string };
    setForm({
      name: e.name,
      email: e.email ?? "",
      groupId: e.groupId,
      joinDate: e.joinDate.split("T")[0],
    });
    setEditingId(e.id);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateEmployee.mutateAsync({
          id: editingId,
          name: form.name,
          email: form.email || null,
          groupId: form.groupId || undefined,
        });
        toast.success("Empleado actualizado");
      } else {
        if (!form.groupId && !selectedGroupId) {
          toast.error("Selecciona un grupo");
          return;
        }
        await createEmployee.mutateAsync({
          name: form.name,
          email: form.email || null,
          groupId: form.groupId || selectedGroupId,
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

  const handleToggleActive = async (emp: Record<string, unknown>) => {
    const e = emp as { id: string; isActive: boolean; name: string };
    try {
      await updateEmployee.mutateAsync({
        id: e.id,
        isActive: !e.isActive,
        leaveDate: e.isActive ? new Date().toISOString() : null,
      });
      toast.success(e.isActive ? `${e.name} desactivado` : `${e.name} reactivado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  // Get group name helper
  const getGroupName = (groupId: string) =>
    groups?.find((g) => g.id === groupId)?.name ?? "Sin grupo";

  const getGroupColor = (groupId: string) =>
    groups?.find((g) => g.id === groupId)?.color ?? "#6b7280";

  // Filter employees by search
  const filteredEmployees = employees?.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      (e.email?.toLowerCase().includes(q) ?? false) ||
      getGroupName(e.groupId).toLowerCase().includes(q)
    );
  });

  const activeEmployees = filteredEmployees?.filter((e) => e.isActive) ?? [];
  const inactiveEmployees = filteredEmployees?.filter((e) => !e.isActive) ?? [];

  const isLoading = loadingGroups || loadingEmployees;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Empleados</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Empleados</h1>
          <p className="text-muted-foreground text-sm">
            Gestiona el personal de los grupos de rotación
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Nuevo Empleado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label>Email (opcional)</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Grupo</Label>
                <Select
                  value={form.groupId || selectedGroupId}
                  onValueChange={(v) => setForm((f) => ({ ...f, groupId: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
                  <SelectContent>
                    {groups?.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                          {g.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!editingId && (
                <div className="space-y-2">
                  <Label>Fecha de Ingreso</Label>
                  <Input
                    type="date"
                    value={form.joinDate}
                    onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value }))}
                  />
                </div>
              )}
              <Button onClick={handleSubmit} className="w-full" disabled={createEmployee.isPending || updateEmployee.isPending}>
                {editingId ? "Actualizar" : "Crear Empleado"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, email..."
            className="pl-9"
          />
        </div>
        {/* Group filter */}
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los grupos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los grupos</SelectItem>
            {groups?.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Count */}
        <div className="text-sm text-muted-foreground">
          {activeEmployees.length} activo{activeEmployees.length !== 1 ? "s" : ""}
          {inactiveEmployees.length > 0 && (
            <span> · {inactiveEmployees.length} inactivo{inactiveEmployees.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>

      {/* Active employees table */}
      {activeEmployees.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[280px]">Nombre</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead className="hidden md:table-cell">Ingreso</TableHead>
                <TableHead className="w-[60px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeEmployees.map((emp) => {
                const groupColor = getGroupColor(emp.groupId);
                return (
                  <TableRow key={emp.id}>
                    {/* Name with avatar */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: groupColor }}
                        >
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm truncate">{emp.name}</span>
                      </div>
                    </TableCell>
                    {/* Email */}
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{emp.email ?? "—"}</span>
                      </div>
                    </TableCell>
                    {/* Group badge */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-xs font-medium"
                        style={{ borderColor: groupColor, color: groupColor }}
                      >
                        <div
                          className="w-2 h-2 rounded-full mr-1.5"
                          style={{ backgroundColor: groupColor }}
                        />
                        {getGroupName(emp.groupId)}
                      </Badge>
                    </TableCell>
                    {/* Join date */}
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        {new Date(emp.joinDate).toLocaleDateString("es-CO", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </TableCell>
                    {/* Actions dropdown */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(emp as unknown as Record<string, unknown>)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleToggleActive(emp as unknown as Record<string, unknown>)}
                          >
                            <ShieldOff className="h-4 w-4 mr-2" />
                            Desactivar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Inactive employees table */}
      {inactiveEmployees.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldOff className="h-4 w-4" />
            <span className="font-medium">Inactivos ({inactiveEmployees.length})</span>
          </div>
          <div className="rounded-lg border overflow-hidden border-dashed">
            <Table>
              <TableBody>
                {inactiveEmployees.map((emp) => {
                  const groupColor = getGroupColor(emp.groupId);
                  return (
                    <TableRow key={emp.id} className="opacity-60">
                      <TableCell className="w-[280px]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-muted-foreground bg-muted shrink-0">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-sm line-through">{emp.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-muted-foreground text-sm">
                          {emp.email ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs opacity-70">
                          {getGroupName(emp.groupId)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        Salida: {emp.leaveDate ? new Date(emp.leaveDate).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-8 gap-1.5"
                          onClick={() => handleToggleActive(emp as unknown as Record<string, unknown>)}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Reactivar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {employees && employees.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <UserCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No hay empleados</h3>
          <p className="text-muted-foreground">Agrega empleados a los grupos para comenzar.</p>
        </div>
      )}

      {/* No search results */}
      {filteredEmployees && filteredEmployees.length === 0 && searchQuery && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No se encontraron resultados para &quot;{searchQuery}&quot;</p>
        </div>
      )}
    </div>
  );
}
