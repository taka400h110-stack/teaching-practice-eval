const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, '../src/api/client.ts');
let clientContent = fs.readFileSync(clientPath, 'utf8');

clientContent = clientContent.replace(/const data = await res\.json\(\);/g, 'const data = (await res.json()) as any;');
clientContent = clientContent.replace(/const resData = await res\.json\(\);/g, 'const resData = (await res.json()) as any;');

fs.writeFileSync(clientPath, clientContent, 'utf8');

const jobPanelPath = path.join(__dirname, '../src/components/ExternalAnalysisJobPanel.tsx');
let jobPanelContent = fs.readFileSync(jobPanelPath, 'utf8');

jobPanelContent = jobPanelContent.replace(/const data = await res\.json\(\);/g, 'const data = (await res.json()) as any;');
jobPanelContent = jobPanelContent.replace(/res\.success/g, 'data.success');
jobPanelContent = jobPanelContent.replace(/res\.job_id/g, 'data.job_id');
jobPanelContent = jobPanelContent.replace(/res\.error/g, 'data.error');

fs.writeFileSync(jobPanelPath, jobPanelContent, 'utf8');
