// Supabase outlet master data repo — READ-ONLY. Outlet management has been
// removed; outlets are read for filtering/selectors/scopes only. The DB also
// rejects any write (0017 trigger), so the fixed outlets can't be changed.

import type { OutletRecord } from "../types";
import { fail, sb } from "./helpers";

export const supabaseOutletsRepo = {
  async list(): Promise<OutletRecord[]> {
    const { data, error } = await sb().from("outlets").select("*").order("name");
    if (error) fail("Load outlets", error.message);
    return (data ?? []) as OutletRecord[];
  },

  async getById(id: string): Promise<OutletRecord | null> {
    const { data, error } = await sb().from("outlets").select("*").eq("id", id).maybeSingle();
    if (error) fail("Load outlet", error.message);
    return (data as OutletRecord | null) ?? null;
  },

  async listByBrand(brandId: string): Promise<OutletRecord[]> {
    const { data, error } = await sb().from("outlets").select("*").eq("brand_id", brandId).order("name");
    if (error) fail("Load outlets", error.message);
    return (data ?? []) as OutletRecord[];
  },
};
