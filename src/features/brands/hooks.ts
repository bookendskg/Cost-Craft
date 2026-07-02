import { useQuery } from "@tanstack/react-query";
import { brandsRepo, outletsRepo } from "@/lib/data";

// Brand & outlet management (create/edit/delete/archive) has been removed — the
// fixed Capiche/Aiko brands and their outlets are READ-ONLY. Only the read
// queries remain, used for filtering, selectors and per-user brand/outlet scope.

export function useBrands() {
  return useQuery({ queryKey: ["brands"], queryFn: () => brandsRepo.list() });
}

export function useOutlets() {
  return useQuery({ queryKey: ["outlets"], queryFn: () => outletsRepo.list() });
}
