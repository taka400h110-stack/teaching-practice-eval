import { useQuery } from "@tanstack/react-query";
import { getCleanupFailureAlert } from "../api/client";
import { CleanupFailureAlertResponse } from "../types/adminAlerts";

export function useCleanupFailureAlert() {
  return useQuery<CleanupFailureAlertResponse, Error>({
    queryKey: ["admin", "cleanupFailureAlert"],
    queryFn: () => getCleanupFailureAlert(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
