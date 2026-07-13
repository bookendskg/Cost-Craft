import { useState } from "react";
import { ChevronDown, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Recipe, RecipeIngredientWithMaterial } from "@/lib/data/types";
import type { ViewVisibility } from "@/lib/auth/permissions";
import { recipesRepo } from "@/lib/data";
import { useSession } from "@/lib/auth/session";
import { useRecordExport } from "@/features/exports/hooks";
import { generateRecipePdf } from "./pdf";
import { toast } from "@/components/ui/use-toast";

export function RecipePdfButton({
  recipe,
  ingredients,
  visibility,
}: {
  recipe: Recipe;
  ingredients: RecipeIngredientWithMaterial[];
  visibility?: ViewVisibility;
}) {
  const [busy, setBusy] = useState(false);
  const user = useSession((s) => s.user);
  const recordExport = useRecordExport();

  const hasSubRecipes = ingredients.some((i) => i.component_type === "recipe" && i.subRecipe);

  const runExport = async (includeSubs: boolean) => {
    if (busy) return; // block rapid double-clicks → no duplicate exports
    setBusy(true);
    try {
      // Only load sub-recipe ingredients when the reader wants the breakdown appendix.
      let subRecipes: { recipe: Recipe; ingredients: RecipeIngredientWithMaterial[] }[] | undefined;
      if (includeSubs && hasSubRecipes) {
        const subIds = [
          ...new Set(
            ingredients
              .filter((i) => i.component_type === "recipe" && i.subRecipe)
              .map((i) => i.subRecipe!.id),
          ),
        ];
        subRecipes = (await Promise.all(subIds.map((id) => recipesRepo.getWithIngredients(id))))
          .filter((d): d is NonNullable<typeof d> => !!d)
          .map((d) => ({ recipe: d.recipe, ingredients: d.ingredients }));
      }
      await generateRecipePdf(recipe, ingredients, {
        visibility,
        subRecipes,
        // Exporter identity is taken from the authenticated session — never typed.
        exporter: user ? { id: user.id, name: user.name, role: user.role } : undefined,
      });
      // Audit only AFTER the file is generated — never for a failed export.
      // Awaited so the record is persisted; a failed audit doesn't fail the export.
      try {
        await recordExport.mutateAsync({
          exported_by_user_id: user?.id ?? null,
          exporter_name_snapshot: user?.name ?? "Unknown",
          exporter_email_snapshot: user?.email ?? null,
          exporter_role_snapshot: user?.role ?? "viewer",
          export_type: "single_recipe",
          entity_type: "recipe",
          entity_id: recipe.id,
          recipe_name_snapshot: recipe.recipe_name,
          report_name: null,
          brand_id: recipe.brand,
          outlet_id: null,
          filters_used: null,
          file_format: "pdf",
        });
      } catch (auditErr) {
        if (import.meta.env.DEV) console.error("Audit record failed", auditErr);
      }
      toast.success("PDF exported successfully.");
    } catch (e) {
      if (import.meta.env.DEV) console.error("PDF export failed", e);
      toast.error("Unable to generate the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const label = busy ? "Preparing professional PDF…" : "Export PDF";
  const icon = busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />;

  // No sub-recipes → nothing to include/exclude; keep the plain one-click button.
  if (!hasSubRecipes) {
    return (
      <Button variant="outline" disabled={busy} onClick={() => runExport(false)}>
        {icon}
        {label}
      </Button>
    );
  }

  // Has sub-recipes → let the user pick whether to append the sub-recipe breakdown.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={busy}>
          {icon}
          {label}
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => runExport(true)}>With sub-recipe breakdown</DropdownMenuItem>
        <DropdownMenuItem onClick={() => runExport(false)}>Recipe only (no sub-recipes)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
