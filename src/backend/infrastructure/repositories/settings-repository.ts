// Settings Repository - Database access for app configuration
import { db } from "@/backend/infrastructure/database";

export const settingsRepository = {
  async get() {
    return db.settings.findUnique({ where: { id: "app" } });
  },

  async initialize(key: string = "farmatizate2025") {
    return db.settings.upsert({
      where: { id: "app" },
      update: {},
      create: { id: "app", key, value: key },
    });
  },

  async updateKey(newKey: string) {
    return db.settings.upsert({
      where: { id: "app" },
      update: { key: newKey, value: newKey },
      create: { id: "app", key: newKey, value: newKey },
    });
  },

  async validateKey(inputKey: string): Promise<boolean> {
    const settings = await db.settings.findUnique({ where: { id: "app" } });
    if (!settings) return false;
    return settings.key === inputKey;
  },
};
