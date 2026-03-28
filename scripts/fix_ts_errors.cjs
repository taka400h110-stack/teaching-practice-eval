const fs = require('fs');

// Fix Drawer
let path = '/home/user/webapp/src/components/exports/ExportRequestDetailDrawer.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/<Grid item xs={12} sm={6}>/g, '<Grid xs={12} sm={6} as="div">').replace(/<Grid item xs=\{12\} sm=\{6\}>/g, '<Grid xs={12} sm={6} as="div">');
fs.writeFileSync(path, content);

// Fix hook
path = '/home/user/webapp/src/hooks/useExports.ts';
content = fs.readFileSync(path, 'utf8');
content = content.replace('const data = await res.json();', 'const data: any = await res.json();');
content = content.replace('const errorData = await res.json().catch(() => ({}));', 'const errorData: any = await res.json().catch(() => ({}));');
content = content.replace('const err = await res.json().catch(() => ({}));', 'const err: any = await res.json().catch(() => ({}));');
fs.writeFileSync(path, content);

// Fix page
path = '/home/user/webapp/src/pages/ExportsPage.tsx';
content = fs.readFileSync(path, 'utf8');
content = content.replace('const { token } = await issueToken.mutateAsync(req.id);', 'const { token } = await issueToken.mutateAsync(req.id) as any;');
fs.writeFileSync(path, content);
