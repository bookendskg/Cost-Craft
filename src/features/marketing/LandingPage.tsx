import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  ChefHat,
  FileBarChart,
  LayoutDashboard,
  Lock,
  Package,
  Percent,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { usePageMeta } from "@/lib/usePageMeta";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";
import { SectionHeading, FeatureCard, BrandBadge, CTASection, BrandLogoStrip } from "./parts";

const OVERVIEW = [
  "Recipes",
  "Raw materials",
  "Ingredient prices",
  "In-House Prep",
  "Yield",
  "Wastage",
  "Reports",
  "Brand & outlet access",
];

const FEATURES = [
  { icon: BookOpen, title: "Recipe Management", body: "A central recipe library with ingredients, quantities, preparation instructions, linked sub-recipes and pizza size variants." },
  { icon: Calculator, title: "Raw Material Costing", body: "Purchase quantity, units and price-per-base-unit give tight control over ingredient pricing." },
  { icon: Percent, title: "Yield Management", body: "Capture raw quantity, wastage and usable quantity to derive true yield percentage and adjusted cost." },
  { icon: Trash2, title: "Wastage Management", body: "Outlet-level tracking with wastage reasons and clear quantity and unit records." },
  { icon: ChefHat, title: "In-House Prep", body: "Standardise prepared components as reusable sub-recipes across the menu." },
  { icon: FileBarChart, title: "Reports & Export", body: "Day-wise, brand-wise and outlet-wise reports with PDF, CSV and XLSX export where permitted." },
  { icon: ShieldCheck, title: "Role-Based Access", body: "Super Admin, custom roles and read-only Viewer access with restricted financial fields." },
];

const MODULES = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Package, label: "Raw Materials" },
  { icon: BookOpen, label: "Recipes" },
  { icon: ChefHat, label: "In-House Prep" },
  { icon: Percent, label: "Yield Management" },
  { icon: Trash2, label: "Wastage Management" },
  { icon: FileBarChart, label: "Reports" },
  { icon: Users, label: "User Management" },
];

const STEPS = [
  { icon: Package, title: "Manage Raw Materials", body: "Set purchase price, quantity and base unit for every ingredient." },
  { icon: BookOpen, title: "Build Recipes", body: "Combine ingredients and sub-recipes with quantities and prep steps." },
  { icon: Percent, title: "Track Yield & Wastage", body: "Record prep yield and outlet wastage to reflect real usable cost." },
  { icon: FileBarChart, title: "Review Reports", body: "Analyse costing by brand and outlet, then export where allowed." },
];

const BENEFITS = [
  "Centralized recipe information",
  "Better costing visibility",
  "Consistent unit handling",
  "Clear yield calculations",
  "Better wastage tracking",
  "Reduced spreadsheet dependency",
  "Brand-wise data separation",
  "Controlled user access",
];

const SECURITY = [
  { icon: Lock, title: "Secure login", body: "Access requires a verified account; disabled accounts cannot enter the app." },
  { icon: ShieldCheck, title: "Role-based access", body: "Super Admin and custom roles govern exactly what each user can see and do." },
  { icon: Users, title: "Scoped visibility", body: "Brand and outlet scope, with financial fields hidden from read-only Viewers." },
];

