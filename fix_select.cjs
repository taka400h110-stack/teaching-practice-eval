const fs = require('fs');
const file = '/home/user/webapp/src/pages/UserRegistrationPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldSelect = `<Select
                value={selectedRoles}
                label="役割"
                onChange={(e) => {
                  setSelectedRoles(e.target.value as UserRole);
                  setErrors({});
                }}
              >`;

const newSelect = `<Select
                multiple
                value={selectedRoles}
                label="役割"
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedRoles(typeof val === 'string' ? val.split(',') as UserRole[] : val as UserRole[]);
                  setErrors({});
                }}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as UserRole[]).map((value) => {
                      const cfg = ROLE_CONFIGS.find(r => r.role === value);
                      return cfg ? <Chip key={value} label={cfg.label} size="small" sx={{ bgcolor: cfg.color, color: "#fff", fontSize: 10, height: 20 }} /> : null;
                    })}
                  </Box>
                )}
              >`;

content = content.replace(oldSelect, newSelect);
fs.writeFileSync(file, content);
console.log("Fixed Select in UserRegistrationPage");
