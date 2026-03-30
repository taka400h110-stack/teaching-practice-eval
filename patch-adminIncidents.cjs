const fs = require('fs');
const file = '/home/user/webapp/src/api/routes/adminIncidents.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('try {')) {
  code = code.replace(/const incidents = await getIncidentsForAlert\(c\.env, fingerprint\);\n  return c\.json\(\{ incidents \}\);/, `try {\n    const incidents = await getIncidentsForAlert(c.env, fingerprint);\n    return c.json({ incidents });\n  } catch (error) {\n    console.error('Error fetching incidents:', error);\n    return c.json({ incidents: [] }, 200);\n  }`);

  code = code.replace(/const success = await triggerIncident\(c\.env, body\);\n  return c\.json\(\{ success \}\);/, `try {\n    const success = await triggerIncident(c.env, body);\n    return c.json({ success });\n  } catch (error) {\n    console.error('Error triggering incident:', error);\n    return c.json({ success: false, error: 'Internal server error' }, 500);\n  }`);

  code = code.replace(/const success = await resolveIncident\(c\.env, body\);\n  return c\.json\(\{ success \}\);/, `try {\n    const success = await resolveIncident(c.env, body);\n    return c.json({ success });\n  } catch (error) {\n    console.error('Error resolving incident:', error);\n    return c.json({ success: false, error: 'Internal server error' }, 500);\n  }`);

  fs.writeFileSync(file, code);
}
