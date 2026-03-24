const fs = require('fs');

function patch(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Add empty state for journals
  content = content.replace(
    /<List dense disablePadding>\s*\{\(journals \?\? \[\]\)\.slice\(0, 5\)\.map/s,
    `<List dense disablePadding>
                {(journals ?? []).length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    まだ日誌がありません
                  </Typography>
                )}
                {(journals ?? []).slice(0, 5).map`
  );

  // Add empty state for goals
  content = content.replace(
    /\{\(goals \?\? \[\]\)\.slice\(0, 4\)\.map\(\(g\) => \(/s,
    `{(goals ?? []).length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    まだ目標がありません
                  </Typography>
                )}
                {(goals ?? []).slice(0, 4).map((g) => (`
  );

  fs.writeFileSync(file, content);
  console.log("Patched " + file);
}

patch('src/pages/DashboardPage.tsx');
