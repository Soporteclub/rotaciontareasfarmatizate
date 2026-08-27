"use client";

import { useState, useMemo } from "react";
import {
  useGroups, useAssignments,
  useBalanceReport, useAutoInitialize, useRules, useEmployees,
} from "@/frontend/presentation/lib/query/hooks";
import { Loader2 } from "lucide-react";
import { useUIStore } from "@/frontend/presentation/hooks/use-ui-store";
import { CalendarGrid } from "./calendar-grid";
import { DashboardFilters } from "./dashboard-filters";
import { DashboardInfoModal } from "./dashboard-info-modal";
import { TodayPanel } from "./today-panel";
import { AssignmentEditDialog } from "@/frontend/presentation/components/shared/assignment-edit-dialog";
import type { AssignmentResponse, RuleResponse } from "@/frontend/presentation/lib/query/hooks";
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

  // ─── FIX (Tarea 3): Info modal state (replaces the right sidebar) ──
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  // ─── Admin check for editing assignments ──────────────────────
  const isAdmin = useUIStore((s) => s.isAdmin);
  const requestAdminUnlock = useUIStore((s) => s.requestAdminUnlock);

  const handleAssignmentClick = (assignmentId: string) => {
    // Only admin can edit assignments — security gate
    if (!isAdmin) {
      requestAdminUnlock();
      return;
    }
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
    navigatePrev, navigateNext, goToday, isViewingToday,
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
  // FIX (Tarea 1+2): pass allRules so the calendar can resolve per-task
  // color and icon (stored on the Rule) instead of using the group color.
  const calendarDays = useCalendarDays(
    viewYear, viewMonth, viewDay, viewMode, filteredAssignments, groups, allRules,
  );

  const taskLegend = useMemo(() => {
    if (!filteredAssignments) return [];
    const taskTypes = new Set<string>();
    filteredAssignments.forEach((a) => { if (a.taskName) taskTypes.add(a.taskName); });
    return Array.from(taskTypes).sort();
  }, [filteredAssignments]);

  // FIX (Tarea 1+2): build a taskName → { color, icon } map from all rules.
  // The first rule that defines a color/icon for a taskName wins. Passed to
  // CalendarGrid so it can render per-task colors/icons instead of group colors.
  const taskStyles = useMemo(() => {
    const map = new Map<string, { color: string | null; icon: string | null }>();
    if (allRules) {
      for (const r of allRules as RuleResponse[]) {
        if (!map.has(r.taskLabel)) {
          map.set(r.taskLabel, { color: r.color, icon: r.icon });
        }
      }
    }
    return map;
  }, [allRules]);

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
      <TodayPanel groups={groups} allRules={allRules} />

      <DashboardFilters
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        selectedTaskType={selectedTaskType}
        setSelectedTaskType={setSelectedTaskType}
        searchName={searchName}
        setSearchName={setSearchName}
        groups={groups}
        availableTaskTypes={availableTaskTypes}
        allRules={allRules}
        filteredCount={filteredAssignments?.length ?? 0}
        hasActiveFilters={hasActiveFilters}
        clearFilters={clearFilters}
      />

      {/* FIX (Tarea 3): Calendar now takes full width. The right sidebar was
          removed and its content moved into the DashboardInfoModal (ⓘ button). */}
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
        isViewingToday={isViewingToday}
        availableTaskTypes={availableTaskTypes}
        taskStyles={taskStyles}
        onAssignmentClick={isAdmin ? handleAssignmentClick : undefined}
        isAdmin={isAdmin}
        onAdminUnlockRequest={requestAdminUnlock}
        onOpenInfo={() => setInfoModalOpen(true)}
      />

      {/* FIX (Tarea 3): Info modal (replaces the right sidebar) */}
      <DashboardInfoModal
        open={infoModalOpen}
        onOpenChange={setInfoModalOpen}
        groups={groups}
        balanceData={balanceReport}
        allEmployees={allEmployees}
        allRules={allRules}
        filteredAssignments={filteredAssignments ?? []}
        availableTaskTypes={availableTaskTypes}
        taskLegend={taskLegend}
        effectiveGroupId={effectiveGroupId}
      />

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
