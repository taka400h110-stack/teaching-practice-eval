const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/routes/adminAlerts.ts');
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(
  'import { Env } from "../types";',
  'import { Env } from "../../types/env";'
);

fs.writeFileSync(filePath, content, 'utf-8');

const sNotifierPath = path.join(__dirname, '../src/api/services/slackNotifier.ts');
let sNotifier = fs.readFileSync(sNotifierPath, 'utf-8');
sNotifier = sNotifier.replace('import { Env } from "../../types";', 'import { Env } from "../../types/env";');
fs.writeFileSync(sNotifierPath, sNotifier, 'utf-8');

const eNotifierPath = path.join(__dirname, '../src/api/services/emailNotifier.ts');
let eNotifier = fs.readFileSync(eNotifierPath, 'utf-8');
eNotifier = eNotifier.replace('import { Env } from "../../types";', 'import { Env } from "../../types/env";');
fs.writeFileSync(eNotifierPath, eNotifier, 'utf-8');

const nServicePath = path.join(__dirname, '../src/api/services/notificationService.ts');
let nService = fs.readFileSync(nServicePath, 'utf-8');
nService = nService.replace('import { Env } from "../../types";', 'import { Env } from "../../types/env";');
fs.writeFileSync(nServicePath, nService, 'utf-8');

console.log('Fixed imports in notification services and routes');
