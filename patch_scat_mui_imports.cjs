const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'src', 'pages', 'SCATBatchAnalysisPage.tsx');
let code = fs.readFileSync(pagePath, 'utf8');

code = code.replace(
  /import \{\s*Box, Typography, Paper, Button, Checkbox,\s*Table, TableBody, TableCell, TableContainer, TableHead, TableRow,\s*LinearProgress, Alert, Chip\s*\} from '@mui\/material';/,
  `import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';`
);

fs.writeFileSync(pagePath, code);
console.log('Fixed MUI imports in SCATBatchAnalysisPage');
