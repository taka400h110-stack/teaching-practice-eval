const fs = require('fs');
const path = '/home/user/webapp/src/pages/JournalEditorPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const newEffect = `
  useEffect(() => {
    if (isEditMode) return;
    
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("from") === "ocr") {
      try {
        const ocrDataStr = sessionStorage.getItem("ocr_form_data");
        const ocrRawText = sessionStorage.getItem("ocr_raw_text");
        
        if (ocrDataStr) {
          const formData = JSON.parse(ocrDataStr) as Record<string, string>;
          
          const newRecords: HourRecord[] = [];
          
          const mapping = [
            { field: "block_morning", label: "朝の会" },
            { field: "block_p1", label: "1時限" },
            { field: "block_p2", label: "2時限" },
            { field: "block_p3", label: "3時限" },
            { field: "block_p4", label: "4時限" },
            { field: "block_lunch", label: "給食・昼" },
            { field: "block_p5", label: "5時限" },
            { field: "block_p6", label: "6時限" },
            { field: "block_cleaning", label: "清掃" },
            { field: "block_closing", label: "帰りの会" },
            { field: "block_after", label: "放課後" },
          ];
          
          let order = 0;
          for (const m of mapping) {
            if (formData[m.field]) {
              newRecords.push(makeEmpty(order++, {
                time_label: m.label,
                body: formData[m.field].trim()
              }));
            }
          }
          
          if (newRecords.length > 0) {
            setRecords(newRecords);
          }
          
          if (formData["reflection"]) {
            setReflection(formData["reflection"].trim());
          } else if (ocrRawText && newRecords.length === 0) {
            setReflection(ocrRawText);
          }
          
          sessionStorage.removeItem("ocr_form_data");
          sessionStorage.removeItem("ocr_raw_text");
        }
      } catch (e) {
        console.error("Failed to load OCR data", e);
      }
    }
  }, [isEditMode, location.search]);
`;

content = content.replace('  const saveMutation = useMutation<JournalEntry, Error, JournalCreateRequest>({', newEffect + '\\n  const saveMutation = useMutation<JournalEntry, Error, JournalCreateRequest>({');
fs.writeFileSync(path, content);
