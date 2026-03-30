const fs = require('fs');

// Patch SCATClassPage
let classPage = fs.readFileSync('/home/user/webapp/src/pages/SCATClassPage.tsx', 'utf8');
classPage = classPage.replace(/import React from "react";/, 'import React from "react";\nimport MermaidDiagram from "../components/MermaidDiagram";');
classPage = classPage.replace(/<Box border={1} borderColor="divider" height={300} display="flex" alignItems="center" justifyContent="center">\s*<Typography color="textSecondary">ここにクラス全体のISM構造図（mermaid\.js等）を描画<\/Typography>\s*<\/Box>/, 
  `{data.mermaidChart ? <MermaidDiagram chart={data.mermaidChart} /> : <Box border={1} borderColor="divider" height={300} display="flex" alignItems="center" justifyContent="center"><Typography color="textSecondary">ここにクラス全体のISM構造図（mermaid.js等）を描画</Typography></Box>}`);
fs.writeFileSync('/home/user/webapp/src/pages/SCATClassPage.tsx', classPage);

// Patch SCATStudentPage
let studentPage = fs.readFileSync('/home/user/webapp/src/pages/SCATStudentPage.tsx', 'utf8');
studentPage = studentPage.replace(/import React from "react";/, 'import React from "react";\nimport MermaidDiagram from "../components/MermaidDiagram";');
studentPage = studentPage.replace(/<Box border={1} borderColor="divider" height={300} display="flex" alignItems="center" justifyContent="center">\s*<Typography color="textSecondary">ここに個別ISM構造図を描画<\/Typography>\s*<\/Box>/,
  `{data.mermaidChart ? <MermaidDiagram chart={data.mermaidChart} /> : <Box border={1} borderColor="divider" height={300} display="flex" alignItems="center" justifyContent="center"><Typography color="textSecondary">ここに個別ISM構造図を描画</Typography></Box>}`);
fs.writeFileSync('/home/user/webapp/src/pages/SCATStudentPage.tsx', studentPage);

console.log("Patched pages");
