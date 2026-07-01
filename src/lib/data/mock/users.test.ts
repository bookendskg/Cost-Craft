import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./db";
import { usersRepo } from "./users";

// The mock seed ships with moin (owner) as the single active super_admin.
const mkSuper = (i: number) =>
  usersRepo.create(
    { name: `S${i}`, email: `s${i}@x.com`, role: "super_admin", password: "password1" },
    "u-moin",
  );

describe("super admin count limits", () => {
  beforeEach(() => resetDb());

  it("allows up to 5 active super admins and rejects the 6th", async () => {
    // moin (1) + 4 created = 5 active supers.
    for (let i = 1; i <= 4; i++) await mkSuper(i);
    await expect(mkSuper(5)).rejects.toThrow(/maximum of 5/i);
  });

  it("exempts owner emails from the maximum", async () => {
    for (let i = 1; i <= 4; i++) await mkSuper(i); // 5 active supers
    const owner = await usersRepo.create(
      { name: "Owner2", email: "reservation.bookends@gmail.com", role: "super_admin", password: "password1" },
      "u-moin",
    );
    expect(owner.role).toBe("super_admin");
  });

  it("only a super admin can create a super admin", async () => {
    await expect(
      usersRepo.create({ name: "X", email: "x@x.com", role: "super_admin", password: "password1" }, "u-admin"),
    ).rejects.toThrow(/only a super admin/i);
  });

  it("blocks disabling the last active super admin (min 1)", async () => {
    await expect(usersRepo.update("u-moin", { status: "inactive" }, "u-moin")).rejects.toThrow(
      /at least one active super admin/i,
    );
  });

  it("allows disabling a super admin when another remains active", async () => {
    const s = await mkSuper(1); // now moin + s = 2 active supers
    const updated = await usersRepo.update(s.id, { status: "inactive" }, "u-moin");
    expect(updated.status).toBe("inactive");
  });

  it("blocks a plain admin from promoting anyone to super_admin", async () => {
    const v = await usersRepo.create(
      { name: "V", email: "v@x.com", role: "viewer", password: "password1" },
      "u-moin",
    );
    // actor u-admin is role 'admin', not super_admin → not allowed to mint a super.
    await expect(usersRepo.update(v.id, { role: "super_admin" }, "u-admin")).rejects.toThrow(
      /only a super admin/i,
    );
  });

  it("blocks a plain admin from demoting/disabling a super_admin", async () => {
    const s = await mkSuper(1);
    await expect(usersRepo.update(s.id, { status: "inactive" }, "u-admin")).rejects.toThrow(
      /only a super admin/i,
    );
  });

  it("blocks promoting a 6th active super admin via update", async () => {
    for (let i = 1; i <= 4; i++) await mkSuper(i); // 5 active supers
    const editor = await usersRepo.create(
      { name: "Ed", email: "ed@x.com", role: "editor", password: "password1" },
      "u-moin",
    );
    await expect(usersRepo.update(editor.id, { role: "super_admin" }, "u-moin")).rejects.toThrow(/maximum of 5/i);
  });
});
