// Client-side permission layer mirroring the PRD §7.2 matrix, §7.3 viewer
// sub-types, and §14.2 view-mode data visibility. This maps 1:1 to the
// Postgres RLS policies (PRD §9.3) authored in db/migrations — when Supabase
// is added these checks are backed by RLS, not replaced.

import {
  type OutletRecord,
  type Recipe,
  type Role,
  type User,
  type ViewType,
} from "../data/types";

export type Capability =
  // user management
  | "user.manage"
  // raw materials
  | "material.view"
  | "material.edit"
  // yield management (R&D)
  | "yield.manage"
  // operational wastage
  | "wastage.create"
  // recipes
  | "recipe.create"
  | "recipe.editAll"
  | "recipe.delete"
  | "recipe.duplicate"
  | "recipe.submit"
  // approval
  | "recipe.approve"
  // viewing
  | "recipe.viewAll"
  // viewer access management
  | "viewer.assign"
  // settings
  | "settings.manage"
  // reports
  | "report.excel"
  | "audit.view"
  // role & permission management (Super Admin only)
  | "role.manage"
  // brand & outlet management (Super Admin only)
  | "brand.create"
  | "brand.edit"
  | "brand.archive"
  | "outlet.create"
  | "outlet.edit"
  | "outlet.change_brand"
  | "outlet.archive";

const MATRIX: Record<Role, Capability[]> = {
  // Super Admin: everything, plus exclusive role/permission management.
  super_admin: [
    "user.manage",
    "material.view",
    "material.edit",
    "yield.manage",
    "wastage.create",
    "recipe.create",
    "recipe.editAll",
    "recipe.delete",
    "recipe.duplicate",
    "recipe.submit",
    "recipe.approve",
    "recipe.viewAll",
    "viewer.assign",
    "settings.manage",
    "report.excel",
    "audit.view",
    "role.manage",
    "brand.create",
    "brand.edit",
    "brand.archive",
    "outlet.create",
    "outlet.edit",
    "outlet.change_brand",
    "outlet.archive",
  ],
  admin: [
    "user.manage",
    "material.view",
    "material.edit",
    "yield.manage",
    "wastage.create",
    "recipe.create",
    "recipe.editAll",
    "recipe.delete",
    "recipe.duplicate",
    "recipe.submit",
    "recipe.approve",
    "recipe.viewAll",
    "viewer.assign",
    "settings.manage",
    "report.excel",
    "audit.view",
  ],
  // Editor: manages recipes, raw materials, pricing, yield, wastage; imports data.
  editor: [
    "material.view",
    "material.edit",
    "yield.manage",
    "wastage.create",
    "recipe.create",
    "recipe.editAll",
    "recipe.duplicate",
    "recipe.submit",
    "recipe.viewAll",
    "viewer.assign",
    "report.excel",
  ],
  // Head Chef: edits + sees everything, records wastage, and can grant chefs/viewers
  // recipe-view access — but does not change ingredient prices (admin/editor only).
  head_chef: [
    "material.view",
    "yield.manage",
    "wastage.create",
    "recipe.create",
    "recipe.editAll",
    "recipe.duplicate",
    "recipe.submit",
    "recipe.viewAll",
    "viewer.assign",
    "report.excel",
  ],
  // Chef: read-only, same as a Viewer.
  chef: [],
  viewer: [],
};

export function can(role: Role | undefined, cap: Capability): boolean {
  if (!role) return false;
  if (role === "super_admin") return true; // Super Admin can do anything.
  return MATRIX[role].includes(cap);
}

/** The protected top-level role. Only a Super Admin manages roles/permissions. */
export function isSuperAdmin(role: Role | undefined): boolean {
  return role === "super_admin";
}

/** Every capability in the system (the Super Admin set, which is the superset). */
export const ALL_CAPABILITIES: Capability[] = MATRIX.super_admin;

/** The capabilities a role currently holds (for the Roles & Permissions view). */
export function roleCapabilities(role: Role): Capability[] {
  return MATRIX[role];
}

