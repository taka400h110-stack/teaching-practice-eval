const fs = require('fs');

let content = fs.readFileSync('/home/user/webapp/src/api/routes/exports.ts', 'utf-8');

content = content.replace(/dataset: datasetType: String\(datasetType\),/g, 'dataset: String(datasetType),');
content = content.replace(/dataset_type: datasetType: String\(datasetType\),/g, 'dataset_type: String(datasetType),');

fs.writeFileSync('/home/user/webapp/src/api/routes/exports.ts', content);
