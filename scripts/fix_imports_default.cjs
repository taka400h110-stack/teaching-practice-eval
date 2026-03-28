const fs = require('fs');
const file = '/home/user/webapp/src/index.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('import { adminAnalyticsRouter } from "./api/routes/adminAnalytics";', 'import adminAnalyticsRouter from "./api/routes/adminAnalytics";');
content = content.replace('import { adminIncidentsRouter } from "./api/routes/adminIncidents";', 'import adminIncidentsRouter from "./api/routes/adminIncidents";');
content = content.replace('import { adminOperationalReadinessRouter } from "./api/routes/adminOperationalReadiness";', 'import adminOperationalReadinessRouter from "./api/routes/adminOperationalReadiness";');

fs.writeFileSync(file, content);
