// Settings Service - Business logic for application settings
// Manages admin key validation and settings configuration

import { db } from "@/backend/infrastructure/database";

export const settingsService = {
  async getSettings() {
    const settings = await db.settings.findUnique({
      where: { id: "app" },
    });
    return settings;
  },

  async validateKey(key: string): Promise<boolean> {
    const settings = await db.settings.findUnique({
      where: { id: "app" },
    });

    if (!settings) {
      return false;
    }

    return settings.key === key;
  },

  async updateKey(currentKey: string, newKey: string) {
    const settings = await db.settings.findUnique({
      where: { id: "app" },
    });

    if (!settings) {
      throw new Error("Configuración no encontrada");
    }

    if (settings.key !== currentKey) {
      throw new Error("Clave actual incorrecta");
    }

    if (!newKey || newKey.length < 4) {
      throw new Error("La nueva clave debe tener al menos 4 caracteres");
    }

    const updated = await db.settings.update({
      where: { id: "app" },
      data: { key: newKey, value: newKey },
    });

    return updated;
  },
};
