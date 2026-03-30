import { useQuery } from "@tanstack/react-query";
import { getCleanupFailureAlert } from "../api/client";
import { CleanupFailureAlertResponse, CleanupFailureAlertResponseWithAck } from "../types/adminAlerts";

export function useCleanupFailureAlert() {
  return useQuery<CleanupFailureAlertResponseWithAck, Error>({
    queryKey: ["admin", "cleanupFailureAlert"],
    queryFn: () => getCleanupFailureAlert(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
}
