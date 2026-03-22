const fs = require('fs');

// Fix externalJobs.ts
let ej = fs.readFileSync('/home/user/webapp/src/api/routes/externalJobs.ts', 'utf8');
ej = ej.replace(/const externalJobsRouter = new Hono<\{ Bindings: \{ DB: any \} \}>\(\);/, 
  'const externalJobsRouter = new Hono<{ Bindings: { DB: any }, Variables: { user: any } }>();');
fs.writeFileSync('/home/user/webapp/src/api/routes/externalJobs.ts', ej);

// Fix PlatformAnalyticsPage.tsx
let pa = fs.readFileSync('/home/user/webapp/src/pages/PlatformAnalyticsPage.tsx', 'utf8');
pa = pa.replace(/import \{ Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper as MuiPaper, Chip \} from "@mui\/material";/, 
  'import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper as MuiPaper } from "@mui/material";');
fs.writeFileSync('/home/user/webapp/src/pages/PlatformAnalyticsPage.tsx', pa);

// Fix TeacherDashboardPage.tsx
let td = fs.readFileSync('/home/user/webapp/src/pages/TeacherDashboardPage.tsx', 'utf8');
// Undo the bad patch from previous step
td = td.replace(/const typeMap: Record<string, string> = \{/, '');
td = td.replace(/const label = typeMap\[t\.school_type\] \|\| t\.school_type;/, '');
// find the actual place
td = td.replace(/const typeMap = \{/, 'const typeMap: Record<string, string> = {');
td = td.replace(/const label = typeMap\[t\.school_type\] \|\| t\.school_type;/, 'const label = (typeMap as any)[t.school_type] || t.school_type;');
fs.writeFileSync('/home/user/webapp/src/pages/TeacherDashboardPage.tsx', td);

// Fix client.ts
let c = fs.readFileSync('/home/user/webapp/src/api/client.ts', 'utf8');
c = c.replace(/export const apiFetch = async \(url: string, options: RequestInit = \{\}\): Promise<any> => \{/, 'export const apiFetch = async (url: string, options: RequestInit = {}): Promise<any> => {');
fs.writeFileSync('/home/user/webapp/src/api/client.ts', c);

console.log("Patched TS errors 3");
