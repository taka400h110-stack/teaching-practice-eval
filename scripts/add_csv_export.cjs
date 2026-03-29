const fs = require('fs');

let content = fs.readFileSync('/home/user/webapp/src/api/routes/exports.ts', 'utf-8');

// Inside generate:
const target = `  const anonymizedData = applyAnonymization(results, {
    role: requesterRole,
    anonymizationLevel: anonLevel as 'raw' | 'pseudonymized' | 'aggregated',
    resourceType: datasetType === "journals" ? "journal" : (datasetType === "evaluations" ? "evaluation" : "student")
  });
  
  const dataString = JSON.stringify(anonymizedData);`;

const replacement = `  const anonymizedData = applyAnonymization(results, {
    role: requesterRole,
    anonymizationLevel: anonLevel as 'raw' | 'pseudonymized' | 'aggregated',
    resourceType: datasetType === "journals" ? "journal" : (datasetType === "evaluations" ? "evaluation" : "student")
  });
  
  let dataString = "";
  let contentType = "application/json";
  let ext = "json";
  
  const exportFormat = (body.format || "json") as string;
  if (exportFormat === "csv" && Array.isArray(anonymizedData) && anonymizedData.length > 0) {
    const headers = Object.keys(anonymizedData[0]);
    const csv = [
      headers.join(","),
      ...anonymizedData.map(r => headers.map(h => \`"\${String((r as any)[h] ?? "").replace(/"/g, '""')}"\`).join(","))
    ].join("\\n");
    dataString = csv;
    contentType = "text/csv";
    ext = "csv";
  } else {
    dataString = JSON.stringify(anonymizedData);
  }`;

content = content.replace(target, replacement);
content = content.replace(
  'const objectKey = `exports/${requesterId}/${id}/${Date.now()}/${datasetType}-${anonLevel}.json`;',
  'const objectKey = `exports/${requesterId}/${id}/${Date.now()}/${datasetType}-${anonLevel}.${ext}`;'
);
content = content.replace(/contentType: "application\/json"/g, 'contentType: contentType');
content = content.replace(/contentDisposition: \`attachment; filename="\$\{datasetType\}-\$\{anonLevel\}\.json"\`/g, 'contentDisposition: `attachment; filename="${datasetType}-${anonLevel}.${ext}"`');
content = content.replace(/export_content_type = 'application\/json',/g, 'export_content_type = ?,');
content = content.replace(/objectKey, byteSize, hash, id/g, 'contentType, byteSize, hash, id');

fs.writeFileSync('/home/user/webapp/src/api/routes/exports.ts', content);
