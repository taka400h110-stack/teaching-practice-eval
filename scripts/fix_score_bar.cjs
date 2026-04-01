const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/JournalDetailPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldCheck = `function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <LinearProgress
      variant="determinate"
      value={(value / 5) * 100}`;

const newCheck = `function ScoreBar({ value, color }: { value: number | undefined; color: string }) {
  const safeValue = typeof value === "number" ? value : 0;
  return (
    <LinearProgress
      variant="determinate"
      value={(safeValue / 5) * 100}`;

if (content.includes(oldCheck)) {
  content = content.replace(oldCheck, newCheck);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed ScoreBar');
} else {
  console.log('Could not find ScoreBar');
}
