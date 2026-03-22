const fs = require('fs');

let clientTs = fs.readFileSync('/home/user/webapp/src/api/client.ts', 'utf8');

const newAuthCheck = `
  isAuthenticated: () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_info");
        return false;
      }
      return true;
    } catch(e) {
      return false;
    }
  },
`;

clientTs = clientTs.replace(
  'isAuthenticated: () => !!localStorage.getItem("auth_token"),',
  newAuthCheck
);

fs.writeFileSync('/home/user/webapp/src/api/client.ts', clientTs);
console.log('Updated isAuthenticated');
