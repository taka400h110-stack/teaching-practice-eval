const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboardPage.tsx', 'utf8');

const functionToAdd = `
  const handleDownload = async (url: string, filename: string) => {
    try {
      const user = JSON.parse(localStorage.getItem('user_info') || '{}');
      const role = user.role || 'student';
      const res = await fetch(url, { headers: { 'X-User-Role': role } });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('ダウンロードに失敗しました。');
    }
  };
`;

if (!content.includes('const handleDownload')) {
  // Find "export default function AdminDashboardPage() {"
  content = content.replace('export default function AdminDashboardPage() {', 'export default function AdminDashboardPage() {\n' + functionToAdd);
  fs.writeFileSync('src/pages/AdminDashboardPage.tsx', content);
}
