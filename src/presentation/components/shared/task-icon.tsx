"use client";

import {
  Trash2,
  Coffee,
  Sparkles,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

// ─── Task Icon Configuration ──────────────────────────────────
// Detailed, styled icons instead of simple emojis
// Each task gets its own Lucide icon with custom color scheme

interface TaskIconConfig {
  icon: LucideIcon;
  color: string;       // main color
  bgClass: string;     // background class for the container
  borderClass: string; // border color class
}

const TASK_ICON_MAP: Record<string, TaskIconConfig> = {
  "Sacar Basura": {
    icon: Trash2,
    color: "#ea580c",
    bgClass: "bg-orange-50 dark:bg-orange-950/30",
    borderClass: "border-orange-200 dark:border-orange-800",
  },
  "Lavar Cafetera": {
    icon: Coffee,
    color: "#0d9488",
    bgClass: "bg-teal-50 dark:bg-teal-950/30",
    borderClass: "border-teal-200 dark:border-teal-800",
  },
  "Aseo General": {
    icon: Sparkles,
    color: "#16a34a",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
    borderClass: "border-emerald-200 dark:border-emerald-800",
  },
};

const DEFAULT_CONFIG: TaskIconConfig = {
  icon: ClipboardList,
  color: "#6b7280",
  bgClass: "bg-gray-50 dark:bg-gray-900/30",
  borderClass: "border-gray-200 dark:border-gray-700",
};

export function getTaskIconConfig(taskType: string): TaskIconConfig {
  return TASK_ICON_MAP[taskType] ?? DEFAULT_CONFIG;
}

export function getTaskColor(taskType: string): string {
  return (TASK_ICON_MAP[taskType] ?? DEFAULT_CONFIG).color;
}

// ─── TaskIcon Component ───────────────────────────────────────
// A beautifully styled icon for a task type
// Supports multiple sizes and styles

interface TaskIconProps {
  taskType: string;
  size?: "xs" | "sm" | "md" | "lg";
  showBg?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: { container: "w-5 h-5 rounded", icon: "h-2.5 w-2.5" },
  sm: { container: "w-6 h-6 rounded-md", icon: "h-3.5 w-3.5" },
  md: { container: "w-8 h-8 rounded-lg", icon: "h-4.5 w-4.5" },
  lg: { container: "w-10 h-10 rounded-xl", icon: "h-5 w-5" },
};

export function TaskIcon({ taskType, size = "md", showBg = true, className }: TaskIconProps) {
  const config = getTaskIconConfig(taskType);
  const Icon = config.icon;
  const dims = SIZE_MAP[size];

  if (!showBg) {
    return <Icon className={dims.icon} style={{ color: config.color }} />;
  }

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 border ${config.bgClass} ${config.borderClass} ${dims.container} ${className ?? ""}`}
    >
      <Icon className={dims.icon} style={{ color: config.color }} />
    </div>
  );
}

// ─── TaskBadge Component ──────────────────────────────────────
// Compact inline badge with icon + label

interface TaskBadgeProps {
  taskType: string;
  className?: string;
}

export function TaskBadge({ taskType, className }: TaskBadgeProps) {
  const config = getTaskIconConfig(taskType);
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.bgClass} ${config.borderClass} ${className ?? ""}`}
      style={{ color: config.color }}
    >
      <Icon className="h-3 w-3" />
      {taskType}
    </span>
  );
}
