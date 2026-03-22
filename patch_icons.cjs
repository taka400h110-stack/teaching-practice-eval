const fs = require('fs');
let file = fs.readFileSync('/home/user/webapp/src/components/AppLayout.tsx', 'utf8');

file = file.replace(/import ScienceIcon\s+from "@mui\/icons-material\/Science";/, `import ScienceIcon from "@mui/icons-material/Science";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import DescriptionIcon from "@mui/icons-material/Description";
import StorageIcon from "@mui/icons-material/Storage";
`);

file = file.replace(/<GroupIcon/g, '<GroupsIcon');

fs.writeFileSync('/home/user/webapp/src/components/AppLayout.tsx', file);
console.log("Patched AppLayout.tsx icons");
