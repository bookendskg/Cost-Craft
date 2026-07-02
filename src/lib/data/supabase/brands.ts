// Supabase brand master data repo — READ-ONLY. Brand management has been removed;
// brands are read for filtering/selectors/scopes only. The DB additionally rejects
// any write (0017 trigger), so the fixed brands can't be changed from the client.

import type { BrandRecord } from "../types";
import { fail, sb } from "./helpers";

export const supabaseBrandsRepo = {
  async list(): Promise<BrandRecord[]> {
    const { data, error } = await sb().from("brands").select("*").order("name");
    if (error) fail("Load brands", error.message);
    return (data ?? []) as BrandRecord[];
  },

  async getById(id: string): Promise<BrandRecord | null> {
    const { data, error } = await sb().from("brands").select("*").eq("id", id).maybeSingle();
    if (error) fail("Load brand", error.message);
    return (data as BrandRecord | null) ?? null;
  },
};
