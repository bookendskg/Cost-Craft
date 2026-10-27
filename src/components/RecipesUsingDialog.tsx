// "Recipes Using This" — shown from Raw Materials and from Yield Management.
//
// It answers the question a blocked delete raises ("still used in recipes" — which
// ones?) and the one a price or yield edit raises (what am I about to re-cost?).
// Recipes that use the ingredient inside a prep are listed too, labelled with the
// prep, since those are easy to forget and are re-costed just the same.

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChefHat } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRecipes } from "@/features/recipes/hooks";
import { useAllRecipeIngredients } from "@/features/reports/hooks";
import { buildRecipeUsage } from "@/lib/recipeUsage";

export function RecipesUsingDialog({
  ingredientId,
  ingredientName,
  description,
  onOpenChange,
}: {
  /** null closes the dialog. */
  ingredientId: string | null;
  ingredientName: string | null;
  /** Overrides the default blurb (the yield page explains re-costing). */
  description?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  // Same query keys as the dashboard and reports use — already cached, no extra fetch.
  const { data: recipes = [] } = useRecipes();
  const { data: lines = [] } = useAllRecipeIngredients();
  const usage = useMemo(() => buildRecipeUsage(lines, recipes), [lines, recipes]);
  const list = ingredientId ? usage.get(ingredientId) ?? [] : [];

  return (
    <Dialog open={!!ingredientId} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recipes using {ingredientName ?? "this ingredient"}</DialogTitle>
          <DialogDescription>
            {description ??
              "Every recipe that uses this ingredient, including the ones that use it inside a prep. All of them re-cost when its price changes."}
          </DialogDescription>
        </DialogHeader>
        {list.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No recipes currently use this ingredient.</p>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {list.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => {
                    navigate(`/recipes/${r.id}`);
                    onOpenChange(false);
                  }}
                  className="flex w-full items-center gap-2 py-2.5 text-left text-sm hover:underline"
                >
                  <ChefHat className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{r.name}</span>
                  {r.viaPrep && (
                    <span className="shrink-0 text-xs text-muted-foreground">via {r.viaPrep}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
