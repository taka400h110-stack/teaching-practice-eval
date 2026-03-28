const fs = require('fs');
const path = require('path');

const hookPath = path.join(__dirname, '../src/hooks/useCleanupAlertHistory.ts');
let content = fs.readFileSync(hookPath, 'utf8');

content = `
import { useQuery } from "@tanstack/react-query";
import { getCleanupAlertHistory } from "../api/client";
import { AlertHistoryQuery, AlertHistoryResponse } from "../types/adminAlerts";

export function useCleanupAlertHistory(query: AlertHistoryQuery) {
  return useQuery<AlertHistoryResponse, Error>({
    queryKey: ["admin", "cleanupAlertHistory", query],
    queryFn: () => getCleanupAlertHistory(query),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
`;

fs.writeFileSync(hookPath, content);

const clientPath = path.join(__dirname, '../src/api/client.ts');
let clientContent = fs.readFileSync(clientPath, 'utf8');

clientContent = clientContent.replace(
  `export async function getCleanupAlertHistory(range: "7d" | "30d" | "90d" = "30d", limit: number = 50): Promise<any> {`,
  `export async function getCleanupAlertHistory(query: import('../types/adminAlerts').AlertHistoryQuery): Promise<any> {`
);

clientContent = clientContent.replace(
  `const res = await fetch(\`\${API_BASE_URL}/api/admin/alerts/history?range=\${range}&limit=\${limit}\`, {`,
  `
  const params = new URLSearchParams();
  if (query.range) params.append('range', query.range);
  if (query.dateFrom) params.append('dateFrom', query.dateFrom);
  if (query.dateTo) params.append('dateTo', query.dateTo);
  if (query.eventTypes) params.append('eventTypes', query.eventTypes);
  if (query.severities) params.append('severities', query.severities);
  if (query.channels) params.append('channels', query.channels);
  if (query.outcomes) params.append('outcomes', query.outcomes);
  if (query.reasonQuery) params.append('reasonQuery', query.reasonQuery);
  if (query.fingerprintPrefix) params.append('fingerprintPrefix', query.fingerprintPrefix);
  if (query.actorUserId) params.append('actorUserId', query.actorUserId);
  if (query.sort) params.append('sort', query.sort);
  if (query.limit) params.append('limit', query.limit.toString());
  if (query.cursor) params.append('cursor', query.cursor);

  const res = await fetch(\`\${API_BASE_URL}/api/admin/alerts/history?\${params.toString()}\`, {`
);

fs.writeFileSync(clientPath, clientContent);

console.log("Updated hook and client");