export function LandingPage() {
  usePageMeta({
    title: "CostCraft — Recipe Costing & Operations for Bookends Hospitality",
    description:
      "CostCraft is the recipe costing, yield and wastage platform for Bookends Hospitality — Capiche and Aiko. Standardise recipes and control food cost across every brand and outlet.",
  });

  return (
    <div className="min-h-[100dvh] bg-background">
      <PublicHeader />

      <main>
        {/* ── Hero ── */}
        <section id="overview" className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(50% 40% at 12% 0%, rgba(27,53,168,0.10), transparent 60%)," +
                "radial-gradient(40% 35% at 100% 8%, rgba(237,28,36,0.08), transparent 60%)",
            }}
          />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Built for Bookends Hospitality · Capiche &amp; Aiko
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
                Smarter Recipe Costing for Better Restaurant Operations
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                CostCraft brings recipe management, ingredient costing, yield, wastage and brand-level
                operational visibility into one platform.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-11">
                  <Link to="/login">
                    Login to CostCraft
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-11">
                  <a href="#features">Explore Features</a>
                </Button>
              </div>

              <BrandLogoStrip label="Built for Bookends Hospitality" className="mt-10" />
            </div>

            {/* Illustrative, masked product preview — structural UI only, no live data. */}
            <div className="animate-fade-up lg:justify-self-end" style={{ animationDelay: "80ms" }}>
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* ── Overview ── */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <SectionHeading
                align="left"
                eyebrow="Overview"
                title="One platform for restaurant cost control"
                description="CostCraft helps Bookends Hospitality teams standardise recipes and control food cost — replacing scattered spreadsheets with one consistent source of truth."
              />
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                {OVERVIEW.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 rounded-lg border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <SectionHeading
              eyebrow="Capabilities"
              title="Everything you need to control food cost"
              description="From ingredient pricing to yield, wastage and reporting — the core modules of restaurant cost intelligence."
            />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <FeatureCard key={f.title} icon={f.icon} title={f.title}>
                  {f.body}
                </FeatureCard>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <SectionHeading eyebrow="How it works" title="Four steps from ingredient to insight" />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <div key={s.title} className="rounded-xl border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <s.icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Brands ── */}
        <section id="brands">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <SectionHeading
              eyebrow="Multi-brand"
              title="One platform, every Bookends brand"
              description="CostCraft keeps recipes, categories and operational data separated per brand while sharing one consistent costing engine."
            />
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <BrandBadge
                name="Bookends Hospitality"
                tone="bookends"
                tagline="We believe in unreasonable hospitality."
                points={["Central recipe & costing platform", "Brand and outlet reporting", "Unified user & role management"]}
              />
              <BrandBadge
                name="Capiche"
                tone="capiche"
                tagline="It's always pizza time."
                points={["Pizza-first recipes & size variants", "Capiche-specific categories", "Separate operational data"]}
              />
              <BrandBadge
                name="Aiko"
                tone="aiko"
                tagline="Asian Inspired Komfort."
                points={["Asian comfort recipes", "Aiko-specific categories", "Separate operational data"]}
              />
            </div>
          </div>
        </section>

        {/* ── Benefits ── */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <SectionHeading
                align="left"
                eyebrow="Why CostCraft"
                title="Operational benefits that add up"
                description="Practical improvements to how your kitchens and management teams work — no spreadsheets required."
              />
              <ul className="grid gap-3 sm:grid-cols-2">
                {BENEFITS.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2.5 rounded-lg border bg-card px-4 py-3 text-sm text-foreground/85 shadow-sm"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Modules preview ── */}
        <section>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <SectionHeading eyebrow="Inside CostCraft" title="The modules your team will use" />
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {MODULES.map((m) => (
                <div
                  key={m.label}
                  className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <m.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-foreground">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Security ── */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <SectionHeading eyebrow="Security & access" title="Access designed for teams" />
            <div className="mt-12 grid gap-5 sm:grid-cols-3">
              {SECURITY.map((s) => (
                <FeatureCard key={s.title} icon={s.icon} title={s.title}>
                  {s.body}
                </FeatureCard>
              ))}
            </div>
          </div>
        </section>

        <CTASection />
      </main>

      <PublicFooter />
    </div>
  );
}

/** Masked, structural product preview. No real recipes, costs or metrics. */
function HeroPreview() {
  return (
    <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calculator className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-foreground">Recipe cost breakdown</span>
        </div>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#1b35a8]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ed1c24]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f5c107]" />
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {["Ingredients (yield-adjusted)", "In-house prep", "Packaging"].map((label, i) => (
          <div key={label} className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-xs text-muted-foreground">{label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-primary/70" style={{ width: [82, 54, 30][i] + "%" }} />
            </span>
            <span className="w-12 text-right text-xs font-medium tabular-nums text-muted-foreground">₹•••</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="text-[11px] text-muted-foreground">Cost / portion</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">₹•••</p>
        </div>
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="text-[11px] text-muted-foreground">Food cost %</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">••%</p>
        </div>
      </div>

      <p className="mt-3 text-center text-[10px] text-muted-foreground">Illustrative preview — not live data.</p>
    </div>
  );
}
