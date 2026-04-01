const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/EvaluationsPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('SCAT')) {
  // Find where we render the buttons
  const oldButtons = `                      <Button variant="outlined" size="small"
                        onClick={() => navigate(\`/evaluations/\${r.journalId}/human\`)}>
                        人間評価
                      </Button>
                    </Stack>`;
  const newButtons = `                      <Button variant="outlined" size="small"
                        onClick={() => navigate(\`/evaluations/\${r.journalId}/human\`)}>
                        人間評価
                      </Button>
                      {['admin', 'researcher', 'collaborator', 'board_observer'].includes(user?.role || '') && (
                        <>
                          <Button variant="outlined" size="small" onClick={() => navigate(\`/research/journals/\${r.journalId}/scat\`)}>SCAT</Button>
                          <Button variant="outlined" size="small" onClick={() => navigate(\`/research/journals/\${r.journalId}/ism\`)}>ISM</Button>
                        </>
                      )}
                    </Stack>`;
                    
  content = content.replace(oldButtons, newButtons);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Added links to EvaluationsPage');
} else {
  console.log('Links already exist');
}
