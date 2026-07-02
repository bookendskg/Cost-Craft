import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Centered section heading with an eyebrow label + supporting copy. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl text-left", className)}>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>}
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      {description && <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  );
}

/** Feature / module card with an icon tile, gentle hover lift. */
export function FeatureCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: ComponentType<LucideProps>;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      {children && <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</div>}
    </div>
  );
}

/** Brand card — Bookends / Capiche / Aiko, tinted with the brand's accent. */
export function BrandBadge({
  name,
  tone,
  tagline,
  points,
}: {
  name: string;
  tone: "bookends" | "capiche" | "aiko";
  tagline: string;
  points: string[];
}) {
  const styles = {
    bookends: { ring: "ring-[#1b35a8]/20", dot: "bg-[#1b35a8]", text: "text-[#1b35a8]", tint: "bg-[#eff6ff]" },
    capiche: { ring: "ring-[#ed1c24]/20", dot: "bg-[#ed1c24]", text: "text-[#ed1c24]", tint: "bg-[#fef2f2]" },
    aiko: { ring: "ring-amber-500/25", dot: "bg-[#f5c107]", text: "text-amber-600", tint: "bg-[#fffbeb]" },
  }[tone];

  return (
    <div className={cn("rounded-xl border p-6 ring-1", styles.ring, styles.tint)}>
      <div className="flex items-center gap-2.5">
        <span className={cn("h-3 w-3 rounded-full", styles.dot)} />
        <h3 className={cn("text-lg font-semibold", styles.text)}>{name}</h3>
      </div>
      <p className="mt-2 text-sm font-medium italic text-foreground/70">“{tagline}”</p>
      <ul className="mt-4 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-foreground/80">
            <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", styles.dot)} />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Full-width final call-to-action band. Login action → /login (§19). */
export function CTASection() {
  return (
    <section className="bg-[#152c8f]">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Ready to Access CostCraft?</h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-white/70">
          Authorized Bookends Hospitality users can sign in to continue.
        </p>
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" className="bg-white text-[#152c8f] hover:bg-white/90">
            <Link to="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
