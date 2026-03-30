
import { useQuery } from "@tanstack/react-query";
import { getCleanupAlertHistory } from "../api/client";
import { AlertHistoryQuery, AlertHistoryResponse } from "../types/adminAlerts";

export function useCleanupAlertHistory(query: AlertHistoryQuery) {
  return useQuery<AlertHistoryResponse, Error>({
    queryKey: ["admin", "cleanupAlertHistory", query],
    queryFn: () => getCleanupAlertHistory(query),
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
}
