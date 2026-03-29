const fs = require('fs');
const path = require('path');

// 1. Fix src/api/client.ts return type
const clientPath = path.join(__dirname, '../src/api/client.ts');
let clientContent = fs.readFileSync(clientPath, 'utf8');
if (!clientContent.includes('import type { CleanupMetricsResponse }')) {
  clientContent = clientContent.replace(
    'import type {',
    'import type { CleanupMetricsResponse } from "../types/adminMetrics";\nimport type {'
  );
}
clientContent = clientContent.replace(
  'export async function getCleanupMetrics(range: "7d" | "30d") {',
  'export async function getCleanupMetrics(range: "7d" | "30d"): Promise<CleanupMetricsResponse> {'
);
fs.writeFileSync(clientPath, clientContent);

// 2. Fix Grid in CleanupKpiCards
const kpiPath = path.join(__dirname, '../src/components/admin/CleanupKpiCards.tsx');
let kpiContent = fs.readFileSync(kpiPath, 'utf8');
kpiContent = kpiContent.replace(/<Grid item xs=\{12\} sm=\{6\} md=\{3\}>/g, '<Grid size={{ xs: 12, sm: 6, md: 3 }}>');
fs.writeFileSync(kpiPath, kpiContent);

console.log('Fixed TS errors');