/** Human labels for capability keys (Roles & Permissions matrix). */
export const CAPABILITY_LABELS: Record<Capability, string> = {
  "user.manage": "Manage users",
  "material.view": "View raw materials",
  "material.edit": "Edit raw materials / prices",
  "yield.manage": "Manage yields",
  "wastage.create": "Record wastage",
  "recipe.create": "Create recipes",
  "recipe.editAll": "Edit any recipe",
  "recipe.delete": "Delete recipes",
  "recipe.duplicate": "Duplicate recipes",
  "recipe.submit": "Submit for approval",
  "recipe.approve": "Approve / reject recipes",
  "recipe.viewAll": "View all recipes",
  "viewer.assign": "Grant viewer access",
  "settings.manage": "Manage settings",
  "report.excel": "Export reports",
  "audit.view": "View audit / price changes",
  "role.manage": "Manage roles & permissions",
  "brand.create": "Create brands",
  "brand.edit": "Edit brands",
  "brand.archive": "Archive brands",
  "outlet.create": "Create outlets",
  "outlet.edit": "Edit outlets",
  "outlet.change_brand": "Move outlet to another brand",
  "outlet.archive": "Archive outlets",
};

/** Roles that are read-only (treated like a Viewer everywhere). */
export function isReadOnlyRole(role: Role | undefined): boolean {
  return role === "viewer" || role === "chef";
}

/** Can this user edit this specific recipe? Admin/Editor/Head Chef, else the creator. */
export function canEditRecipe(user: User | null, recipe: Recipe): boolean {
  if (!user) return false;
  if (user.role === "super_admin" || user.role === "admin" || user.role === "editor" || user.role === "head_chef") return true;
  return recipe.created_by === user.id;
}

// --- Viewer view-mode visibility (PRD §14.2) ------------------------------
export interface ViewVisibility {
  ingredients: boolean;
  process: boolean;
  quantities: boolean;
  unitCosts: boolean;
  totalCost: boolean;
  costPerPortion: boolean;
  sellingPrice: boolean;
  grossProfit: boolean;
}

const CAPICHE: ViewVisibility = {
  ingredients: true,
  process: true,
  quantities: true,
  unitCosts: false,
  totalCost: false,
  costPerPortion: false,
  sellingPrice: false,
  grossProfit: false,
};

const AIKO: ViewVisibility = {
  ingredients: true,
  process: true,
  quantities: true,
  unitCosts: true,
  totalCost: true,
  costPerPortion: true,
  sellingPrice: true,
  grossProfit: true,
};

/**
 * Visibility for a given audience. Admin/editor see everything; viewers see
 * according to their assigned view_type for the recipe.
 */
export function visibilityFor(
  role: Role,
  viewType: ViewType | null,
): ViewVisibility {
  // Admin/Editor/Head Chef see full costing; Viewer + Chef are restricted.
  if (!isReadOnlyRole(role)) return AIKO;
  if (viewType === "capiche") return CAPICHE;
  if (viewType === "aiko") return AIKO;
  return CAPICHE; // safest default for an unassigned viewer
}

/**
 * Brands a viewer can see. Default (unset) is EVERYTHING — a viewer gets full
 * access until an editor/admin restricts them to specific brands.
 */
export function viewerBrands(user: User | null, allBrandIds: string[]): string[] {
  return userBrands(user, allBrandIds);
}

/** Viewers see costs by default; an editor/admin can turn this off. */
export function viewerShowCost(user: User | null): boolean {
  return user?.show_cost ?? true;
}

/** A viewer/chef can see a recipe if it's approved and in one of their brands. */
export function viewerCanAccess(user: User | null, recipe: Recipe, allBrandIds: string[]): boolean {
  if (!user || !isReadOnlyRole(user.role)) return false;
  return recipe.status === "approved" && viewerBrands(user, allBrandIds).includes(recipe.brand);
}

