// Active repository set. Mock (localStorage) by default; the USERS repo switches
// to Supabase (db/migrations/0007 user_profiles + RLS) when VITE_USERS_BACKEND=
// supabase and Supabase is configured. Other repos remain mock for now (Phase 1).
// No feature code imports the mock/supabase modules directly — only this barrel.

import { isSupabaseUsersBackend } from "@/lib/supabase/dataClient";
import {
  usersRepo as mockUsersRepo,
  linkFirebaseUser as mockLinkFirebaseUser,
} from "./mock/users";
import { supabaseUsersRepo, linkFirebaseUserSupabase } from "./supabase/users";

export { authenticate } from "./mock/users";
export type { CreateUserInput, UpdateUserInput } from "./mock/users";

export const usersRepo = isSupabaseUsersBackend ? supabaseUsersRepo : mockUsersRepo;
export const linkFirebaseUser = isSupabaseUsersBackend
  ? linkFirebaseUserSupabase
  : mockLinkFirebaseUser;

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
