// Shared building blocks for the MCP tools: the ToolDef shape, who the request
// acts as, and the lookup/formatting helpers every tool uses.
//
// Every write goes through the app's own repositories, so an agent's change gets
// the same treatment as one made in the browser: unit conversion, the recipe cost
// cascade, price history, the Activity Log entry, and the snapshots a Super Admin
// needs to revert it. Nothing here talks to the database directly.
//
// Permissions are Supabase's: the server signs in as the user, so row-level
// security and their KostKraft role decide what the agent can do.

import { z } from "zod";

import { materialsRepo, recipesRepo, type MaterialInput } from "@/lib/data";
import { canonicalPurchase, type MeasurementType } from "@/lib/units";
import type { RawMaterial, Recipe } from "@/lib/data/types";

/** One tool, shared by both transports: stdio (Claude Code) and hosted HTTP (ChatGPT). */
export interface ToolDef<S extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  title: string;
  description: string;
  inputSchema: S;
  handler: (args: z.objectOutputType<S, z.ZodTypeAny>) => Promise<ToolResult>;
}

export interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

export function defineTool<S extends z.ZodRawShape>(
  name: string,
  meta: { title: string; description: string; inputSchema: S },
  handler: (args: z.objectOutputType<S, z.ZodTypeAny>) => Promise<ToolResult>,
): ToolDef {
  return { name, ...meta, handler } as unknown as ToolDef;
}

/** Who the current request acts as. Set once per stdio session, per request when hosted. */
export interface Actor {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export let actor: Actor;

export function setActor(next: Actor): void {
  actor = next;
}

export function currentActor(): Actor {
  return actor;
}

export const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});
export const fail = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
});

export const norm = (s: string) => s.trim().toLowerCase();

export async function findMaterial(nameOrId: string): Promise<RawMaterial | null> {
  const all = await materialsRepo.list();
  return (
    all.find((m) => m.id === nameOrId) ??
    all.find((m) => norm(m.ingredient_name) === norm(nameOrId)) ??
    all.find((m) => norm(m.ingredient_name).includes(norm(nameOrId))) ??
    null
  );
}

export async function findRecipe(nameOrId: string): Promise<Recipe | null> {
  const all = await recipesRepo.list();
  return (
    all.find((r) => r.id === nameOrId) ??
    all.find((r) => norm(r.recipe_name) === norm(nameOrId)) ??
    all.find((r) => norm(r.recipe_name).includes(norm(nameOrId))) ??
    null
  );
}

export const materialView = (m: RawMaterial) => ({
  id: m.id,
  name: m.ingredient_name,
  category: m.category,
  price: m.purchase_price,
  per: `1 ${m.purchase_unit}`,
  cost_per_base_unit: m.cost_per_base_unit,
  base_unit: m.base_unit,
  status: m.status,
  last_price_update: m.last_price_update,
});

export const MEASUREMENT: Record<string, MeasurementType> = {
  weight: "weight",
  kg: "weight",
  liquid: "volume",
  volume: "volume",
  litre: "volume",
  count: "count",
  piece: "count",
};

export function materialInput(
  name: string,
  category: string,
  type: string,
  price: number | null,
): MaterialInput {
  const measurement = MEASUREMENT[norm(type)] ?? "weight";
  const canon = canonicalPurchase(measurement);
  return {
    ingredient_name: name.trim(),
    category: category.trim() || "Other",
    notes: null,
    purchase_price: price,
    purchase_quantity: 1,
    purchase_unit: canon.purchase_unit,
    base_unit: canon.base_unit,
  };
}

