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

/** A uniform "chip" holding one official brand logo on a clean plate, so the three
 *  logos (different aspect ratios / source backgrounds) sit evenly together. */
function BrandLogoChip({ tone, alt, height = "h-6" }: { tone: string; alt: string; height?: string }) {
  return (
    <span className="inline-flex items-center rounded-lg border bg-white px-3 py-2 shadow-sm ring-1 ring-black/5">
      <BrandLogo candidates={[`/brands/${tone}.png`, `/brands/${tone}.svg`]} alt={alt} className={cn(height, "w-auto object-contain")} />
    </span>
  );
}

/** Official Bookends · Capiche · Aiko logo lockup, used in the hero and footer. */
export function BrandLogoStrip({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", className)}>
      {label && (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <BrandLogoChip tone="bookends" alt="Bookends Hospitality" />
        <BrandLogoChip tone="capiche" alt="Capiche" />
        <BrandLogoChip tone="aiko" alt="Aiko" />
      </div>
    </div>
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
      {eyebrow && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#1b35a8] to-[#ed1c24]" />
          <span className="text-gradient-brand">{eyebrow}</span>
        </span>
      )}
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      {align === "center" && (
        <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      )}
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
        "group card-glow rounded-2xl border bg-card p-6 shadow-sm ring-1 ring-black/[0.03] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
        className,
      )}
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-[#ed1c24]/10 text-primary shadow-sm ring-1 ring-primary/10 transition-transform duration-200 group-hover:scale-105">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-5 text-base font-semibold text-foreground">{title}</h3>
      {children && <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</div>}
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
    bookends: { ring: "ring-[#1b35a8]/20", dot: "bg-[#1b35a8]", text: "text-[#1b35a8]", tint: "bg-[#eff6ff]", bar: "from-[#1b35a8] to-[#4f46e5]" },
    capiche: { ring: "ring-[#ed1c24]/20", dot: "bg-[#ed1c24]", text: "text-[#ed1c24]", tint: "bg-[#fef2f2]", bar: "from-[#ed1c24] to-[#ff6a3d]" },
    aiko: { ring: "ring-amber-500/25", dot: "bg-[#f5c107]", text: "text-amber-600", tint: "bg-[#fffbeb]", bar: "from-[#f5c107] to-[#ffb020]" },
  }[tone];
  const [logoOk, setLogoOk] = useState<boolean | null>(null);

  return (
    <div className={cn("group relative overflow-hidden rounded-xl border p-6 ring-1 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg", styles.ring, styles.tint)}>
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", styles.bar)} />
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
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1b35a8] via-[#152c8f] to-[#0e1f6b]">
      {/* Futuristic overlay: faint white grid + soft brand glows. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mask-fade-b opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.10) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(255,255,255,0.10) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute -left-16 -top-10 h-64 w-64 rounded-full bg-[#4f46e5]/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-12 -right-10 h-56 w-56 rounded-full bg-[#ed1c24]/25 blur-3xl" />
      <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Ready to Access CostCraft?</h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-white/70">
          Authorized Bookends Hospitality users can sign in to continue.
        </p>
        <div className="mt-8 flex justify-center">
          <Button
            asChild
            size="lg"
            className="bg-white text-[#152c8f] shadow-lg shadow-black/20 transition-transform hover:scale-[1.03] hover:bg-white/90"
          >
            <Link to="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
