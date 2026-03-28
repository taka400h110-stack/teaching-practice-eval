const fs = require('fs');

let content = fs.readFileSync('/home/user/webapp/src/api/routes/exports.ts', 'utf-8');

// 195: customMetadata string values
content = content.replace(/requestId: id,/g, 'requestId: String(id),');
content = content.replace(/datasetType,/g, 'datasetType: String(datasetType),');
content = content.replace(/anonymizationLevel: anonLevel,/g, 'anonymizationLevel: String(anonLevel),');
content = content.replace(/requesterUserId: requesterId/g, 'requesterUserId: String(requesterId)');

// 324: new Headers()
content = content.replace(
  "const headers = new Headers();\n    object.writeHttpMetadata(headers);\n    headers.set('etag', object.httpEtag);\n    if (!headers.has('content-type')) headers.set('content-type', 'application/json');\n    if (!headers.has('content-disposition')) headers.set('content-disposition', \\`attachment; filename=\"export-\\${reqRes.id}.json\"\\`);\n    \n    return new Response(object.body, { headers });",
  "const headers = new Headers() as any;\n    object.writeHttpMetadata(headers);\n    headers.set('etag', object.httpEtag);\n    if (!headers.has('content-type')) headers.set('content-type', 'application/json');\n    if (!headers.has('content-disposition')) headers.set('content-disposition', `attachment; filename=\"export-${reqRes.id}.json\"`);\n    \n    return new Response(object.body as any, { headers });"
);

fs.writeFileSync('/home/user/webapp/src/api/routes/exports.ts', content);
