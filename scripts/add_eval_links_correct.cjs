const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/EvaluationsPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('SCAT')) {
  // Find where we render the buttons
  const oldButtons = `                    <Tooltip title="人間評価を入力">
                      <IconButton size="small"
                        onClick={() => navigate(\`/evaluations/\${r.journalId}/human\`)}>
                        <PersonIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>`;
  const newButtons = `                    <Tooltip title="人間評価を入力">
                      <IconButton size="small"
                        onClick={() => navigate(\`/evaluations/\${r.journalId}/human\`)}>
                        <PersonIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {['admin', 'researcher', 'collaborator', 'board_observer'].includes(user?.role || '') && (
                      <>
                        <Tooltip title="SCAT分析結果">
                          <IconButton size="small" onClick={() => navigate(\`/research/journals/\${r.journalId}/scat\`)}>
                            <Typography variant="caption" fontWeight="bold">SCAT</Typography>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ISM構造化結果">
                          <IconButton size="small" onClick={() => navigate(\`/research/journals/\${r.journalId}/ism\`)}>
                            <Typography variant="caption" fontWeight="bold">ISM</Typography>
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>`;
                    
  content = content.replace(oldButtons, newButtons);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Added links to EvaluationsPage');
} else {
  console.log('Links already exist');
}
