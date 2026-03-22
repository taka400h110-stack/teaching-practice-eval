const fs = require('fs');
const path = '/home/user/webapp/src/pages/JournalEditorPage.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '  const buildPayload = (status: "draft" | "submitted"): JournalCreateRequest => ({',
  `  const buildPayload = (status: "draft" | "submitted"): JournalCreateRequest => ({
    ...(ocrMeta.source ? { ocr_source: ocrMeta.source, ocr_confidence: ocrMeta.confidence } : {}),`
);

fs.writeFileSync(path, content);
