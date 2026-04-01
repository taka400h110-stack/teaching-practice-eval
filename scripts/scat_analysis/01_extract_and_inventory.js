const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const INPUT_DIR = '/mnt/aidrive/実習報告書';
const OUTPUT_DIR = path.join(__dirname, 'output');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function main() {
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.docx') && !f.startsWith('~$'));
  
  // Exclude templates and reference files based on names
  const validFiles = files.filter(f => !f.includes('書式') || f.includes('実習の報告書'));
  
  // Pilot on 10 files
  const pilotFiles = validFiles.slice(0, 10);
  
  const inventory = [];
  const extractedTexts = [];
  
  console.log(`Processing ${pilotFiles.length} files for pilot...`);
  
  for (let i = 0; i < pilotFiles.length; i++) {
    const file = pilotFiles[i];
    const filePath = path.join(INPUT_DIR, file);
    
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value.trim();
      
      const fileId = `DOC_${String(i+1).padStart(3, '0')}`;
      
      inventory.push({
        id: fileId,
        filename: file,
        status: text ? 'success' : 'empty',
        length: text.length
      });
      
      if (text) {
        extractedTexts.push({
          id: fileId,
          filename: file,
          text: text
        });
      }
      console.log(`Extracted: ${file}`);
    } catch (err) {
      console.error(`Error reading ${file}:`, err.message);
      inventory.push({
        id: `DOC_${String(i+1).padStart(3, '0')}`,
        filename: file,
        status: 'error',
        error: err.message
      });
    }
  }
  
  // Save 01_file_inventory.csv
  const csvHeader = 'id,filename,status,length,error\n';
  const csvRows = inventory.map(row => `${row.id},"${row.filename}",${row.status},${row.length || 0},"${row.error || ''}"`).join('\n');
  fs.writeFileSync(path.join(OUTPUT_DIR, '01_file_inventory.csv'), csvHeader + csvRows);
  
  // Save 02_extracted_texts.jsonl
  const jsonlContent = extractedTexts.map(row => JSON.stringify(row)).join('\n');
  fs.writeFileSync(path.join(OUTPUT_DIR, '02_extracted_texts.jsonl'), jsonlContent);
  
  console.log('Artifacts 01 and 02 generated in output directory.');
}

main().catch(console.error);
