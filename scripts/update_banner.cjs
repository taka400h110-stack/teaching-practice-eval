const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/admin/CleanupFailureAlertBanner.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('CleanupAlertAssigneeSelect')) {
  // Add imports
  content = content.replace(
    "import { dismissCleanupFailureAlert, acknowledgeCleanupFailureAlert } from '../../api/client';",
    `import { dismissCleanupFailureAlert, acknowledgeCleanupFailureAlert } from '../../api/client';
import { CleanupAlertAssigneeSelect } from './CleanupAlertAssigneeSelect';
import { CleanupAlertEscalationTimeline } from './CleanupAlertEscalationTimeline';
import { CleanupAlertEscalationBadge } from './CleanupAlertEscalationBadge';
import { CleanupAlertCommentsList } from './CleanupAlertCommentsList';
import { useCleanupAlertEscalations } from '../../hooks/useCleanupAlertEscalations';`
  );
  
  // Add state for details collapse
  content = content.replace(
    'const [ackTargetStatus, setAckTargetStatus] = useState<"acknowledged" | "investigating" | "resolved" | null>(null);',
    `const [ackTargetStatus, setAckTargetStatus] = useState<"acknowledged" | "investigating" | "resolved" | null>(null);
  const [showDetails, setShowDetails] = useState(false);`
  );

  // Use hook for escalation inside component
  content = content.replace(
    'const queryClient = useQueryClient();',
    `const queryClient = useQueryClient();
  const { data: escalations } = useCleanupAlertEscalations(alert.fingerprint);
  const latestEscalation = escalations && escalations.length > 0 ? escalations[0] : null;`
  );

  // Update AlertTitle
  content = content.replace(
    '<Stack direction="row" spacing={2} alignItems="center">',
    `<Stack direction="row" spacing={2} alignItems="center">
              {latestEscalation && (
                <CleanupAlertEscalationBadge level={latestEscalation.level} status={latestEscalation.status} />
              )}`
  );

  // Update inner content
  const detailsContent = `
          {alert.acknowledgment?.exists && (
            <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="caption" display="block">
                  Acknowledged by {alert.acknowledgment.acknowledgedByUserId} at {new Date(alert.acknowledgment.acknowledgedAt!).toLocaleString()}
                </Typography>
                <CleanupAlertAssigneeSelect 
                  fingerprint={alert.fingerprint!} 
                  currentAssignee={alert.acknowledgment.assigneeUserId || null} 
                />
              </Stack>
              {alert.acknowledgment.note && (
                <Typography variant="caption" display="block">
                  Note: {alert.acknowledgment.note}
                </Typography>
              )}
            </Box>
          )}

          <Collapse in={showDetails}>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #eee' }}>
              <CleanupAlertEscalationTimeline fingerprint={alert.fingerprint!} />
              <CleanupAlertCommentsList fingerprint={alert.fingerprint!} />
            </Box>
          </Collapse>
`;
  
  content = content.replace(
    /\{alert\.acknowledgment\?\.exists && \([\s\S]*?\}\)\}/,
    detailsContent
  );

  content = content.replace(
    '詳細を見る\n            </Button>',
    `詳細を見る\n            </Button>
            <Button size="small" variant="outlined" color="inherit" onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? 'Hide Details' : 'Show History & Comments'}
            </Button>`
  );

  fs.writeFileSync(filePath, content);
  console.log('Updated CleanupFailureAlertBanner.tsx');
}
