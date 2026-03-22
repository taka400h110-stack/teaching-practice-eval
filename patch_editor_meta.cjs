const fs = require('fs');
const path = '/home/user/webapp/src/pages/JournalEditorPage.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '          sessionStorage.removeItem("ocr_form_data");',
  `          const source = sessionStorage.getItem("ocr_source");
          const conf = sessionStorage.getItem("ocr_confidence");
          if (source) {
            setOcrMeta({ source, confidence: conf ? parseFloat(conf) : undefined });
          }
          sessionStorage.removeItem("ocr_form_data");`
);

content = content.replace(
  '          sessionStorage.removeItem("ocr_raw_text");',
  `          sessionStorage.removeItem("ocr_raw_text");
          sessionStorage.removeItem("ocr_source");
          sessionStorage.removeItem("ocr_confidence");`
);

fs.writeFileSync(path, content);
