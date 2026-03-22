const fs = require('fs');
const path = '/home/user/webapp/src/api/client.ts';
let content = fs.readFileSync(path, 'utf8');

const scatApi = `
  // SCAT API
  getScatProjects: async () => {
    const res = await fetch('/api/data/scat/projects');
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },
  createScatProject: async (title: string, description: string, created_by: string) => {
    const res = await fetch('/api/data/scat/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, created_by })
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },
  getScatSegments: async (projectId: string) => {
    const res = await fetch(\`/api/data/scat/projects/\${projectId}/segments\`);
    if (!res.ok) throw new Error('Failed to fetch segments');
    return res.json();
  },
  createScatSegments: async (projectId: string, segments: any[]) => {
    const res = await fetch('/api/data/scat/segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, segments })
    });
    if (!res.ok) throw new Error('Failed to save segments');
    return res.json();
  },
  getScatCodes: async (projectId: string) => {
    const res = await fetch(\`/api/data/scat/projects/\${projectId}/codes\`);
    if (!res.ok) throw new Error('Failed to fetch codes');
    return res.json();
  },
  saveScatCode: async (codeData: any) => {
    const res = await fetch('/api/data/scat/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(codeData)
    });
    if (!res.ok) throw new Error('Failed to save code');
    return res.json();
  },
`;

content = content.replace(
  '};\n\nexport default mockApi;',
  scatApi + '\\n};\n\nexport default mockApi;'
);

fs.writeFileSync(path, content);
