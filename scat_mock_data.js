import { Database } from 'sqlite3';

const db = new Database('/home/user/webapp/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/8ba84620f49c0dfb5722f4640d04b6b668f45a05b38edb37ceb92040608be040.sqlite');

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function main() {
  try {
    const studentId = 'user-001';
    const journals = await all("SELECT id, entry_date, week_number FROM journal_entries WHERE student_id = ? ORDER BY entry_date ASC", [studentId]);
    
    if (journals.length === 0) {
      console.log('No journals found for user-001');
      return;
    }
    
    console.log(`Found ${journals.length} journals for user-001`);
    
    // elements configuration (simulation of extracted elements over weeks)
    const journalElementMap = [
      ['M2', 'M13', 'M15', 'M17'], // Week 1
      ['M1', 'M3', 'M10', 'M14'], // Week 2
      ['M4', 'M5', 'M6', 'M19'], // Week 3
      ['M7', 'M8', 'M11', 'M20'], // Week 4
      ['M9', 'M12', 'M16', 'M18'], // Week 5
    ];

    for (let i = 0; i < journals.length; i++) {
      const journal = journals[i];
      const runId = `run-${journal.id}`;
      
      await run("INSERT OR REPLACE INTO scat_runs (id, journal_id, student_id, run_date, status) VALUES (?, ?, ?, ?, ?)", 
        [runId, journal.id, studentId, new Date().toISOString(), 'completed']);
        
      const segId = `seg-${journal.id}-1`;
      await run("INSERT OR REPLACE INTO scat_segments (id, run_id, journal_id, segment_text, segment_order) VALUES (?, ?, ?, ?, ?)",
        [segId, runId, journal.id, "朝の会での様子から、児童が少し落ち着かない様子であることが分かった。そこで、静かに話しかけることで落ち着きを取り戻させた。", 1]);
        
      await run("INSERT OR REPLACE INTO scat_concepts (id, segment_id, code1, code2, code3, code4) VALUES (?, ?, ?, ?, ?, ?)",
        [`con-${segId}-1`, segId, "落ち着かない様子", "状況把握", "児童理解", "児童の状態に応じた柔軟な対応"]);
        
      const elements = journalElementMap[i % journalElementMap.length];
      
      for (const element of elements) {
        await run("INSERT OR REPLACE INTO scat_journal_elements (id, journal_id, element_code, present) VALUES (?, ?, ?, ?)",
          [`je-${journal.id}-${element}`, journal.id, element, 1]);
          
        const existingMastery = await get("SELECT mastered FROM scat_student_mastery WHERE student_id = ? AND element_code = ?", [studentId, element]);
        if (!existingMastery) {
          await run("INSERT INTO scat_student_mastery (id, student_id, element_code, mastered, first_journal_id, first_week_number) VALUES (?, ?, ?, ?, ?, ?)",
            [`sm-${studentId}-${element}`, studentId, element, 1, journal.id, journal.week_number]);
        }
      }
    }
    
    // Let's add a second student mock for SP table
    const studentId2 = 'user-002';
    const s2Elements = ['M1', 'M2', 'M3', 'M4', 'M13', 'M14'];
    for (const element of s2Elements) {
        await run("INSERT OR REPLACE INTO scat_student_mastery (id, student_id, element_code, mastered) VALUES (?, ?, ?, ?)",
        [`sm-${studentId2}-${element}`, studentId2, element, 1]);
    }
    
    console.log("Mock data inserted successfully");
  } catch(e) {
    console.error(e);
  } finally {
    db.close();
  }
}

main();
