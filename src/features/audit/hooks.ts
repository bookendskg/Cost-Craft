import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { auditRepo, materialsRepo, recipesRepo, revertRepo, type AuditFilter } from "@/lib/data";
import { useActorId } from "@/lib/hooks/useActor";

/** One page of the activity log. Super Admin only (route guard + RLS 0035). */
export function useActivityLog(filter: AuditFilter = {}) {
  return useQuery({
    queryKey: ["audit", filter],
    queryFn: () => auditRepo.list(filter),
    placeholderData: (prev) => prev,
  });
}

/** Which of these log entries have already been reverted (for the badge). */
export function useRevertedIds(ids: string[]) {
  return useQuery({
    queryKey: ["audit", "reverted", ids],
    queryFn: () => revertRepo.revertedIds(ids),
    enabled: ids.length > 0,
  });
}

/** Undo one change, or a whole import/bulk batch. Super Admin only. */
export function useRevertChange() {
  const qc = useQueryClient();
  const actorId = useActorId();
  return useMutation({
    mutationFn: ({ entryId, batchId, force }: { entryId?: string; batchId?: string; force?: boolean }) =>
      batchId
        ? revertRepo.revertBatch(batchId, actorId, force)
        : revertRepo.revert(entryId!, actorId, force),
    onSuccess: (result) => {
      if (!result.ok) return; // a conflict changes nothing — don't refetch
      for (const key of ["audit", "materials", "recipes", "yields", "packaging", "brands", "outlets", "users", "settings", "wastage"]) {
        qc.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}

export function useAllPriceHistory() {
  return useQuery({
    queryKey: ["priceHistory", "all"],
    queryFn: () => materialsRepo.allPriceHistory(),
  });
}

export function useAllRecipeCostHistory() {
  return useQuery({
    queryKey: ["recipeCostHistory", "all"],
    queryFn: () => recipesRepo.allCostHistory(),
  });
}
