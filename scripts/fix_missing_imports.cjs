const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/index.tsx');
let content = fs.readFileSync(file, 'utf8');

const importsToAdd = `
import { adminAnalyticsRouter } from "./api/routes/adminAnalytics";
import { adminIncidentsRouter } from "./api/routes/adminIncidents";
import { adminOperationalReadinessRouter } from "./api/routes/adminOperationalReadiness";
`;

content = content.replace(
  'import { adminAlertsRouter } from "./api/routes/adminAlerts";',
  'import { adminAlertsRouter } from "./api/routes/adminAlerts";' + importsToAdd
);
fs.writeFileSync(file, content);
