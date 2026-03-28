const fs = require('fs');

const path = '/home/user/webapp/src/api/client.ts';
let content = fs.readFileSync(path, 'utf-8');

const exportApi = `
  // ────────────────────────────────────────────────────────────────
  // Dataset Exports
  // ────────────────────────────────────────────────────────────────
  async getExportRequests() {
    return this.fetch<{ requests: any[] }>('/api/data/exports/requests');
  }

  async createExportRequest(payload: any) {
    return this.fetch<{ id: string; status: string }>('/api/data/exports/requests', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async approveExportRequest(id: string, payload: any) {
    return this.fetch<{ success: boolean; id: string }>(\`/api/data/exports/requests/\${id}/approve\`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async rejectExportRequest(id: string, payload: any) {
    return this.fetch<{ success: boolean; id: string }>(\`/api/data/exports/requests/\${id}/reject\`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async revokeExportRequest(id: string) {
    return this.fetch<{ success: boolean; id: string }>(\`/api/data/exports/requests/\${id}/revoke\`, {
      method: 'POST'
    });
  }

  async generateExport(id: string, format: string = 'json') {
    return this.fetch<{ success: boolean; id: string; status: string }>(\`/api/data/exports/requests/\${id}/generate\`, {
      method: 'POST',
      body: JSON.stringify({ format })
    });
  }

  async issueDownloadToken(id: string) {
    return this.fetch<{ token: string; id: string }>(\`/api/data/exports/requests/\${id}/download-token\`, {
      method: 'POST'
    });
  }
`;

if (!content.includes('getExportRequests')) {
  content = content.replace('  // ────────────────────────────────────────────────────────────────\n  // ChatBot', exportApi + '\n  // ────────────────────────────────────────────────────────────────\n  // ChatBot');
  fs.writeFileSync(path, content);
  console.log('API client updated.');
}
