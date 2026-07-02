import {
  LayoutDashboard,
  Beef,
  BookOpen,
  CheckCircle2,
  FileBarChart,
  Users,
  Settings,
  ScrollText,
  ChefHat,
  Eye,
  Sprout,
  Trash2,
  FileClock,
  Link2,
  ShieldCheck,
  Store,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/data/types";
import { can, type Capability } from "@/lib/auth/permissions";

/** Sidebar section a nav item belongs to (rendered as a labelled group). */
export type NavGroup = "Overview" | "Catalog" | "Operations" | "Admin";

export const NAV_GROUP_ORDER: NavGroup[] = ["Overview", "Catalog", "Operations", "Admin"];

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Built-in roles that always see this item (kept for stable built-in behaviour). */
  roles: Role[];
  /** Item is also shown to any role (incl. custom roles) holding this capability. */
  cap?: Capability;
  /** Item is shown to every authenticated user (e.g. the dashboard). */
  always?: boolean;
  group: NavGroup;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview", roles: ["admin", "editor", "head_chef", "chef", "viewer"], always: true },
  { to: "/materials", label: "Raw Materials", icon: Beef, group: "Catalog", roles: ["admin", "editor", "head_chef"], cap: "material.view" },
  { to: "/recipes", label: "Recipes", icon: BookOpen, group: "Catalog", roles: ["admin", "editor", "head_chef", "chef", "viewer"], cap: "recipe.viewAll" },
  { to: "/prep", label: "In-House Prep", icon: ChefHat, group: "Catalog", roles: ["admin", "editor", "head_chef"], cap: "recipe.editAll" },
  { to: "/yield", label: "Yield Management", icon: Sprout, group: "Catalog", roles: ["admin", "editor", "head_chef"], cap: "yield.manage" },
  { to: "/wastage", label: "Wastage Management", icon: Trash2, group: "Operations", roles: ["admin", "editor", "head_chef"], cap: "wastage.create" },
  { to: "/approvals", label: "Approvals", icon: CheckCircle2, group: "Operations", roles: ["admin"], cap: "recipe.approve" },
  { to: "/reports", label: "Reports", icon: FileBarChart, group: "Operations", roles: ["admin", "editor", "head_chef"], cap: "report.excel" },
  { to: "/viewer-access", label: "Viewer Access", icon: Eye, group: "Operations", roles: ["admin", "editor", "head_chef"], cap: "viewer.assign" },
  { to: "/users", label: "User Management", icon: Users, group: "Admin", roles: ["admin"], cap: "user.manage" },
  { to: "/audit", label: "Price Changes", icon: ScrollText, group: "Admin", roles: ["admin"], cap: "audit.view" },
  { to: "/exports", label: "Export History", icon: FileClock, group: "Admin", roles: ["admin"], cap: "audit.view" },
  { to: "/access", label: "Access History", icon: Link2, group: "Admin", roles: ["admin"], cap: "audit.view" },
  { to: "/settings", label: "Settings", icon: Settings, group: "Admin", roles: ["admin"], cap: "settings.manage" },
  // Super-Admin-only. navForRole shows all items to super_admin, and role.manage /
  // brand.create are reserved capabilities (never granted to a custom role), so
  // these stay hidden from regular Admins and custom roles alike.
  { to: "/roles", label: "Roles & Permissions", icon: ShieldCheck, group: "Admin", roles: ["super_admin"], cap: "role.manage" },
  { to: "/brands", label: "Brands & Outlets", icon: Store, group: "Admin", roles: ["super_admin"], cap: "brand.create" },
];

export function navForRole(role: Role): NavItem[] {
  // Super Admin sees every section (it sits above Admin).
  if (role === "super_admin") return NAV_ITEMS;
  return NAV_ITEMS.filter(
    (item) => item.always || item.roles.includes(role) || (item.cap ? can(role, item.cap) : false),
  );
}

/** Nav items for a role, bucketed into their groups in display order. */
export function navGroupsForRole(role: Role): { group: NavGroup; items: NavItem[] }[] {
  const items = navForRole(role);
  return NAV_GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((i) => i.group === group),
  })).filter((g) => g.items.length > 0);
}
