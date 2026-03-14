const fs = require('fs');

let code = fs.readFileSync('src/components/AppLayout.tsx', 'utf-8');

code = code.replace(
  /\{roles\.map\(r => \(\n\s*<Chip\n\s*key=\{r\}\n\s*label=\{ROLE_LABEL\[r as UserRole\] \?\? r\}\n\s*size="small"\n\s*sx=\{\{\n\s*fontSize: 9, height: 16,\n\s*bgcolor: ROLE_COLOR\[roles\[0\] as UserRole\] \?\? "primary\.main",\n\s*color: "white", mt: 0\.3, mb: 0\.3,\n\s*\}\}\n\s*\/>/g,
  `{roles.map(r => (
              <Chip
                key={r}
                label={ROLE_LABEL[r as UserRole] ?? r}
                size="small"
                sx={{
                  fontSize: 9, height: 16,
                  bgcolor: ROLE_COLOR[r as UserRole] ?? "primary.main",
                  color: "white", mt: 0.3, mb: 0.3, mr: 0.5,
                }}
              />
            ))}`
);

fs.writeFileSync('src/components/AppLayout.tsx', code);
