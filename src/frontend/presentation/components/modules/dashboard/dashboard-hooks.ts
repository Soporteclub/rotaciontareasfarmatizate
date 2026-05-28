import { useState, useMemo } from "react";
import {
  getCalendarDays, getWeekDays, getDayView, type CalendarDay, type ViewMode,
} from "./calendar-utils";
import type { AssignmentResponse, GroupResponse } from "@/frontend/presentation/lib/query/hooks";

/** Format a Date as YYYY-MM-DD using local timezone (avoids UTC shift) */
function toLocalDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Extract the date portion from an ISO UTC string as if it were midnight local.
 * Handles the common case where the backend stores dates as "2026-05-13T00:00:00.000Z"
 * which, in UTC-5 (Colombia), would otherwise shift to the previous day.
 * This function extracts "2026-05-13" directly from the string.
 */
function toUtcDateStr(dateFromApi: string | Date): string {
  const isoStr = typeof dateFromApi === "string" ? dateFromApi : dateFromApi.toISOString();
  // "2026-05-13T00:00:00.000Z" → "2026-05-13"
  return isoStr.split("T")[0];
}

/* ─── Calendar Navigation Hook ──────────────────────────────────── */

export function useCalendarNavigation() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewDay, setViewDay] = useState(now.getDate());
  const [viewMode, setViewMode] = useState<ViewMode>("month");

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
    // Keep current view mode — don't force switch to "day"
  };

  // Determine if the current view is already showing today
  const isViewingToday = useMemo(() => {
    const t = new Date();
    if (viewMode === "month") {
      return viewYear === t.getFullYear() && viewMonth === t.getMonth();
    }
    if (viewMode === "week") {
      // Check if today falls within the current week view
      const weekDays = getWeekDays(viewYear, viewMonth, viewDay);
      const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
      return weekDays.some((d) => {
        const ds = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, "0")}-${String(d.date.getDate()).padStart(2, "0")}`;
        return ds === todayStr;
      });
    }
    // day view
    return viewYear === t.getFullYear() && viewMonth === t.getMonth() && viewDay === t.getDate();
  }, [viewYear, viewMonth, viewDay, viewMode]);

  return {
    viewYear, viewMonth, viewDay, viewMode, setViewMode,
    navigatePrev, navigateNext, goToday, isViewingToday,
  };
}

/* ─── Calendar Filters Hook ─────────────────────────────────────── */

export function useCalendarFilters(assignments: AssignmentResponse[] | undefined) {
  const [selectedTaskType, setSelectedTaskType] = useState<string>("_all");
  const [searchName, setSearchName] = useState("");

  const availableTaskTypes = useMemo(() => {
    if (!assignments) return [];
    const types = new Set<string>();
    assignments.forEach((a) => { if (a.taskName) types.add(a.taskName); });
    return Array.from(types).sort();
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];
    let filtered = assignments;
    if (selectedTaskType !== "_all") {
      filtered = filtered.filter((a) => a.taskName === selectedTaskType);
    }
    if (searchName.trim()) {
      const q = searchName.toLowerCase().trim();
      filtered = filtered.filter((a) => (a.employee?.name?.toLowerCase() ?? "").includes(q));
    }
    return filtered;
  }, [assignments, selectedTaskType, searchName]);

  const clearFilters = () => {
    setSelectedTaskType("_all");
    setSearchName("");
  };

  return {
    selectedTaskType, setSelectedTaskType,
    searchName, setSearchName,
    availableTaskTypes,
    filteredAssignments,
    clearFilters,
  };
}

/* ─── Calendar Days Builder ─────────────────────────────────────── */

export function useCalendarDays(
  viewYear: number,
  viewMonth: number,
  viewDay: number,
  viewMode: ViewMode,
  filteredAssignments: AssignmentResponse[],
  groups: GroupResponse[] | undefined,
): CalendarDay[] {
  return useMemo(() => {
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
      // Use toUtcDateStr to avoid timezone shift (e.g. UTC-5 Colombia)
      const dateKey = toUtcDateStr(a.date);
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      const group = groups.find((g) => g.id === a.groupId);
      dateMap.get(dateKey)!.push({
        id: a.id, taskName: a.taskName ?? "",
        employeeName: a.employee?.name ?? "",
        employeeId: a.employeeId,
        groupName: group?.name ?? "", groupId: a.groupId,
        isLocked: a.isLocked, groupColor: group?.color ?? "#6b7280",
      });
    }

    for (const day of days) {
      const key = toLocalDateStr(day.date);
      day.assignments = dateMap.get(key) ?? [];
    }
    return days;
  }, [viewYear, viewMonth, viewDay, viewMode, filteredAssignments, groups]);
}

/* ─── Date Range Calculator ─────────────────────────────────────── */

export function useCalendarDateRange(
  viewYear: number,
  viewMonth: number,
  viewDay: number,
  viewMode: ViewMode,
) {
  return useMemo(() => {
    if (viewMode === "month") {
      const start = new Date(viewYear, viewMonth - 1, 1);
      const end = new Date(viewYear, viewMonth + 2, 0);
      return { startDate: toLocalDateStr(start), endDate: toLocalDateStr(end) };
    }
    if (viewMode === "week") {
      const weekDays = getWeekDays(viewYear, viewMonth, viewDay);
      return { startDate: toLocalDateStr(weekDays[0].date), endDate: toLocalDateStr(weekDays[6].date) };
    }
    const d = new Date(viewYear, viewMonth, viewDay);
    return { startDate: toLocalDateStr(d), endDate: toLocalDateStr(d) };
  }, [viewYear, viewMonth, viewDay, viewMode]);
}
