const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/routes/exports.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const targetStr = `  // Here we would apply scopes and fetch real data based on dataset_type.
  // For simplicity we will mock generation
  const mockFilePath = "/exports/file-" + id + ".json";
  
  await db.prepare(\`
    UPDATE dataset_export_requests
    SET status = 'completed', export_file_path = ?, export_row_count = ?, export_summary_json = ?
    WHERE id = ?
  \`).bind(mockFilePath, 100, JSON.stringify({ note: "Generated data" }), id).run();`;

const replacement = `
  // Determine target user for scope resolution (requester)
  const requesterId = (reqRes.requester_user_id as string);
  const requesterRole = (reqRes.requester_role as string) || "researcher";
  
  // Create a mock context to reuse getScopeContext
  const mockContext = { get: (key: string) => key === "user" ? { id: requesterId, role: requesterRole } : null };
  const scopeCtx = await getScopeContext(mockContext as any, db);
  
  // Decide which table to query
  let tableName = "journal_entries";
  let datasetType = (reqRes.dataset_type as string) || "journals";
  if (datasetType === "journals") tableName = "journal_entries";
  else if (datasetType === "evaluations") tableName = "evaluations";
  else if (datasetType === "students") tableName = "users";
  
  // Build query
  const scopeFilter = buildScopeFilter(scopeCtx, datasetType === "students" ? "id" : "student_id");
  
  let query = \`SELECT * FROM \${tableName} WHERE \${scopeFilter.condition}\`;
  const { results } = await db.prepare(query).bind(...scopeFilter.params).all();
  
  // Apply anonymization
  const anonLevel = (reqRes.approved_anonymization_level || reqRes.requested_anonymization_level || "pseudonymized") as 'raw' | 'pseudonymized' | 'aggregated';
  const anonymizedData = applyAnonymization(results, {
    role: requesterRole,
    anonymizationLevel: anonLevel,
    resourceType: datasetType === "journals" ? "journal" : (datasetType === "evaluations" ? "evaluation" : "student")
  });
  
  // Save as string in DB (or mock file path if we can't save huge data)
  // For this scaffold, we'll store JSON in KV if we had one, but we don't.
  // We'll store it in a mock file path but also we could store a base64 encoded payload in export_file_path just for demo, or a data URI.
  // Actually, Cloudflare pages allows caching, but since it's a mock we can use a base64 Data URI as a file path so the download endpoint can decode it.
  const dataString = JSON.stringify(anonymizedData);
  const dataUri = "data:application/json;base64," + Buffer.from(dataString).toString('base64');
  
  await db.prepare(\`
    UPDATE dataset_export_requests
    SET status = 'completed', export_file_path = ?, export_row_count = ?, export_summary_json = ?
    WHERE id = ?
  \`).bind(dataUri, Array.isArray(anonymizedData) ? anonymizedData.length : 1, JSON.stringify({ dataset: datasetType, anonLevel }), id).run();`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacement);
  
  // Add imports if missing
  if (!content.includes('getScopeContext')) {
    content = content.replace('import { applyAnonymization } from "../services/anonymization";', 
      'import { applyAnonymization } from "../services/anonymization";\nimport { getScopeContext, buildScopeFilter } from "../middleware/scope";');
  }
  
  fs.writeFileSync(filePath, content);
  console.log("Updated exports.ts successfully.");
} else {
  console.error("Could not find target string in exports.ts");
}
