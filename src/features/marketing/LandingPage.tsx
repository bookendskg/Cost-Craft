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
          {/* Layered futuristic backdrop: blueprint grid + drifting aurora blobs. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid mask-fade-y opacity-70" />
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <span className="blob left-[-6%] top-[-12%] h-72 w-72 bg-[#1b35a8]/25" />
            <span className="blob right-[-4%] top-[2%] h-64 w-64 bg-[#ed1c24]/20" style={{ animationDelay: "-5s" }} />
            <span className="blob left-[32%] top-[46%] h-72 w-72 bg-[#f5c107]/20" style={{ animationDelay: "-9s" }} />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(50% 40% at 12% 0%, rgba(27,53,168,0.10), transparent 60%)," +
                "radial-gradient(40% 35% at 100% 8%, rgba(237,28,36,0.08), transparent 60%)",
            }}
          />
          <div className="mx-auto grid max-w-[1728px] items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div className="animate-fade-up">
              <span className="glass inline-flex items-center gap-2 rounded-full border border-primary/15 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Built for Bookends Hospitality · Capiche &amp; Aiko
              </span>
              <h1 className="mt-6 text-balance text-[2.6rem] font-bold leading-[1.04] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Smarter <span className="text-gradient-brand">Recipe Costing</span> for Better Restaurant Operations
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                CostCraft brings recipe management, ingredient costing, yield, wastage and brand-level
                operational visibility into one precise, beautifully organised platform.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-11 shadow-lg shadow-primary/25">
                  <Link to="/login">
                    Login to CostCraft
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-11 glass">
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

        {/* ── Metrics strip ── */}
        <section className="relative border-y bg-gradient-to-b from-muted/40 to-background">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid mask-fade-b opacity-50" />
          <div className="relative mx-auto grid max-w-[1728px] grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4">
            {[
              { n: "3", l: "Restaurant brands" },
              { n: "8", l: "Operational modules" },
              { n: "1", l: "Source of truth" },
              { n: "0", l: "Spreadsheets needed" },
            ].map((m) => (
              <div key={m.l} className="text-center">
                <p className="text-gradient-brand text-4xl font-bold tabular-nums sm:text-5xl">{m.n}</p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">{m.l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Overview ── */}
        <section className="border-t bg-gradient-to-b from-muted/40 to-background">
          <div className="mx-auto max-w-[1728px] px-4 py-16 sm:px-6 sm:py-20">
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

        {/* ── Product showcase ── */}
        <section className="relative overflow-hidden border-t bg-gradient-to-b from-background to-muted/40">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid mask-fade-y opacity-60" />
          <div aria-hidden className="blob left-1/2 top-6 h-72 w-72 -translate-x-1/2 bg-primary/15" />
          <div className="relative mx-auto max-w-[1728px] px-4 py-16 sm:px-6 sm:py-24">
            <SectionHeading
              eyebrow="The product"
              title="A control room for your food cost"
              description="Every recipe, price, yield and wastage entry rolls up into one live master-costing view — brand by brand, outlet by outlet."
            />
            <div className="mt-12">
              <DashboardShowcase />
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features">
          <div className="mx-auto max-w-[1728px] px-4 py-16 sm:px-6 sm:py-24">
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
        <section id="how-it-works" className="border-t bg-gradient-to-b from-muted/40 to-background">
          <div className="mx-auto max-w-[1728px] px-4 py-16 sm:px-6 sm:py-24">
            <SectionHeading eyebrow="How it works" title="Four steps from ingredient to insight" />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <div key={s.title} className="card-glow rounded-xl border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-[#ed1c24]/10 text-primary ring-1 ring-primary/10">
                      <s.icon className="h-5 w-5" />
                    </span>
                    <span className="text-gradient-brand text-sm font-bold uppercase tracking-wide">Step {i + 1}</span>
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
          <div className="mx-auto max-w-[1728px] px-4 py-16 sm:px-6 sm:py-24">
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
        <section className="border-t bg-gradient-to-b from-muted/40 to-background">
          <div className="mx-auto max-w-[1728px] px-4 py-16 sm:px-6 sm:py-24">
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
          <div className="mx-auto max-w-[1728px] px-4 py-16 sm:px-6 sm:py-24">
            <SectionHeading eyebrow="Inside CostCraft" title="The modules your team will use" />
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {MODULES.map((m) => (
                <div
                  key={m.label}
                  className="group card-glow flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-[#ed1c24]/10 text-primary ring-1 ring-primary/10 transition-transform group-hover:scale-105">
                    <m.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-foreground">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Security ── */}
        <section className="border-t bg-gradient-to-b from-muted/40 to-background">
          <div className="mx-auto max-w-[1728px] px-4 py-16 sm:px-6 sm:py-24">
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

/** Premium, realistic product-window mock. Structural only — no live data. */
function HeroPreview() {
  const cats = [
    { label: "Pizza", w: 88, tone: "from-[#1b35a8] to-[#4f46e5]" },
    { label: "Pasta", w: 64, tone: "from-[#4f46e5] to-[#6366f1]" },
    { label: "Noodles", w: 46, tone: "from-[#1b35a8] to-[#4f46e5]" },
    { label: "Sushi", w: 72, tone: "from-[#4f46e5] to-[#818cf8]" },
    { label: "Drinks", w: 34, tone: "from-[#1b35a8] to-[#4f46e5]" },
  ];
  const rows = [
    { n: "Margherita Pizza", fc: "22.4%", tone: "bg-emerald-500/10 text-emerald-700" },
    { n: "Truffle Pasta", fc: "31.8%", tone: "bg-amber-500/10 text-amber-700" },
    { n: "Katsu Curry", fc: "18.6%", tone: "bg-emerald-500/10 text-emerald-700" },
    { n: "Spiced Miso Ramen", fc: "37.2%", tone: "bg-red-500/10 text-red-600" },
  ];
  return (
    <div className="relative w-full max-w-lg lg:max-w-xl">
      {/* Ambient glow behind the window */}
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-primary/25 via-[#4f46e5]/10 to-[#ed1c24]/20 blur-3xl"
      />
      {/* Floating stat chips (desktop only) */}
      <div className="glass absolute -left-6 top-16 z-20 hidden rounded-xl border border-primary/15 px-3 py-2 shadow-xl lg:block">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Yield-adjusted</p>
        <p className="text-gradient-brand text-sm font-bold tabular-nums">+12.4%</p>
      </div>
      <div className="glass absolute -right-6 bottom-14 z-20 hidden rounded-xl border border-primary/15 px-3 py-2 shadow-xl lg:block">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg food cost</p>
        <p className="text-sm font-bold tabular-nums text-emerald-600">28.6%</p>
      </div>

      {/* App window */}
      <div className="card-glow relative overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-primary/10 ring-1 ring-black/5">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </span>
          <span className="mx-auto inline-flex items-center gap-1.5 rounded-md bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-black/5">
            <Lock className="h-3 w-3" /> app.costcraft — Master Costing
          </span>
        </div>

        <div className="flex">
          {/* Mini rail */}
          <div className="hidden w-12 shrink-0 flex-col items-center gap-3 border-r bg-muted/25 py-4 sm:flex">
            {[LayoutDashboard, Package, BookOpen, Percent, FileBarChart].map((Icon, i) => (
              <span
                key={i}
                className={
                  "flex h-8 w-8 items-center justify-center rounded-lg " +
                  (i === 0 ? "bg-gradient-to-br from-primary to-[#4f46e5] text-white shadow" : "text-muted-foreground")
                }
              >
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>

          {/* Content */}
          <div className="relative flex-1 space-y-3 p-4">
            {/* one-shot light sweep */}
            <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 animate-sheen bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            {/* KPI row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: "Avg FC %", v: "16.18%" },
                { k: "Pkg spend", v: "₹1,256" },
                { k: "Items", v: "93" },
              ].map((s) => (
                <div key={s.k} className="rounded-lg border bg-white/70 p-2.5">
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{s.k}</p>
                  <p className="text-gradient-brand mt-0.5 text-sm font-bold tabular-nums">{s.v}</p>
                </div>
              ))}
            </div>

            {/* Mini bar chart */}
            <div className="rounded-lg border bg-white/70 p-3">
              <p className="mb-2 text-[10px] font-medium text-muted-foreground">Food cost by category</p>
              <div className="flex h-20 items-end gap-2">
                {cats.map((c) => (
                  <div key={c.label} className="flex flex-1 flex-col items-center gap-1">
                    <span className="flex w-full items-end justify-center" style={{ height: "100%" }}>
                      <span className={"w-full rounded-t bg-gradient-to-t " + c.tone} style={{ height: c.w + "%" }} />
                    </span>
                    <span className="text-[8px] text-muted-foreground">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini table */}
            <div className="overflow-hidden rounded-lg border bg-white/70">
              {rows.map((r, i) => (
                <div
                  key={r.n}
                  className={"flex items-center justify-between px-3 py-2 text-xs " + (i > 0 ? "border-t" : "")}
                >
                  <span className="truncate font-medium text-foreground">{r.n}</span>
                  <span className={"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums " + r.tone}>
                    {r.fc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Wide, browser-framed dashboard mock for the showcase band. Structural only. */
function DashboardShowcase() {
  const kpis = [
    { k: "Total items", v: "93" },
    { k: "Avg FC %", v: "16.18%" },
    { k: "FC w/o pkg", v: "14.35%" },
    { k: "Avg pkg", v: "₹32.22" },
    { k: "Pkg spend", v: "₹1,256" },
    { k: "High cost", v: "0" },
  ];
  const rows = [
    { n: "Margherita Pizza", cat: "Pizza", price: "₹520", fc: "18.9%", tone: "bg-emerald-500/10 text-emerald-700" },
    { n: "Truffle Pasta", cat: "Pasta", price: "₹780", fc: "31.8%", tone: "bg-amber-500/10 text-amber-700" },
    { n: "Katsu Curry", cat: "Mains", price: "₹640", fc: "10.6%", tone: "bg-emerald-500/10 text-emerald-700" },
    { n: "Spiced Miso Ramen", cat: "Noodles", price: "₹880", fc: "37.2%", tone: "bg-red-500/10 text-red-600" },
    { n: "Tomato Butter Risotto", cat: "Risotto", price: "₹740", fc: "14.8%", tone: "bg-emerald-500/10 text-emerald-700" },
  ];
  const summary = [
    { c: "Pizza", n: 20, fc: "18.4%" },
    { c: "Pasta", n: 12, fc: "14.8%" },
    { c: "Noodles", n: 8, fc: "12.7%" },
    { c: "Sushi", n: 7, fc: "16.7%" },
  ];
  return (
    <div className="relative mx-auto max-w-5xl">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-primary/20 via-[#4f46e5]/10 to-[#ed1c24]/15 blur-3xl"
      />
      <div className="card-glow overflow-hidden rounded-2xl border bg-card shadow-2xl ring-1 ring-black/5">
        {/* Browser bar */}
        <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </span>
          <span className="mx-auto inline-flex items-center gap-1.5 rounded-md bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-black/5">
            <Lock className="h-3 w-3" /> app.costcraft — Dashboard
          </span>
        </div>

        {/* Master costing header band */}
        <div className="flex items-center justify-between gap-3 bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="rounded bg-white px-3 py-1.5 text-xs font-extrabold tracking-wide text-[#1b35a8]">BOOKENDS</span>
            <div>
              <p className="text-sm font-bold">BOOKENDS MASTER COSTING</p>
              <p className="text-[11px] text-slate-300">Food + Packaging + Pricing Control</p>
            </div>
          </div>
          <span className="hidden text-[11px] text-slate-400 sm:block">Last updated · Today</span>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-2.5 p-4 sm:grid-cols-6">
          {kpis.map((s) => (
            <div key={s.k} className="rounded-lg border bg-white/70 p-2.5">
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{s.k}</p>
              <p className="text-gradient-brand mt-0.5 text-sm font-bold tabular-nums">{s.v}</p>
            </div>
          ))}
        </div>

        {/* Table + side panel */}
        <div className="grid gap-4 px-4 pb-5 lg:grid-cols-3">
          <div className="overflow-hidden rounded-lg border bg-white/70 lg:col-span-2">
            <div className="grid grid-cols-[1.6fr_.8fr_.7fr_.7fr] gap-2 border-b bg-muted/50 px-3 py-2 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Food name</span>
              <span className="text-right">Selling</span>
              <span className="text-right">FC %</span>
              <span className="text-right">Cat</span>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.n}
                className={"grid grid-cols-[1.6fr_.8fr_.7fr_.7fr] items-center gap-2 px-3 py-2 text-xs " + (i > 0 ? "border-t" : "")}
              >
                <span className="truncate font-medium text-foreground">{r.n}</span>
                <span className="text-right font-mono text-muted-foreground">{r.price}</span>
                <span className="flex justify-end">
                  <span className={"rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums " + r.tone}>{r.fc}</span>
                </span>
                <span className="truncate text-right text-[10px] text-muted-foreground">{r.cat}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-white/70 p-3">
            <p className="mb-2 text-[11px] font-semibold text-foreground">Category summary</p>
            <div className="space-y-2">
              {summary.map((c) => (
                <div key={c.c} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{c.c}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{c.n} items</span>
                    <span className="font-mono font-semibold text-foreground">{c.fc}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t pt-3">
              <div className="flex items-center gap-2 text-[10px]">
                <span className="h-2.5 w-4 rounded bg-emerald-500/25" /> Good
                <span className="ml-1 h-2.5 w-4 rounded bg-amber-500/25" /> Moderate
                <span className="ml-1 h-2.5 w-4 rounded bg-red-500/25" /> High
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-[11px] text-muted-foreground">Illustrative preview — not live data.</p>
    </div>
  );
}
