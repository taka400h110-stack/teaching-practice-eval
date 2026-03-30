import { useQuery } from "@tanstack/react-query";
import { getCleanupMetrics } from "../api/client";
import { CleanupMetricsResponse } from "../types/adminMetrics";

export function useCleanupMetrics(range: "7d" | "30d") {
  return useQuery<CleanupMetricsResponse>({
    queryKey: ["admin", "cleanupMetrics", range],
    queryFn: () => getCleanupMetrics(range),
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
}
