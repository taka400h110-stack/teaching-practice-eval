const fs = require('fs');
const path = '/home/user/webapp/src/components/exports/ExportRequestForm.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace("import { useAuth } from '../../context/AuthContext';", "import apiClient from '../../api/client';");
content = content.replace("const { user } = useAuth();", "const user = apiClient.getCurrentUser();");
fs.writeFileSync(path, content);
