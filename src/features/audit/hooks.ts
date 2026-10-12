import { useQuery } from "@tanstack/react-query";
import { auditRepo, materialsRepo, recipesRepo, type AuditFilter } from "@/lib/data";

/** One page of the activity log. Super Admin only (route guard + RLS 0035). */
export function useActivityLog(filter: AuditFilter = {}) {
  return useQuery({
    queryKey: ["audit", filter],
    queryFn: () => auditRepo.list(filter),
    placeholderData: (prev) => prev,
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
