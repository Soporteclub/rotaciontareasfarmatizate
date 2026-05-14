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
    <div className="flex items-center gap-0.5 sm:gap-1">
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
              className={`text-[9px] sm:text-[10px] font-semibold tracking-wide ${
                isActive
                  ? ""
                  : isWeekend
                  ? "text-muted-foreground/30"
                  : "text-muted-foreground/50"
              }`}
              style={isActive ? { color } : undefined}
            >
              {DAY_ABBR[d]}
            </span>
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all ${
                isActive
                  ? "text-white shadow-sm"
                  : isWeekend
                  ? "bg-muted/20 text-muted-foreground/20"
                  : "bg-muted/40 text-muted-foreground/30"
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
