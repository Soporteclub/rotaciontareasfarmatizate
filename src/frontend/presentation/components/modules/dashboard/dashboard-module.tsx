"use client";

import { useState, useMemo } from "react";
import {
  useGroups, useAssignments, useGenerateAssignments,
  useBalanceReport, useAutoInitialize, useRules, useEmployees,
} from "@/frontend/presentation/lib/query/hooks";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getCalendarDays, getWeekDays, getDayView, type CalendarDay, type ViewMode,
} from "./calendar-utils";
import { CalendarGrid } from "./calendar-grid";
import { DashboardFilters } from "./dashboard-filters";
import { DashboardSidebar } from "./dashboard-sidebar";
import { GenerateDialog } from "./generate-dialog";

export function DashboardModule() {
  // ─── Estado ──────────────────────────────────────────────────
  const { isInitializing, message: initMessage } = useAutoInitialize();
  const { data: groups, isLoading: loadingGroups } = useGroups();
  const { data: allEmployees } = useEmployees(undefined, true);
  const { data: allRules } = useRules(undefined, true);

  const [selectedGroupId, setSelectedGroupId] = useState<string>("_all");
  const [selectedTaskType, setSelectedTaskType] = useState<string>("_all");
  const [searchName, setSearchName] = useState("");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateRange, setGenerateRange] = useState({ startDate: "", endDate: "" });
  const [generateGroupId, setGenerateGroupId] = useState<string>("");

  const generateAssignments = useGenerateAssignments();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewDay, setViewDay] = useState(now.getDate());
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  // ─── Datos derivados ─────────────────────────────────────────
  const effectiveGroupId = selectedGroupId !== "_all" ? selectedGroupId : undefined;

  const calendarDates = useMemo(() => {
    if (viewMode === "month") {
      const start = new Date(viewYear, viewMonth - 1, 1);
      const end = new Date(viewYear, viewMonth + 2, 0);
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      };
    }
    if (viewMode === "week") {
      const weekDays = getWeekDays(viewYear, viewMonth, viewDay);
      const start = weekDays[0].date;
      const end = weekDays[6].date;
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      };
    }
    // day view — fetch a small window around the day
    const d = new Date(viewYear, viewMonth, viewDay);
    return {
      startDate: d.toISOString().split("T")[0],
      endDate: d.toISOString().split("T")[0],
    };
  }, [viewYear, viewMonth, viewDay, viewMode]);

  const { data: assignments, isLoading: loadingAssignments } = useAssignments(
    effectiveGroupId, calendarDates.startDate, calendarDates.endDate,
  );

  const { data: balanceReport } = useBalanceReport(effectiveGroupId);

  const availableTaskTypes = useMemo(() => {
    if (!assignments) return [];
    const types = new Set<string>();
    assignments.forEach((a) => { if (a.taskType) types.add(a.taskType); });
    return Array.from(types).sort();
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];
    let filtered = assignments;
    if (selectedTaskType !== "_all") {
      filtered = filtered.filter((a) => a.taskType === selectedTaskType);
    }
    if (searchName.trim()) {
      const q = searchName.toLowerCase().trim();
      filtered = filtered.filter((a) => (a.employee?.name?.toLowerCase() ?? "").includes(q));
    }
    return filtered;
  }, [assignments, selectedTaskType, searchName]);

  const calendarDays: CalendarDay[] = useMemo(() => {
    let days: CalendarDay[];
    if (viewMode === "week") {
      days = getWeekDays(viewYear, viewMonth, viewDay);
    } else if (viewMode === "day") {
      days = [getDayView(viewYear, viewMonth, viewDay)];
    } else {
      days = getCalendarDays(viewYear, viewMonth);
    }

    if (!filteredAssignments || !groups) return days;

    const dateMap = new Map<string, CalendarDay["assignments"]>();
    for (const a of filteredAssignments) {
      const dateKey = new Date(a.date).toISOString().split("T")[0];
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      const group = groups.find((g) => g.id === a.groupId);
      dateMap.get(dateKey)!.push({
        id: a.id, taskType: a.taskType ?? "",
        employeeName: a.employee?.name ?? "",
        groupName: group?.name ?? "", groupId: a.groupId,
        isLocked: a.isLocked, groupColor: group?.color ?? "#6b7280",
      });
    }

    for (const day of days) {
      const key = day.date.toISOString().split("T")[0];
      day.assignments = dateMap.get(key) ?? [];
    }
    return days;
  }, [viewYear, viewMonth, viewDay, viewMode, filteredAssignments, groups]);

  const taskLegend = useMemo(() => {
    if (!filteredAssignments) return [];
    const taskTypes = new Set<string>();
    filteredAssignments.forEach((a) => { if (a.taskType) taskTypes.add(a.taskType); });
    return Array.from(taskTypes).sort();
  }, [filteredAssignments]);

  // ─── Acciones ────────────────────────────────────────────────
  const hasActiveFilters = selectedGroupId !== "_all" || selectedTaskType !== "_all" || searchName.trim() !== "";

  const clearFilters = () => {
    setSelectedGroupId("_all");
    setSelectedTaskType("_all");
    setSearchName("");
  };

  const handleGenerate = async () => {
    if (!generateGroupId || !generateRange.startDate || !generateRange.endDate) {
      toast.error("Completa todos los campos");
      return;
    }
    try {
      const result = await generateAssignments.mutateAsync({
        groupId: generateGroupId,
        startDate: generateRange.startDate,
        endDate: generateRange.endDate,
      });
      toast.success(`Se generaron ${result.assignments.length} asignaciones`);
      setGenerateDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al generar");
    }
  };

  const openGenerateDialog = (groupId: string) => {
    if (!groupId || groupId === "_all") {
      toast.error("Selecciona un grupo específico");
      return;
    }
    setGenerateGroupId(groupId);
    const n = new Date();
    const start = new Date(n.getFullYear(), n.getMonth(), 1);
    const end = new Date(n.getFullYear(), n.getMonth() + 3, 0);
    setGenerateRange({
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
    setGenerateDialogOpen(true);
  };

  // Navegación unificada según vista
  const navigatePrev = () => {
    if (viewMode === "month") {
      if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
      else setViewMonth(viewMonth - 1);
    } else {
      const offset = viewMode === "week" ? -7 : -1;
      const d = new Date(viewYear, viewMonth, viewDay + offset);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setViewDay(d.getDate());
    }
  };

  const navigateNext = () => {
    if (viewMode === "month") {
      if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
      else setViewMonth(viewMonth + 1);
    } else {
      const offset = viewMode === "week" ? 7 : 1;
      const d = new Date(viewYear, viewMonth, viewDay + offset);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setViewDay(d.getDate());
    }
  };

  const goToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setViewDay(t.getDate());
  };

  const isLoading = isInitializing || loadingGroups || loadingAssignments;

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {isInitializing && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/60 text-sm text-muted-foreground animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{initMessage || "Inicializando..."}</span>
        </div>
      )}

      <DashboardFilters
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        selectedTaskType={selectedTaskType}
        setSelectedTaskType={setSelectedTaskType}
        searchName={searchName}
        setSearchName={setSearchName}
        groups={groups}
        availableTaskTypes={availableTaskTypes}
        filteredCount={filteredAssignments?.length ?? 0}
        hasActiveFilters={hasActiveFilters}
        clearFilters={clearFilters}
        onOpenGenerateDialog={openGenerateDialog}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-4">
          <CalendarGrid
            calendarDays={calendarDays}
            isLoading={isLoading}
            viewYear={viewYear}
            viewMonth={viewMonth}
            viewDay={viewDay}
            viewMode={viewMode}
            setViewMode={setViewMode}
            prevMonth={navigatePrev}
            nextMonth={navigateNext}
            goToday={goToday}
            groups={groups}
            availableTaskTypes={availableTaskTypes}
          />
        </div>

        <DashboardSidebar
          groups={groups}
          balanceReport={balanceReport}
          allEmployees={allEmployees}
          allRules={allRules}
          filteredAssignments={filteredAssignments ?? []}
          availableTaskTypes={availableTaskTypes}
          taskLegend={taskLegend}
          effectiveGroupId={effectiveGroupId}
        />
      </div>

      <GenerateDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        groups={groups}
        generateGroupId={generateGroupId}
        setGenerateGroupId={setGenerateGroupId}
        generateRange={generateRange}
        setGenerateRange={setGenerateRange}
        handleGenerate={handleGenerate}
        isPending={generateAssignments.isPending}
      />
    </div>
  );
}