/** Visibility for any user: staff roles see all; viewer/chef per their show_cost grant. */
export function visibilityForUser(user: User): ViewVisibility {
  if (!isReadOnlyRole(user.role)) return visibilityFor(user.role, null);
  return visibilityFor("viewer", viewerShowCost(user) ? "aiko" : "capiche");
}

/**
 * Whether the user sees the Master Costing dashboard (food/packaging/selling/FC%
 * stats). Admins always do; any other role only when an admin grants
 * `dashboard_access`. Everyone else gets the plain overview dashboard.
 */
export function canViewMasterDashboard(user: User | null): boolean {
  if (!user) return false;
  return user.role === "super_admin" || user.role === "admin" || user.dashboard_access === true;
}

/**
 * A self sign-up that an admin hasn't verified yet. Such users are authenticated
 * but blocked from the app (shown the pending-approval screen). Admins are never
 * pending. A missing `approved` value means approved (legacy/seed users).
 */
export function isPendingApproval(user: User | null): boolean {
  if (!user) return false;
  return user.approved === false && user.role !== "admin" && user.role !== "super_admin";
}

// --- Brand / outlet scope ------------------------------------------------
// Admin / Editor / Head Chef operate across everything; Viewer + Chef follow their
// accessible_brands grant.

/** Brands a user may act within (for scoping selectors + data). */
export function userBrands(user: User | null, allBrandIds: string[]): string[] {
  if (!user) return [];
  if (user.role === "super_admin") return allBrandIds; // §13 full access, ignores scope
  switch (user.brand_scope) {
    case "ALL_BRANDS":
      return allBrandIds;
    case "SELECTED_BRANDS":
      return user.selected_brand_ids ?? [];
    case "ASSIGNED_BRAND":
      return user.assigned_brand ? [user.assigned_brand] : [];
  }
  // No explicit scope → legacy behaviour.
  if (isReadOnlyRole(user.role)) return user.accessible_brands ?? allBrandIds;
  return allBrandIds; // admin, editor, head_chef see every brand
}

/** Outlets a user may see (all for staff roles; brand-scoped for viewer/chef).
 *  Not status-filtered, so historical records for inactive/archived outlets stay
 *  visible — new-entry selectors filter to active themselves. Callers pass the
 *  live outlet list (loaded from the brands/outlets repo). */
export function accessibleOutlets(
  user: User | null,
  outlets: OutletRecord[],
  allBrandIds: string[],
): OutletRecord[] {
  if (!user) return [];
  if (user.role === "super_admin") return outlets; // §13 full access, ignores scope
  const brands = userBrands(user, allBrandIds);
  switch (user.outlet_scope) {
    case "NO_OUTLET_ACCESS":
      return [];
    case "ALL_OUTLETS":
      return outlets;
    case "ALL_OUTLETS_IN_BRAND":
      return outlets.filter((o) => brands.includes(o.brand_id));
    case "SELECTED_OUTLETS": {
      const ids = new Set(user.selected_outlet_ids ?? []);
      return outlets.filter((o) => ids.has(o.id));
    }
    case "ASSIGNED_OUTLET":
      return outlets.filter((o) => o.id === user.assigned_outlet);
  }
  // No explicit scope → legacy: staff see all; viewer/chef are brand-scoped.
  if (!isReadOnlyRole(user.role)) return outlets;
  return outlets.filter((o) => brands.includes(o.brand_id));
}

export function canAccessOutlet(
  user: User | null,
  outletId: string,
  outlets: OutletRecord[],
  allBrandIds: string[],
): boolean {
  return accessibleOutlets(user, outlets, allBrandIds).some((o) => o.id === outletId);
}

export function canAccessBrand(user: User | null, brand: string, allBrandIds: string[]): boolean {
  return userBrands(user, allBrandIds).includes(brand);
}

export const HOME_BY_ROLE: Record<Role, string> = {
  super_admin: "/dashboard",
  admin: "/dashboard",
  editor: "/dashboard",
  head_chef: "/dashboard",
  chef: "/dashboard",
  viewer: "/dashboard",
};
