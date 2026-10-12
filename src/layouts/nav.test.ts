import { describe, it, expect } from "vitest";
import { navForRole } from "./nav";

// Brands & Outlets management is Super-Admin only.
describe("nav — Brands & Outlets gating", () => {
  const hasBrands = (role: string) => navForRole(role).some((i) => i.to === "/brands");

  it("is visible to super_admin", () => {
    expect(hasBrands("super_admin")).toBe(true);
  });

  it("is hidden from admin, editor, and viewer", () => {
    expect(hasBrands("admin")).toBe(false);
    expect(hasBrands("editor")).toBe(false);
    expect(hasBrands("viewer")).toBe(false);
  });
});

// Activity Log (the full who-did-what trail) is Super-Admin only — even for a
// custom role granted audit.view, which only unlocks the Price Changes page.
describe("nav — Activity Log gating", () => {
  const hasLog = (role: string) => navForRole(role).some((i) => i.to === "/activity-log");
  const hasPriceChanges = (role: string) => navForRole(role).some((i) => i.to === "/audit");

  it("is visible to super_admin only", () => {
    expect(hasLog("super_admin")).toBe(true);
    for (const role of ["admin", "editor", "head_chef", "chef", "viewer", "custom_auditor"]) {
      expect(hasLog(role), role).toBe(false);
    }
  });

  it("leaves the Price Changes page with Admins", () => {
    expect(hasPriceChanges("admin")).toBe(true);
    expect(hasPriceChanges("editor")).toBe(false);
  });
});
