const fs = require('fs');
const path = require('path');

const jobPanelPath = path.join(__dirname, '../src/components/ExternalAnalysisJobPanel.tsx');
let jobPanelContent = fs.readFileSync(jobPanelPath, 'utf8');

const jobFetchOld = `      const res = await apiFetch('/api/external-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_type: jobType,
          dataset_type: datasetType,
          parameters: {}
        })
      });
      if (res.success) {
        setJobId(res.job_id);
        setMessage(\`Job Created Successfully. ID: \${res.job_id}\`);
      } else {
        setMessage(\`Failed: \${res.error}\`);
      }`;

const jobFetchNew = `      const res = await apiFetch('/api/external-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_type: jobType,
          dataset_type: datasetType,
          parameters: {}
        })
      });
      const data = (await res.json()) as any;
      if (data.success) {
        setJobId(data.job_id);
        setMessage(\`Job Created Successfully. ID: \${data.job_id}\`);
      } else {
        setMessage(\`Failed: \${data.error}\`);
      }`;

jobPanelContent = jobPanelContent.replace(jobFetchOld, jobFetchNew);

const jobPollOld = `      const res = await apiFetch(\`/api/external-jobs/\${jobId}\`);
      if (res.success) {`;

const jobPollNew = `      const res = await apiFetch(\`/api/external-jobs/\${jobId}\`);
      const data = (await res.json()) as any;
      if (data.success) {`;

jobPanelContent = jobPanelContent.replace(jobPollOld, jobPollNew);
jobPanelContent = jobPanelContent.replace(/res\.status/g, 'data.status');
jobPanelContent = jobPanelContent.replace(/res\.result/g, 'data.result');
jobPanelContent = jobPanelContent.replace(/res\.error/g, 'data.error');

fs.writeFileSync(jobPanelPath, jobPanelContent, 'utf8');
