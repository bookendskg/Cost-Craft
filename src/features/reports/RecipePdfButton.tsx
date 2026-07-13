import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        if (busy) return; // block rapid double-clicks → no duplicate exports
        setBusy(true);
        try {
          // Load each direct sub-recipe's own ingredients for the appendix breakdown.
          const subIds = [
            ...new Set(
              ingredients
                .filter((i) => i.component_type === "recipe" && i.subRecipe)
                .map((i) => i.subRecipe!.id),
            ),
          ];
          const subRecipes = (await Promise.all(subIds.map((id) => recipesRepo.getWithIngredients(id))))
            .filter((d): d is NonNullable<typeof d> => !!d)
            .map((d) => ({ recipe: d.recipe, ingredients: d.ingredients }));
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
      }}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {busy ? "Preparing professional PDF…" : "Export PDF"}
    </Button>
  );
}
