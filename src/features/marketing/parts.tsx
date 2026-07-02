import { useState, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Renders the first candidate image that loads, else nothing (no broken-image
 * icon). Lets us reference official brand logos from /public that may not exist
 * yet — drop the files in and they appear; until then the text mark shows.
 */
function BrandLogo({
  candidates,
  alt,
  className,
  onResolve,
}: {
  candidates: string[];
  alt: string;
  className?: string;
  onResolve?: (ok: boolean) => void;
}) {
  const [i, setI] = useState(0);
  if (i >= candidates.length) return null;
  return (
    <img
      src={candidates[i]}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onLoad={() => onResolve?.(true)}
      onError={() => {
        const next = i + 1;
        if (next >= candidates.length) onResolve?.(false);
        setI(next);
      }}
    />
  );
}

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
  const [logoOk, setLogoOk] = useState<boolean | null>(null);

  return (
    <div className={cn("relative rounded-xl border p-6 ring-1", styles.ring, styles.tint)}>
      {/* Decorative brand icon mark (Capiche OK-hand / Aiko person), top-right. */}
      {(tone === "capiche" || tone === "aiko") && (
        <BrandLogo
          candidates={[`/brands/${tone}-icon.png`]}
          alt=""
          className="pointer-events-none absolute right-4 top-4 h-11 w-11 object-contain opacity-90"
        />
      )}
      {/* Official brand logo plate (from /public/brands). Falls back to a
          coloured dot + name if the image is ever missing. */}
      <h3 className="sr-only">{name}</h3>
      <BrandLogo
        candidates={[`/brands/${tone}.png`, `/brands/${tone}.svg`]}
        alt={`${name} logo`}
        className="h-12 w-auto max-w-[190px] rounded-lg object-contain shadow-sm ring-1 ring-black/5"
        onResolve={setLogoOk}
      />
      {logoOk === false && (
        <div className="flex items-center gap-2.5">
          <span className={cn("h-3 w-3 rounded-full", styles.dot)} />
          <span className={cn("text-lg font-semibold", styles.text)}>{name}</span>
        </div>
      )}
      <p className={cn("text-sm font-medium italic text-foreground/70", logoOk === false ? "mt-2" : "mt-4")}>
        “{tagline}”
      </p>
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
