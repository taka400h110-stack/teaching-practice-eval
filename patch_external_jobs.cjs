const fs = require('fs');

let c = fs.readFileSync('/home/user/webapp/src/api/routes/externalJobs.ts', 'utf8');
c = c.replace(/const id = crypto\.randomUUID\(\);/, 'const id = crypto.randomUUID();\n  console.log("Creating job with ID", id, "for user", user.id);');

// add try-catch block for debugging
c = c.replace(/const stmt = db\.prepare/, `try {\n    const stmt = db.prepare`);
c = c.replace(/return c\.json\(\{ success: true, job_id: id, message: "Job created. Awaiting external processing." \}\);/, `return c.json({ success: true, job_id: id, message: "Job created. Awaiting external processing." });\n  } catch (err: any) {\n    console.error("Job creation error:", err);\n    return c.json({ error: err.message }, 500);\n  }`);

fs.writeFileSync('/home/user/webapp/src/api/routes/externalJobs.ts', c);
