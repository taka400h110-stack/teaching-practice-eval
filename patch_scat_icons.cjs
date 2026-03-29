const fs = require('fs');
const path = require('path');

function fixIcons(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  code = code.replace(
    /import \{([^}]+)\} from '@mui\/icons-material';/g,
    (match, p1) => {
      const icons = p1.split(',').map(s => s.trim()).filter(Boolean);
      return icons.map(icon => `import ${icon} from '@mui/icons-material/${icon}';`).join('\n');
    }
  );
  fs.writeFileSync(filePath, code);
}

fixIcons(path.join(__dirname, 'src', 'pages', 'SCATBatchAnalysisPage.tsx'));
if(fs.existsSync(path.join(__dirname, 'src', 'pages', 'SCATNetworkAnalysisPage.tsx'))) {
  fixIcons(path.join(__dirname, 'src', 'pages', 'SCATNetworkAnalysisPage.tsx'));
}
if(fs.existsSync(path.join(__dirname, 'src', 'pages', 'SCATTimelinePage.tsx'))) {
  fixIcons(path.join(__dirname, 'src', 'pages', 'SCATTimelinePage.tsx'));
}

console.log('Fixed MUI Icons imports');
