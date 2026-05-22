const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/JournalDetailPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldCheck = `function ScoreChip({ score }: { score: number }) {
  const color = score >= 4 ? "#2e7d32" : score >= 3 ? "#1565c0" : score >= 2 ? "#e65100" : "#c62828";
  const bg    = score >= 4 ? "#e8f5e9" : score >= 3 ? "#e3f2fd" : score >= 2 ? "#fff3e0" : "#ffebee";
  return (`;

const newCheck = `function ScoreChip({ score }: { score: number | undefined }) {
  if (typeof score !== "number") {
    return (
      <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", bgcolor: "#f5f5f5", border: "2px solid #bdbdbd", fontWeight: "bold", fontSize: 14, color: "#9e9e9e" }}>
        —
      </Box>
    );
  }
  const color = score >= 4 ? "#2e7d32" : score >= 3 ? "#1565c0" : score >= 2 ? "#e65100" : "#c62828";
  const bg    = score >= 4 ? "#e8f5e9" : score >= 3 ? "#e3f2fd" : score >= 2 ? "#fff3e0" : "#ffebee";
  return (`;

if (content.includes(oldCheck)) {
  content = content.replace(oldCheck, newCheck);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed ScoreChip');
} else {
  console.log('Could not find ScoreChip');
}
