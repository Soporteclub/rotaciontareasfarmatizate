"use client";

import { DAY_NAMES } from "@/backend/domain/entities/types";
import type { DayOfWeek } from "@/backend/domain/entities/types";
import { ALL_DAYS, DAY_ABBR } from "./rules-constants";

interface WeeklyStripProps {
  activeDays: DayOfWeek[];
  color: string;
}

export function WeeklyStrip({ activeDays, color }: WeeklyStripProps) {
  return (
    <div className="flex items-center gap-1">
      {ALL_DAYS.map((d) => {
        const isActive = activeDays.includes(d);
        const isWeekend = d === 0 || d === 6;
        return (
          <div
            key={d}
            className="flex flex-col items-center gap-0.5"
            title={DAY_NAMES[d as DayOfWeek]}
          >
            <span
              className={`text-[10px] font-medium ${
                isActive
                  ? ""
                  : isWeekend
                  ? "text-muted-foreground/40"
                  : "text-muted-foreground/60"
              }`}
            >
              {DAY_ABBR[d]}
            </span>
            <div
              className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-all ${
                isActive
                  ? "text-white shadow-sm"
                  : isWeekend
                  ? "bg-muted/30 text-muted-foreground/30"
                  : "bg-muted/50 text-muted-foreground/40"
              }`}
              style={
                isActive
                  ? { backgroundColor: color }
                  : undefined
              }
            >
              {isActive ? "✓" : "·"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
