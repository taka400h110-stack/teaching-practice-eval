const fs = require('fs');
const file = 'src/pages/AdminDashboardPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// Imports
if (!code.includes('import TablePagination')) {
  code = code.replace(
    'TableHead, TableRow,',
    'TableHead, TableRow, TablePagination, Select, MenuItem, InputLabel, FormControl,'
  );
}

// Add JointDisplay Query
if (!code.includes('getJointDisplay')) {
  code = code.replace(
    'const { data: journals = [] } = useQuery({ queryKey: ["journals"], queryFn: () => mockApi.getJournals() });',
    `const { data: journals = [] } = useQuery({ queryKey: ["journals"], queryFn: () => mockApi.getJournals() });
  
  const { data: jointData = [] } = useQuery({
    queryKey: ["jointDisplay"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/data/joint-display", { headers: { "X-User-Role": "researcher" } });
        if (!res.ok) return [];
        const json = await res.json();
        return json.jointData || [];
      } catch (e) {
        return [];
      }
    }
  });
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const handleChangePage = (event: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const [jdStudentFilter, setJdStudentFilter] = useState("ALL");
`
  );
}

// Add Tab
if (!code.includes('label="Joint Display UI"')) {
  code = code.replace(
    '<Tab label="Data Export" />',
    '<Tab label="Data Export" />\n          <Tab label="Joint Display UI" />'
  );
}

// Add Tab Content
const jointDisplayTab = `
      {/* ━━ Joint Display UI ━━ */}
      {tab === 4 && (
        <Box>
          <Typography variant="h6" fontWeight="bold" mb={2}>Joint Display (Mixed-Methods Visualization)</Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            学生・週ごとに、SCATによる質的コーディング（定性）とAI・自己評価スコア（定量）を統合表示します。
          </Alert>

          <Box display="flex" gap={2} mb={2}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Student Filter</InputLabel>
              <Select value={jdStudentFilter} label="Student Filter" onChange={(e) => setJdStudentFilter(e.target.value)}>
                <MenuItem value="ALL">すべて</MenuItem>
                {Array.from(new Set(jointData.map((d:any) => d.student_id))).filter(Boolean).map((sid:any) => (
                  <MenuItem key={sid} value={sid}>{sid}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: "grey.100" }}>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Week</TableCell>
                  <TableCell>Segment Text</TableCell>
                  <TableCell>SCAT (Theme/Concept)</TableCell>
                  <TableCell align="right">AI Total</TableCell>
                  <TableCell align="right">Self Total</TableCell>
                  <TableCell>Memo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jointData
                  .filter((d:any) => jdStudentFilter === "ALL" || d.student_id === jdStudentFilter)
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{row.student_id}</TableCell>
                    <TableCell>{row.week_number}</TableCell>
                    <TableCell sx={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {row.text_content}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" display="block" color="primary">{row.step4_theme}</Typography>
                      <Typography variant="caption" display="block" color="textSecondary">{row.step3_concept}</Typography>
                    </TableCell>
                    <TableCell align="right">{row.ai_total_score?.toFixed(1) ?? "-"}</TableCell>
                    <TableCell align="right">{row.self_total_score?.toFixed(1) ?? "-"}</TableCell>
                    <TableCell sx={{ maxWidth: 150, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {row.memo}
                    </TableCell>
                  </TableRow>
                ))}
                {jointData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">データがありません</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={jointData.filter((d:any) => jdStudentFilter === "ALL" || d.student_id === jdStudentFilter).length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
      )}
`;

if (!code.includes('tab === 4')) {
  code = code.replace(
    '</Box>\n    </Box>\n  );\n}',
    `      ${jointDisplayTab}\n    </Box>\n  );\n}`
  );
}

fs.writeFileSync(file, code);
