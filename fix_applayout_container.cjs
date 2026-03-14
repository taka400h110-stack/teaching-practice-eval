const fs = require('fs');
let code = fs.readFileSync('src/components/AppLayout.tsx', 'utf8');

if (!code.includes("import { Container }")) {
  code = code.replace(
    /AppBar, Box, CssBaseline, Drawer/,
    `AppBar, Box, CssBaseline, Drawer, Container`
  );
}

// Wrap <Outlet /> in <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
if (!code.includes("<Container maxWidth=\"xl\"")) {
  code = code.replace(
    /<Outlet \/>/,
    `<Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>\n          <Outlet />\n        </Container>`
  );
}

fs.writeFileSync('src/components/AppLayout.tsx', code);
console.log("AppLayout.tsx updated with Container.");
