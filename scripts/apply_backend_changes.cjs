const fs = require('fs');
const path = require('path');

// 1. Types
const typesPath = path.join(__dirname, '../src/types/adminAlerts.ts');
let typesContent = fs.readFileSync(typesPath, 'utf8');

if (!typesContent.includes('export type AlertAcknowledgment')) {
  typesContent += `
export type AlertAcknowledgment = {
  exists: boolean;
  status: "acknowledged" | "investigating" | "resolved" | null;
  acknowledgedByUserId: string | null;
  acknowledgedAt: string | null;
  note: string | null;
};

export type CleanupFailureAlertResponseWithAck = CleanupFailureAlertResponse & {
  acknowledgment: AlertAcknowledgment | null;
};

export type AlertHistoryQuery = {
  range?: "7d" | "30d" | "90d" | "custom";
  dateFrom?: string;
  dateTo?: string;
  eventTypes?: string;
  severities?: string;
  channels?: string;
  outcomes?: string;
  reasonQuery?: string;
  fingerprintPrefix?: string;
  actorUserId?: string;
  sort?: "createdAt:desc" | "createdAt:asc";
  limit?: number;
  cursor?: string;
};

export type AlertHistoryResponse = {
  items: AlertHistoryRow[];
  pageInfo: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
  filtersApplied: any;
  summary: {
    totalMatched: number;
    notifySent: number;
    notifySuppressed: number;
    dismissed: number;
    alertGenerated: number;
    failedCount: number;
  };
};
`;
  fs.writeFileSync(typesPath, typesContent);
}

// 2. Env
const envPath = path.join(__dirname, '../src/types/env.ts');
let envContent = fs.readFileSync(envPath, 'utf8');
if (!envContent.includes('EMAIL_PROVIDER')) {
  envContent = envContent.replace('export interface Env {', `export interface Env {
  EMAIL_PROVIDER?: string;
  RESEND_API_KEY?: string;
  SENDGRID_API_KEY?: string;
`);
  fs.writeFileSync(envPath, envContent);
}

console.log("Updated types and env");
