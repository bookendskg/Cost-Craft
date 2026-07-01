// A tiny module-level cache of the loaded brands, primed once at AppLayout from
// the brands repo. It lets non-React code (PDF export) and one-off label lookups
// resolve a brand id → display label / accent without threading the list through.
// Reactive lists (dropdowns, filters) use the useBrands() query directly instead.

import { BRANDS, type BrandRecord } from "./types";

let cache: BrandRecord[] = [];

export function primeBrandCache(brands: BrandRecord[]): void {
  cache = brands;
}

/** All brand records currently loaded (empty until the app primes the cache). */
export function cachedBrands(): BrandRecord[] {
  return cache;
}

/** All loaded brand ids (used as the "all brands" fallback for non-React lookups). */
export function allBrandIds(): string[] {
  return cache.map((b) => b.id);
}

/** Display label for a brand id — cache first, then the legacy BRANDS constant, then the raw id. */
export function brandLabel(id: string | null | undefined): string {
  if (!id) return "—";
  const hit = cache.find((b) => b.id === id);
  if (hit) return hit.display_name || hit.name;
  return BRANDS.find((b) => b.value === id)?.label ?? id;
}

/** Accent colour (hex) for a brand id, if known. */
export function brandAccentHex(id: string | null | undefined): string | null {
  if (!id) return null;
  return cache.find((b) => b.id === id)?.accent_color ?? null;
}
