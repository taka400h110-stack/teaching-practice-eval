const fs = require('fs');
const path = '/home/user/webapp/src/api/client.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '      week_number:     (data.week_number as number) || 1,',
  `      week_number:     (data.week_number as number) || 1,
      ocr_source:      data.ocr_source as string | undefined,
      ocr_confidence:  data.ocr_confidence as number | undefined,`
);

content = content.replace(
  '      week_number:     (data.week_number as number) || j.week_number,',
  `      week_number:     (data.week_number as number) || j.week_number,
      ocr_source:      (data.ocr_source as string) || j.ocr_source,
      ocr_confidence:  (data.ocr_confidence as number) || j.ocr_confidence,`
);

fs.writeFileSync(path, content);
