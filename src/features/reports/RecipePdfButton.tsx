import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Recipe, RecipeIngredientWithMaterial } from "@/lib/data/types";
import type { ViewVisibility } from "@/lib/auth/permissions";
import { useSession } from "@/lib/auth/session";
import { generateRecipePdf } from "./pdf";
import { toast } from "@/components/ui/use-toast";

export function RecipePdfButton({
  recipe,
  ingredients,
  foodCostPct,
  visibility,
}: {
  recipe: Recipe;
  ingredients: RecipeIngredientWithMaterial[];
  foodCostPct: number;
  visibility?: ViewVisibility;
}) {
  const [busy, setBusy] = useState(false);
  const user = useSession((s) => s.user);
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        if (busy) return; // block rapid double-clicks → no duplicate exports
        setBusy(true);
        try {
          await generateRecipePdf(recipe, ingredients, foodCostPct, {
            visibility,
            // Exporter identity is taken from the authenticated session — never typed.
            exporter: user ? { name: user.name, role: user.role } : undefined,
          });
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
