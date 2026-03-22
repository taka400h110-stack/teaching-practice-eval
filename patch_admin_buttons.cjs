const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboardPage.tsx', 'utf8');

if (!content.includes('const handleDownload')) {
  // Add download function
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
  
  content = content.replace('const handlePageChange = ', functionToAdd + '\n  const handlePageChange = ');
  
  // Replace buttons
  content = content.replace('<Button variant="contained" href="/api/data/export/joint-display-csv" target="_blank" rel="noopener noreferrer">', '<Button variant="contained" onClick={() => handleDownload("/api/data/export/joint-display-csv", "joint_display.csv")}>');
  content = content.replace('<Button variant="contained" href="/api/data/export/chat-goals-csv" target="_blank" rel="noopener noreferrer">', '<Button variant="contained" onClick={() => handleDownload("/api/data/export/chat-goals-csv", "chat_goals.csv")}>');
  
  fs.writeFileSync('src/pages/AdminDashboardPage.tsx', content);
  console.log("AdminDashboardPage buttons updated");
}
