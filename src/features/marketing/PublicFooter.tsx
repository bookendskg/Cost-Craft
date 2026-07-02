import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";

export function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row">
          <div className="max-w-xs">
            <Logo size="md" withSubtitle />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Recipe costing, yield and wastage management for Bookends Hospitality.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Brands</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#1b35a8]" /> Bookends Hospitality
                </li>
                <li className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#ed1c24]" /> Capiche
                </li>
                <li className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#f5c107]" /> Aiko
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Access</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a href="#features" className="text-muted-foreground hover:text-foreground">Features</a>
                </li>
                <li>
                  <a href="#how-it-works" className="text-muted-foreground hover:text-foreground">How It Works</a>
                </li>
                <li>
                  <Link to="/login" className="text-muted-foreground hover:text-foreground">Login</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-xs text-muted-foreground">
          © {year} CostCraft · Bookends Hospitality. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
