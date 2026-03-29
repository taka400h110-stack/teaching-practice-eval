const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/routes/exports.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const targetStr = `  // Here we would return the actual file contents. Mocking for now.
  return c.text("MOCK FILE CONTENT");`;

const replacement = `  // Here we return the generated data (from the mock file path which is a Data URI in this scaffold)
  const fileData = reqRes.export_file_path || "";
  if (fileData.startsWith("data:application/json;base64,")) {
    const base64Data = fileData.split(",")[1];
    const jsonStr = Buffer.from(base64Data, "base64").toString("utf-8");
    return new Response(jsonStr, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": \`attachment; filename="export-\${reqRes.id}.json"\`
      }
    });
  }
  
  return c.text("MOCK FILE CONTENT: " + fileData);`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacement);
  fs.writeFileSync(filePath, content);
  console.log("Updated exports.ts successfully.");
} else {
  console.error("Could not find target string in exports.ts");
}
