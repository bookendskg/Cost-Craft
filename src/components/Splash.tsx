import { Loader2 } from "lucide-react";

/**
 * Boot screen shown (in the installed app) while the initial auth check resolves,
 * then the root routes to login/dashboard. Deliberately LOGO-LESS: the native TWA
 * splash already shows the CostCraft logo, so showing it again here would read as a
 * second logo / flicker. This is just the same dark brand background (so it blends
 * seamlessly with the native splash) plus a subtle spinner.
 */
export function Splash() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "#010c12" }}
    >
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#2bb6c4" }} />
    </div>
  );
}
