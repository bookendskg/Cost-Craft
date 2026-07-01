import { describe, it, expect } from "vitest";
import { userBrands, viewerBrands, accessibleOutlets, canAccessOutlet } from "./permissions";
import type { OutletRecord, User } from "../data/types";

const ALL = ["capiche", "aiko", "nomad"];

const OUTLETS = [
  { id: "o1", brand_id: "capiche", status: "active" },
  { id: "o2", brand_id: "aiko", status: "active" },
  { id: "o3", brand_id: "nomad", status: "active" },
  { id: "o4", brand_id: "capiche", status: "archived" },
] as OutletRecord[];

const u = (p: Partial<User>): User => ({
  id: "x",
  name: "x",
  email: "x@x.com",
  role: "editor",
  status: "active",
  created_at: "",
  updated_at: "",
  ...p,
});

describe("brand scope resolution", () => {
  it("staff see every brand; unrestricted viewers too", () => {
    expect(userBrands(u({ role: "editor" }), ALL)).toEqual(ALL);
    expect(userBrands(u({ role: "viewer" }), ALL)).toEqual(ALL);
  });

  it("legacy viewer accessible_brands restricts", () => {
    expect(userBrands(u({ role: "viewer", accessible_brands: ["capiche"] }), ALL)).toEqual(["capiche"]);
    expect(viewerBrands(u({ role: "viewer", accessible_brands: ["aiko"] }), ALL)).toEqual(["aiko"]);
  });

  it("honours explicit brand scopes", () => {
    expect(userBrands(u({ brand_scope: "ALL_BRANDS" }), ALL)).toEqual(ALL);
    expect(userBrands(u({ brand_scope: "SELECTED_BRANDS", selected_brand_ids: ["aiko"] }), ALL)).toEqual(["aiko"]);
    expect(userBrands(u({ brand_scope: "ASSIGNED_BRAND", assigned_brand: "nomad" }), ALL)).toEqual(["nomad"]);
  });

  it("super admin ignores any restricting scope", () => {
    expect(
      userBrands(u({ role: "super_admin", brand_scope: "SELECTED_BRANDS", selected_brand_ids: ["capiche"] }), ALL),
    ).toEqual(ALL);
  });
});

describe("outlet scope resolution", () => {
  it("legacy: staff see all outlets; viewer is brand-scoped", () => {
    expect(accessibleOutlets(u({ role: "editor" }), OUTLETS, ALL).length).toBe(4);
    const v = accessibleOutlets(u({ role: "viewer", accessible_brands: ["capiche"] }), OUTLETS, ALL);
    expect(v.map((o) => o.id).sort()).toEqual(["o1", "o4"]);
  });

  it("honours explicit outlet scopes", () => {
    expect(accessibleOutlets(u({ outlet_scope: "NO_OUTLET_ACCESS" }), OUTLETS, ALL)).toEqual([]);
    expect(accessibleOutlets(u({ outlet_scope: "ALL_OUTLETS" }), OUTLETS, ALL).length).toBe(4);
    expect(
      accessibleOutlets(u({ outlet_scope: "SELECTED_OUTLETS", selected_outlet_ids: ["o2"] }), OUTLETS, ALL).map((o) => o.id),
    ).toEqual(["o2"]);
    expect(
      accessibleOutlets(u({ outlet_scope: "ASSIGNED_OUTLET", assigned_outlet: "o3" }), OUTLETS, ALL).map((o) => o.id),
    ).toEqual(["o3"]);
  });

  it("ALL_OUTLETS_IN_BRAND follows the user's brand scope (auto-includes future outlets)", () => {
    const user = u({ outlet_scope: "ALL_OUTLETS_IN_BRAND", brand_scope: "SELECTED_BRANDS", selected_brand_ids: ["aiko"] });
    expect(accessibleOutlets(user, OUTLETS, ALL).map((o) => o.id)).toEqual(["o2"]);
  });

  it("super admin ignores a restricting outlet scope", () => {
    expect(accessibleOutlets(u({ role: "super_admin", outlet_scope: "NO_OUTLET_ACCESS" }), OUTLETS, ALL).length).toBe(4);
  });

  it("canAccessOutlet respects the scope", () => {
    const viewer = u({ role: "viewer", accessible_brands: ["capiche"] });
    expect(canAccessOutlet(viewer, "o1", OUTLETS, ALL)).toBe(true);
    expect(canAccessOutlet(viewer, "o2", OUTLETS, ALL)).toBe(false);
  });
});
