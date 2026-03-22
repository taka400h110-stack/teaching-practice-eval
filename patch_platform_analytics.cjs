const fs = require('fs');

let c = fs.readFileSync('/home/user/webapp/src/pages/PlatformAnalyticsPage.tsx', 'utf8');

if (!c.includes('ExternalAnalysisJobsList')) {
  c = c.replace(/import \{ apiFetch \} from "\.\.\/api\/client";/, `import { apiFetch } from "../api/client";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper as MuiPaper, Chip } from "@mui/material";`);

  const jobListCode = `
function ExternalAnalysisJobsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['external-jobs'],
    queryFn: () => apiFetch('/api/external-jobs')
  });

  if (isLoading) return <CircularProgress />;
  if (!data?.jobs || data.jobs.length === 0) return <Typography>No external analysis jobs found.</Typography>;

  return (
    <TableContainer component={MuiPaper} sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Job Type</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Created At</TableCell>
            <TableCell>Completed At</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.jobs.map((job: any) => (
            <TableRow key={job.id}>
              <TableCell>{job.job_type}</TableCell>
              <TableCell>
                <Chip 
                  label={job.status} 
                  color={job.status === 'completed' ? 'success' : job.status === 'queued' ? 'warning' : 'default'} 
                  size="small" 
                />
              </TableCell>
              <TableCell>{new Date(job.created_at).toLocaleString()}</TableCell>
              <TableCell>{job.completed_at ? new Date(job.completed_at).toLocaleString() : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
`;
  
  c = c.replace(/const PlatformAnalyticsPage: React\.FC = \(\) => \{/, jobListCode + '\nconst PlatformAnalyticsPage: React.FC = () => {');

  // G-Methodsタブなどを消して External Analysis ジョブ一覧タブにする
  c = c.replace(/<Tab label="G-Methods \(Causal\)" \/>/, '<Tab label="External Analysis Jobs" />');
  c = c.replace(/<Tab label="Fairness & Validity" \/>/, '');
  
  // TabPanel 1 の内容を置き換え
  const newTab1 = `
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6">External Analysis Jobs</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Overview of high-load statistical analyses running outside of this platform.
        </Typography>
        <ExternalAnalysisJobsList />
      </TabPanel>
  `;
  c = c.replace(/<TabPanel value=\{tabValue\} index=\{1\}>[\s\S]*?<\/TabPanel>/, newTab1);
  c = c.replace(/<TabPanel value=\{tabValue\} index=\{2\}>[\s\S]*?<\/TabPanel>/, '');

  fs.writeFileSync('/home/user/webapp/src/pages/PlatformAnalyticsPage.tsx', c);
  console.log("Patched PlatformAnalyticsPage");
}
