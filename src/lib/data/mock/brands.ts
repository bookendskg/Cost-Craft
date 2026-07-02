// Brand master data — READ-ONLY. Brand management (create/edit/delete/archive)
// has been removed; the fixed Capiche/Aiko brands are seeded and never mutated
// from the app. Only reads remain, used for filtering, selectors and scopes.

import type { BrandRecord } from "../types";
import { delay, getDb } from "./db";

export const brandsRepo = {
  async list(): Promise<BrandRecord[]> {
    return delay([...getDb().brands].sort((a, b) => a.name.localeCompare(b.name)));
  },

  async getById(id: string): Promise<BrandRecord | null> {
    return delay(getDb().brands.find((b) => b.id === id) ?? null);
  },
};
