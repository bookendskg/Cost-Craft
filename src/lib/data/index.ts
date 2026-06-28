// Active repository set. Mock (localStorage) by default; the USERS repo switches
// to Supabase (db/migrations/0007 user_profiles + RLS) whenever Supabase is
// configured — auth and users live together on Supabase. Other repos remain mock
// for now (Phases 2–3). No feature code imports the mock/supabase modules directly.

import { isSupabaseConfigured } from "@/lib/supabase/client";
import { usersRepo as mockUsersRepo } from "./mock/users";
import { supabaseUsersRepo } from "./supabase/users";

export { authenticate } from "./mock/users";
export type { CreateUserInput, UpdateUserInput } from "./mock/users";

export const usersRepo = isSupabaseConfigured ? supabaseUsersRepo : mockUsersRepo;

export { materialsRepo } from "./mock/materials";
export type { MaterialInput } from "./mock/materials";

export { yieldsRepo } from "./mock/yields";
export type { YieldInput, ImportYieldRow } from "./mock/yields";

export { wastageRepo, applicableUnitCost } from "./mock/wastage";
export type { WastageInput } from "./mock/wastage";

export { recipesRepo } from "./mock/recipes";
export type {
  RecipeHeaderInput,
  RecipeLineInput,
  ImportRecipeLine,
} from "./mock/recipes";

export { viewsRepo, settingsRepo, auditRepo } from "./mock/misc";
export type { AuditFilter } from "./mock/misc";

export { resetDb } from "./mock/db";
export * from "./types";
