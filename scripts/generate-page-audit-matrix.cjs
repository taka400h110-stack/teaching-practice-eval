const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../src/pages');
const pages = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx') && !f.includes('.patch'));

// app.tsx と appLayout.tsx を静的解析するのは大変なので、定義ベースで静的に出力する
const routes = [
  { path: '/dashboard', component: 'DashboardPage', roles: ['student'] },
  { path: '/teacher-dashboard', component: 'TeacherDashboardPage', roles: ['teacher', 'univ_teacher', 'school_mentor'] },
  { path: '/admin', component: 'AdminDashboardPage', roles: ['admin', 'researcher'] },
  { path: '/journals', component: 'JournalListPage', roles: ['student', 'teacher', 'univ_teacher', 'school_mentor'] },
  { path: '/journals/new', component: 'JournalEditorPage', roles: ['student'] },
  { path: '/journals/:journalId', component: 'JournalDetailPage', roles: ['student', 'teacher', 'univ_teacher', 'school_mentor'] },
  { path: '/journal-workflow', component: 'JournalWorkflowPage', roles: ['student'] },
  { path: '/evaluations', component: 'EvaluationsPage', roles: ['admin', 'researcher', 'evaluator', 'teacher', 'univ_teacher', 'school_mentor'] },
  { path: '/evaluations/:journalId', component: 'EvaluationResultPage', roles: ['evaluator', 'researcher', 'admin', 'collaborator', 'board_observer', 'student', 'teacher', 'univ_teacher', 'school_mentor'] },
  { path: '/comparison', component: 'ComparisonPage', roles: ['evaluator', 'researcher', 'admin', 'collaborator', 'board_observer'] },
  { path: '/reliability', component: 'ReliabilityAnalysisPage', roles: ['evaluator', 'researcher', 'admin', 'collaborator', 'board_observer'] },
  { path: '/growth', component: 'GrowthVisualizationPage', roles: ['student'] },
  { path: '/longitudinal', component: 'LongitudinalAnalysisPage', roles: ['researcher', 'admin', 'collaborator', 'board_observer'] },
  { path: '/statistics', component: 'StatisticsPage', roles: ['teacher', 'univ_teacher', 'school_mentor', 'researcher', 'admin', 'collaborator', 'board_observer'] },
  { path: '/advanced-analytics', component: 'AdvancedAnalyticsPage', roles: ['researcher', 'admin', 'collaborator', 'board_observer'] },
  { path: '/platform-analytics', component: 'PlatformAnalyticsPage', roles: ['admin', 'researcher'] },
  { path: '/cohorts', component: 'CohortsManagementPage', roles: ['teacher', 'univ_teacher', 'school_mentor', 'researcher', 'admin', 'collaborator', 'board_observer'] },
  { path: '/scat', component: 'SCATAnalysisPage', roles: ['researcher', 'admin', 'collaborator', 'board_observer'] },
  { path: '/exports', component: 'ExportsPage', roles: ['researcher', 'collaborator', 'board_observer', 'admin'] },
  { path: '/admin/exports', component: 'AdminExportsPage', roles: ['admin'] },
  { path: '/self-evaluation', component: 'SelfEvaluationPage', roles: ['student'] },
  { path: '/goals', component: 'GoalHistoryPage', roles: ['student'] },
  { path: '/chat', component: 'ChatBotPage', roles: ['student'] },
  { path: '/register', component: 'UserRegistrationPage', roles: ['admin'] },
  { path: '/ocr', component: 'JournalOCRPage', roles: ['student'] },
  { path: '/teacher-statistics', component: 'TeacherStatisticsPage', roles: ['teacher', 'univ_teacher', 'school_mentor', 'researcher', 'admin', 'collaborator', 'board_observer'] },
  { path: '/international', component: 'InternationalComparisonPage', roles: ['researcher', 'admin', 'collaborator', 'board_observer'] },
  { path: '/login', component: 'LoginPage', roles: ['all'] },
  { path: '/onboarding', component: 'OnboardingPage', roles: ['all'] },
];

const menuLinks = [
  '/dashboard', '/journal-workflow', '/ocr', '/journals', '/chat', '/self-evaluation', '/growth', '/goals', // student
  '/teacher-dashboard', '/journals', '/cohorts', '/statistics', // teacher
  '/admin', '/evaluations', '/comparison', '/reliability', '/longitudinal', '/scat', '/advanced-analytics', '/exports', // researcher
  '/platform-analytics', '/register', '/admin/exports' // admin
];

let md = `# Role UI Audit Matrix\n\n`;
md += `| Page | Route | Student | Teacher | Admin | Has Menu |\n`;
md += `|---|---|---|---|---|---|\n`;

pages.forEach(page => {
  const pageName = page.replace('.tsx', '');
  const routeMatches = routes.filter(r => r.component === pageName);
  
  if (routeMatches.length === 0) {
    md += `| ${pageName} | Orphan | - | - | - | - |\n`;
  } else {
    routeMatches.forEach(route => {
      const isStudent = route.roles.includes('student') || route.roles.includes('all') ? '○' : '×';
      const isTeacher = route.roles.includes('teacher') || route.roles.includes('univ_teacher') || route.roles.includes('all') ? '○' : '×';
      const isAdmin = route.roles.includes('admin') || route.roles.includes('all') ? '○' : '×';
      const hasMenu = menuLinks.includes(route.path) ? '○' : '×';
      
      md += `| ${pageName} | ${route.path} | ${isStudent} | ${isTeacher} | ${isAdmin} | ${hasMenu} |\n`;
    });
  }
});

fs.writeFileSync(path.join(__dirname, '../docs/checklists/role-ui-audit-matrix.md'), md);
console.log('Matrix generated');
