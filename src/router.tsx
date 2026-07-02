import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { RequireAuth, RequireRole } from "@/features/auth/guards";
// Auth shell stays eager (small, first paint); everything else is code-split.
import { LoginPage } from "@/features/auth/LoginPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { SignUpPage } from "@/features/auth/SignUpPage";

// Code-split app pages — each becomes its own chunk, kept out of the initial bundle.
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const MaterialsPage = lazy(() => import("@/features/raw-materials/MaterialsPage").then((m) => ({ default: m.MaterialsPage })));
const RecipesPage = lazy(() => import("@/features/recipes/RecipesPage").then((m) => ({ default: m.RecipesPage })));
const YieldPage = lazy(() => import("@/features/yield/YieldPage").then((m) => ({ default: m.YieldPage })));
const WastagePage = lazy(() => import("@/features/wastage/WastagePage").then((m) => ({ default: m.WastagePage })));
const RecipeEditorPage = lazy(() => import("@/features/recipes/RecipeEditorPage").then((m) => ({ default: m.RecipeEditorPage })));
const RecipeDetailPage = lazy(() => import("@/features/recipes/RecipeDetailPage").then((m) => ({ default: m.RecipeDetailPage })));
const ApprovalsPage = lazy(() => import("@/features/approvals/ApprovalsPage").then((m) => ({ default: m.ApprovalsPage })));
const ReportsPage = lazy(() => import("@/features/reports/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const UsersPage = lazy(() => import("@/features/users/UsersPage").then((m) => ({ default: m.UsersPage })));
const ViewerAccessPage = lazy(() => import("@/features/viewers/ViewerAccessPage").then((m) => ({ default: m.ViewerAccessPage })));
const AuditPage = lazy(() => import("@/features/audit/AuditPage").then((m) => ({ default: m.AuditPage })));
const ExportHistoryPage = lazy(() => import("@/features/exports/ExportHistoryPage").then((m) => ({ default: m.ExportHistoryPage })));
const AccessHistoryPage = lazy(() => import("@/features/share/AccessHistoryPage").then((m) => ({ default: m.AccessHistoryPage })));
const RolesPage = lazy(() => import("@/features/roles/RolesPage").then((m) => ({ default: m.RolesPage })));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import("@/features/profile/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const SharedRecipePage = lazy(() => import("@/features/share/SharedRecipePage").then((m) => ({ default: m.SharedRecipePage })));
// Public marketing landing page (code-split; the app's public entry point at "/").
const LandingPage = lazy(() => import("@/features/marketing/LandingPage").then((m) => ({ default: m.LandingPage })));

/** Suspense wrapper for code-split PUBLIC routes (the app shell has its own). */
function PublicRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  // Public landing page — unauthenticated visitors to "/" see this.
  { path: "/", element: <PublicRoute><LandingPage /></PublicRoute> },
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignUpPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  // Public, read-only shared recipe — no auth guard, no app chrome.
  { path: "/share/:token", element: <SharedRecipePage /> },
  {
    // Pathless layout route — its children resolve to absolute paths
    // (/dashboard, /materials, …). "/" itself is the public landing page above.
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: "dashboard", element: <DashboardPage /> },
      { path: "profile", element: <ProfilePage /> },
      {
        path: "materials",
        element: (
          <RequireRole roles={["admin", "editor", "head_chef"]} cap="material.view">
            <MaterialsPage />
          </RequireRole>
        ),
      },
      { path: "recipes", element: <RecipesPage /> },
      {
        path: "yield",
        element: (
          <RequireRole roles={["admin", "editor", "head_chef"]} cap="yield.manage">
            <YieldPage />
          </RequireRole>
        ),
      },
      {
        path: "wastage",
        element: (
          <RequireRole roles={["admin", "editor", "head_chef"]} cap="wastage.create">
            <WastagePage />
          </RequireRole>
        ),
      },
      {
        path: "prep",
        element: (
          <RequireRole roles={["admin", "editor", "head_chef"]} cap="recipe.editAll">
            <RecipesPage prepMode />
          </RequireRole>
        ),
      },
      {
        path: "recipes/new",
        element: (
          <RequireRole roles={["admin", "editor", "head_chef"]} cap="recipe.editAll">
            <RecipeEditorPage />
          </RequireRole>
        ),
      },
      {
        path: "recipes/:id/edit",
        element: (
          <RequireRole roles={["admin", "editor", "head_chef"]} cap="recipe.editAll">
            <RecipeEditorPage />
          </RequireRole>
        ),
      },
      { path: "recipes/:id", element: <RecipeDetailPage /> },
      {
        path: "approvals",
        element: (
          <RequireRole roles={["admin"]} cap="recipe.approve">
            <ApprovalsPage />
          </RequireRole>
        ),
      },
      {
        path: "reports",
        element: (
          <RequireRole roles={["admin", "editor", "head_chef"]} cap="report.excel">
            <ReportsPage />
          </RequireRole>
        ),
      },
      {
        path: "viewer-access",
        element: (
          <RequireRole roles={["admin", "editor", "head_chef"]} cap="viewer.assign">
            <ViewerAccessPage />
          </RequireRole>
        ),
      },
      {
        path: "users",
        element: (
          <RequireRole roles={["admin"]} cap="user.manage">
            <UsersPage />
          </RequireRole>
        ),
      },
      {
        path: "audit",
        element: (
          <RequireRole roles={["admin"]} cap="audit.view">
            <AuditPage />
          </RequireRole>
        ),
      },
      {
        path: "exports",
        element: (
          <RequireRole roles={["admin"]} cap="audit.view">
            <ExportHistoryPage />
          </RequireRole>
        ),
      },
      {
        path: "access",
        element: (
          <RequireRole roles={["admin"]} cap="audit.view">
            <AccessHistoryPage />
          </RequireRole>
        ),
      },
      {
        path: "roles",
        element: (
          <RequireRole roles={["super_admin"]}>
            <RolesPage />
          </RequireRole>
        ),
      },
      // "Brands & Outlets" management has been removed. The old /brands route is
      // intentionally gone; the catch-all below redirects it to /dashboard.
      {
        path: "settings",
        element: (
          <RequireRole roles={["admin"]} cap="settings.manage">
            <SettingsPage />
          </RequireRole>
        ),
      },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
