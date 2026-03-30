const fs = require('fs');

async function main() {
  const sqlCommands = [];
  
  // mock user-001 journals (assuming IDs from earlier)
  const jIds = [
    'f69ba75e-36a8-4c58-ab04-2eb9e62257b6', 
    'e94692f1-8bad-4b2a-a7b6-3c6d0f60d4ce', 
    'f6e11172-8ce8-43e1-9273-be9ab74388b9', 
    'c7befbc3-e41d-4d38-8000-98b387c0eea9', 
    '7a3f4126-f4b3-4060-8e43-c4c7c08f7482'
  ];
  
  const studentId = 'user-001';
  
  const journalElementMap = [
      ['M2', 'M13', 'M15', 'M17'], // Week 1
      ['M1', 'M3', 'M10', 'M14'], // Week 2
      ['M4', 'M5', 'M6', 'M19'], // Week 3
      ['M7', 'M8', 'M11', 'M20'], // Week 4
      ['M9', 'M12', 'M16', 'M18'], // Week 5
  ];
  
  for (let i = 0; i < jIds.length; i++) {
    const jId = jIds[i];
    const elements = journalElementMap[i];
    const weekNumber = i + 1;
    
    const runId = `run-${jId}`;
    sqlCommands.push(`INSERT OR REPLACE INTO scat_runs (id, journal_id, student_id, status) VALUES ('${runId}', '${jId}', '${studentId}', 'completed');`);
    
    const segId = `seg-${jId}-1`;
    sqlCommands.push(`INSERT OR REPLACE INTO scat_segments (id, run_id, journal_id, segment_text, segment_order) VALUES ('${segId}', '${runId}', '${jId}', '朝の会での様子から、児童が少し落ち着かない様子であることが分かった。そこで、静かに話しかけることで落ち着きを取り戻させた。', 1);`);
    
    sqlCommands.push(`INSERT OR REPLACE INTO scat_concepts (id, segment_id, code1, code2, code3, code4) VALUES ('con-${segId}-1', '${segId}', '落ち着かない様子', '状況把握', '児童理解', '児童の状態に応じた柔軟な対応');`);
    
    for (const el of elements) {
      sqlCommands.push(`INSERT OR REPLACE INTO scat_journal_elements (id, journal_id, element_code, present) VALUES ('je-${jId}-${el}', '${jId}', '${el}', 1);`);
      sqlCommands.push(`INSERT OR IGNORE INTO scat_student_mastery (id, student_id, element_code, mastered, first_journal_id, first_week_number) VALUES ('sm-${studentId}-${el}', '${studentId}', '${el}', 1, '${jId}', ${weekNumber});`);
    }
  }
  
  // Student 2 mock
  const studentId2 = 'user-002';
  const s2Elements = ['M1', 'M2', 'M3', 'M4', 'M13', 'M14'];
  for (const el of s2Elements) {
    sqlCommands.push(`INSERT OR REPLACE INTO scat_student_mastery (id, student_id, element_code, mastered) VALUES ('sm-${studentId2}-${el}', '${studentId2}', '${el}', 1);`);
  }
  
  fs.writeFileSync('/home/user/webapp/scat_mock_data.sql', sqlCommands.join('\n'), 'utf8');
}

main();
