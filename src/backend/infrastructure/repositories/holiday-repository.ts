// Holiday Repository - Database access layer for Holiday
// Manages Colombian public holidays (festivos)

import { db } from "@/backend/infrastructure/database";
import type { Prisma } from "@prisma/client";

export interface FindHolidaysOptions {
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

export const holidayRepository = {
  async findAll(options: FindHolidaysOptions = {}) {
    const where: Prisma.HolidayWhereInput = {};

    if (options.isActive !== undefined) where.isActive = options.isActive;

    if (options.startDate || options.endDate) {
      where.date = {};
      if (options.startDate) where.date.gte = options.startDate;
      if (options.endDate) where.date.lte = options.endDate;
    }

    return db.holiday.findMany({
      where,
      orderBy: { date: "asc" },
    });
  },

  async findById(id: string) {
    return db.holiday.findUnique({ where: { id } });
  },

    async findByDate(date: Date) {
    // FIX (BC-1/BC-2): UTC day boundaries so the window matches holiday
    // instants stored at 00:00:00.000Z regardless of server TZ. Previously
    // setHours() (LOCAL) shifted the window on non-UTC servers.
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return db.holiday.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        isActive: true,
      },
    });
  },

  async isHoliday(date: Date): Promise<boolean> {
    // FIX (BC-1/BC-2): same UTC-boundary fix as findByDate.
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const count = await db.holiday.count({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        isActive: true,
      },
    });

    return count > 0;
  },

  /**
   * Get all holiday dates within a range as a Set of "YYYY-MM-DD" strings
   * Used by the fairness engine for efficient lookup
   */
  async getHolidayDateSet(startDate: Date, endDate: Date): Promise<Set<string>> {
    const holidays = await db.holiday.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        isActive: true,
      },
      select: { date: true },
    });

    const set = new Set<string>();
    for (const h of holidays) {
      const d = new Date(h.date);
      // FIX (BUG-10): use UTC accessors so the holiday key matches the dateToKey
      // of the fairness-engine. Previously getFullYear/getMonth/getDate (LOCAL)
      // returned the previous day on a UTC-5 server for a holiday stored at
      // 2026-01-01T00:00:00Z, causing the holiday to be skipped.
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      set.add(key);
    }
    return set;
  },

  async create(data: Prisma.HolidayCreateInput) {
    return db.holiday.create({ data });
  },

  async createMany(holidays: Prisma.HolidayCreateManyInput[]) {
    return db.holiday.createMany({ data: holidays });
  },

  async update(id: string, data: Prisma.HolidayUpdateInput) {
    return db.holiday.update({ where: { id }, data });
  },

  async delete(id: string) {
    return db.holiday.delete({ where: { id } });
  },

  async deleteAll() {
    return db.holiday.deleteMany({});
  },

  async count() {
    return db.holiday.count();
  },
};
