// Holiday Service - Business logic for Colombian public holidays (festivos)
// Manages holiday CRUD and seeding operations

import { holidayRepository } from "@/backend/infrastructure/repositories";
import { generateColombianHolidaysForRange } from "@/backend/domain/holidays/colombian-holidays";

export const holidayService = {
  /**
   * Get holidays with optional date range filter
   */
  async getAll(options?: { startDate?: Date; endDate?: Date }) {
    return holidayRepository.findAll({
      startDate: options?.startDate,
      endDate: options?.endDate,
      isActive: true,
    });
  },

  /**
   * Get a single holiday by ID
   */
  async getById(id: string) {
    const holiday = await holidayRepository.findById(id);
    if (!holiday) {
      throw new Error("Festivo no encontrado");
    }
    return holiday;
  },

  /**
   * Create a single holiday
   */
  async create(input: { date: string; name: string; type?: string; isRecurring?: boolean }) {
    const { date, name, type = "national", isRecurring = true } = input;

    if (!date || !name) {
      throw new Error("Fecha y nombre son requeridos");
    }

    return holidayRepository.create({
      date: new Date(date),
      name,
      type,
      isRecurring,
      isActive: true,
    });
  },

  /**
   * Update a holiday
   */
  async update(id: string, input: { name?: string; date?: string; type?: string; isActive?: boolean }) {
    const existing = await holidayRepository.findById(id);
    if (!existing) {
      throw new Error("Festivo no encontrado");
    }

    return holidayRepository.update(id, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.date !== undefined && { date: new Date(input.date) }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    });
  },

  /**
   * Delete a holiday
   */
  async delete(id: string) {
    const existing = await holidayRepository.findById(id);
    if (!existing) {
      throw new Error("Festivo no encontrado");
    }

    return holidayRepository.delete(id);
  },

  /**
   * Seed Colombian holidays for a range of years
   * Deletes existing holidays and re-creates them
   */
  async seedColombianHolidays(startYear: number = 2024, endYear: number = 2030) {
    const holidays = generateColombianHolidaysForRange(startYear, endYear);

    const data = holidays.map((h) => ({
      // FIX (F3): build the stored instant at UTC midnight from the holiday's
      // UTC date parts, matching how the Fairness Engine keys dates (dateToKey).
      // Previously local Date(y,m,d) drifted a day on non-UTC servers.
      date: new Date(Date.UTC(h.date.getUTCFullYear(), h.date.getUTCMonth(), h.date.getUTCDate())),
      name: h.name,
      type: h.type,
      isRecurring: h.type === "fixed",
      isActive: true,
    }));

    await holidayRepository.deleteAll();
    const result = await holidayRepository.createMany(data);

    return {
      message: `Seeded ${result.count} Colombian holidays (${startYear}-${endYear})`,
      count: result.count,
      years: endYear - startYear + 1,
    };
  },
};
