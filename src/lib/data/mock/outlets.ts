// Outlet master data — READ-ONLY. Outlet management (create/edit/delete/archive)
// has been removed; the six seeded outlets are fixed and never mutated from the
// app. Only reads remain, used for filtering, selectors and per-user outlet scope.

import type { OutletRecord } from "../types";
import { delay, getDb } from "./db";

export const outletsRepo = {
  async list(): Promise<OutletRecord[]> {
    return delay([...getDb().outlets].sort((a, b) => a.name.localeCompare(b.name)));
  },

  async getById(id: string): Promise<OutletRecord | null> {
    return delay(getDb().outlets.find((o) => o.id === id) ?? null);
  },

  async listByBrand(brandId: string): Promise<OutletRecord[]> {
    return delay(
      getDb()
        .outlets.filter((o) => o.brand_id === brandId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  },
};
