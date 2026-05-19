"use client";

import { useState, useMemo } from "react";
import {
  useGroups, useAssignments,
  useBalanceReport, useAutoInitialize, useRules, useEmployees,
} from "@/frontend/presentation/lib/query/hooks";
import { Loader2 } from "lucide-react";
import { CalendarGrid } from "./calendar-grid";
import { DashboardFilters } from "./dashboard-filters";
import { DashboardSidebar } from "./dashboard-sidebar";
import { TodayPanel } from "./today-panel";
import { AssignmentEditDialog } from "@/frontend/presentation/components/shared/assignment-edit-dialog";
import type { AssignmentResponse } from "@/frontend/presentation/lib/query/hooks";
import {
  useCalendarNavigation,
  useCalendarFilters,
  useCalendarDays,
  useCalendarDateRange,
} from "./dashboard-hooks";

export function DashboardModule() {
  // ─── Auto-init ───────────────────────────────────────────────
  const { isInitializing, message: initMessage } = useAutoInitialize();
  const { data: groups, isLoading: loadingGroups } = useGroups();
  const { data: allEmployees } = useEmployees(undefined, true);
  const { data: allRules } = useRules(undefined, true);

  // ─── Assignment edit dialog ────────────────────────────────────
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentResponse | null>(null);

  const handleAssignmentClick = (assignmentId: string) => {
    // Find the full assignment from the filtered list
    const found = filteredAssignments?.find((a) => a.id === assignmentId);
    if (found) {
      setEditingAssignment(found);
      setEditDialogOpen(true);
    }
  };

  // ─── Calendar navigation ─────────────────────────────────────
  const {
    viewYear, viewMonth, viewDay, viewMode, setViewMode,
    navigatePrev, navigateNext, goToday,
  } = useCalendarNavigation();

  // ─── Group filter (needed before data fetching) ──────────────
  const [selectedGroupId, setSelectedGroupId] = useState<string>("_all");
  const effectiveGroupId = selectedGroupId !== "_all" ? selectedGroupId : undefined;

  // ─── Calendar date range ─────────────────────────────────────
  const calendarDates = useCalendarDateRange(viewYear, viewMonth, viewDay, viewMode);

  // ─── Data fetching ───────────────────────────────────────────
  const { data: assignments, isLoading: loadingAssignments } = useAssignments(
    effectiveGroupId, calendarDates.startDate, calendarDates.endDate,
  );

  const { data: balanceReport } = useBalanceReport(effectiveGroupId);

  // ─── Task type & search filters ──────────────────────────────
  const {
    selectedTaskType, setSelectedTaskType,
    searchName, setSearchName,
    availableTaskTypes,
    filteredAssignments,
    clearFilters: clearTaskFilters,
  } = useCalendarFilters(assignments);

  const hasActiveFilters = selectedGroupId !== "_all" || selectedTaskType !== "_all" || searchName.trim() !== "";

  const clearFilters = () => {
    setSelectedGroupId("_all");
    clearTaskFilters();
  };

  // ─── Calendar grid ───────────────────────────────────────────
  const calendarDays = useCalendarDays(
    viewYear, viewMonth, viewDay, viewMode, filteredAssignments, groups,
  );

  const taskLegend = useMemo(() => {
    if (!filteredAssignments) return [];
    const taskTypes = new Set<string>();
    filteredAssignments.forEach((a) => { if (a.taskName) taskTypes.add(a.taskName); });
    return Array.from(taskTypes).sort();
  }, [filteredAssignments]);

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

      {/* ─── Panel de Hoy: asignaciones del día ──────────────── */}
      <TodayPanel groups={groups} />

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
            onAssignmentClick={handleAssignmentClick}
          />
        </div>

        <DashboardSidebar
          groups={groups}
          balanceData={balanceReport}
          allEmployees={allEmployees}
          allRules={allRules}
          filteredAssignments={filteredAssignments ?? []}
          availableTaskTypes={availableTaskTypes}
          taskLegend={taskLegend}
          effectiveGroupId={effectiveGroupId}
        />
      </div>

      {/* Assignment edit dialog */}
      <AssignmentEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        assignment={editingAssignment}
        groups={groups}
      />
    </div>
  );
}
