import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { resetDb } from "@/lib/data/mock/db";
import { settingsRepo } from "@/lib/data/mock/misc";
import { useSession } from "@/lib/auth/session";
import { renderWithProviders } from "@/test/renderWithProviders";
import type { User } from "@/lib/data/types";
import { ProfilePage } from "./ProfilePage";
import { ContactDetailsForm } from "./ContactDetailsForm";

// Vitest loads .env, so without this the settings hooks would use the live
// Supabase repo. Pin settings to the mock (localStorage) repo for these tests.
vi.mock("@/lib/data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data")>();
  const { settingsRepo } = await import("@/lib/data/mock/misc");
  return { ...actual, settingsRepo };
});

// Proves /settings → Profile Settings: the page a user manages their own account
// from (was the global cost-config Settings page).

const mockUser = {
  id: "u-test",
  name: "Test User",
  email: "test@bookends.app",
  phone: null,
  avatar_url: null,
  role: "super_admin",
  status: "active",
  last_login: null,
  created_at: "2026-01-01T00:00:00.000Z",
} as unknown as User;

describe("ProfilePage — is the Profile Settings screen", () => {
  beforeEach(() => {
    resetDb();
    useSession.setState({ user: mockUser });
  });

  it("shows the Profile Settings heading and the account fields", async () => {
    renderWithProviders(<ProfilePage />);

    expect(await screen.findByText("Profile Settings")).toBeInTheDocument();
    expect(screen.getByText("Full Name")).toBeInTheDocument();
    expect(screen.getAllByText("test@bookends.app").length).toBeGreaterThanOrEqual(1);
    // Password management lives here too.
    expect(screen.getByText("Password")).toBeInTheDocument();
    // It is NOT the old global cost-config page.
    expect(screen.queryByText(/Food Cost Configuration/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Margin Alert/i)).not.toBeInTheDocument();
  });
});

describe("ProfilePage — Contact Page tab (Super Admin only)", () => {
  beforeEach(() => {
    resetDb();
  });

  it("shows the Contact Page tab to a Super Admin", async () => {
    useSession.setState({ user: mockUser });
    renderWithProviders(<ProfilePage />);
    expect(await screen.findByRole("tab", { name: "Contact Page" })).toBeInTheDocument();
  });

  it("hides the Contact Page tab from an Admin", async () => {
    useSession.setState({ user: { ...mockUser, role: "admin" } as User });
    renderWithProviders(<ProfilePage />);
    expect(await screen.findByRole("tab", { name: "Password" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Contact Page" })).not.toBeInTheDocument();
  });

  // Renders the tab's form directly: switching tabs writes ?tab= to the URL, and
  // data-router navigation doesn't work under jsdom (AbortSignal mismatch).
  it("saves the contact details to system settings", async () => {
    useSession.setState({ user: mockUser });
    const user = userEvent.setup();
    renderWithProviders(<ContactDetailsForm />);

    const email = await screen.findByLabelText("Email");
    await user.clear(email);
    await user.type(email, "hello@bookends.in");
    await user.clear(screen.getByLabelText("Phone"));
    await user.click(screen.getByRole("button", { name: "Save details" }));

    await waitFor(async () => {
      const saved = JSON.parse((await settingsRepo.get("contact_details")) ?? "{}");
      expect(saved.email).toBe("hello@bookends.in");
      expect(saved.phone).toBe("");
    });
  });
});
