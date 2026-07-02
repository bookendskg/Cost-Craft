import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Overview", href: "#overview" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Brands", href: "#brands" },
];

export function PublicHeader({ authed }: { authed: boolean }) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="CostCraft home" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo size="md" />
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button asChild>
            <Link to={authed ? "/dashboard" : "/login"}>{authed ? "Go to Dashboard" : "Login"}</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={cn("border-t bg-background md:hidden", open ? "block" : "hidden")}
      >
        <nav aria-label="Primary mobile" className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2.5 text-base font-medium text-foreground hover:bg-muted"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <Button asChild className="mt-3 w-full">
            <Link to={authed ? "/dashboard" : "/login"} onClick={() => setOpen(false)}>
              {authed ? "Go to Dashboard" : "Login"}
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
