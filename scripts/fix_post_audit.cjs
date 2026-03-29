const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/routes/data.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// goals post
const goalsPostTarget = `    await db.prepare(\`
      INSERT INTO goals (id, student_id, goal_type, goal_text, created_at, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    \`).bind(id, studentId, body.goal_type, body.goal_text, new Date().toISOString()).run();

    return c.json({ success: true, id });`;

const goalsPostReplacement = `    await db.prepare(\`
      INSERT INTO goals (id, student_id, goal_type, goal_text, created_at, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    \`).bind(id, studentId, body.goal_type, body.goal_text, new Date().toISOString()).run();

    setAuditWriteContext(c, {
      resourceType: 'goal',
      resourceId: id,
      targetStudentId: studentId,
      entityOwnerUserId: studentId,
      action: 'create',
      scopeBasis: 'self',
      changedFields: ['created'],
      afterState: { id, student_id: studentId, goal_type: body.goal_type },
      changeSummary: { operation: 'create' }
    });
    return c.json({ success: true, id });`;

if (content.includes(goalsPostTarget)) content = content.replace(goalsPostTarget, goalsPostReplacement);

// self evals post
const selfEvalsPostTarget = `    await db.prepare(\`
      INSERT INTO self_evaluations (id, student_id, week_number, rubric_item_id, self_score, comment, evaluated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    \`).bind(
      id, studentId, body.week_number, body.rubric_item_id, 
      body.self_score, body.comment || null, new Date().toISOString()
    ).run();

    return c.json({ success: true, id });`;

const selfEvalsPostReplacement = `    await db.prepare(\`
      INSERT INTO self_evaluations (id, student_id, week_number, rubric_item_id, self_score, comment, evaluated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    \`).bind(
      id, studentId, body.week_number, body.rubric_item_id, 
      body.self_score, body.comment || null, new Date().toISOString()
    ).run();

    setAuditWriteContext(c, {
      resourceType: 'self_evaluation',
      resourceId: id,
      targetStudentId: studentId,
      entityOwnerUserId: studentId,
      action: 'create',
      scopeBasis: 'self',
      changedFields: ['created'],
      afterState: { id, student_id: studentId, week_number: body.week_number, rubric_item_id: body.rubric_item_id, self_score: body.self_score },
      changeSummary: { operation: 'create' }
    });
    return c.json({ success: true, id });`;

if (content.includes(selfEvalsPostTarget)) content = content.replace(selfEvalsPostTarget, selfEvalsPostReplacement);

fs.writeFileSync(filePath, content);
console.log("Updated data.ts audit contexts");
