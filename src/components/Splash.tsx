/**
 * Full-screen branded splash on the app's dark brand background. Shown while the
 * initial auth check resolves (installed/standalone app), then the root routes to
 * login or dashboard. Colours match the manifest background so it blends with the
 * native splash on a cold launch.
 */
export function Splash() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 px-6"
      style={{ backgroundColor: "#0b1622" }}
    >
      <img
        src="/brand/mark.svg"
        alt=""
        className="w-[300px] max-w-[72vw] animate-pulse"
        style={{ animationDuration: "1.8s" }}
      />
      <div className="text-center">
        <p className="text-2xl font-semibold tracking-[0.28em]">
          <span className="text-white">COST</span>
          <span style={{ color: "#2bb6c4" }}>CRAFT</span>
        </p>
        <p className="mt-2 text-[11px] tracking-wide" style={{ color: "#8fae5b" }}>
          By Bookends Hospitality
        </p>
      </div>
    </div>
  );
}
