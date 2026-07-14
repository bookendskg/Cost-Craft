/**
 * Full-screen branded splash on the app's dark brand background. Shown while the
 * initial auth check resolves (installed/standalone app), then the root routes to
 * login or dashboard. The background matches the logo art + manifest background so
 * it blends seamlessly with the native cold-launch splash.
 */
export function Splash() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ backgroundColor: "#010c12" }}
    >
      <img
        src="/brand/costcraft-logo.png"
        alt="CostCraft"
        className="w-[380px] max-w-[82vw] animate-pulse"
        style={{ animationDuration: "1.9s" }}
      />
    </div>
  );
}
