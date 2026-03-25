const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');
const original = content;

// DashboardPage
content = content.replace(
  /<Route path="dashboard"(\s+)element={<DashboardPage \/>} \/>/,
  '<Route path="dashboard"$1element={<PrivateRoute allowedRoles={["student"]}><DashboardPage /></PrivateRoute>} />'
);

// TeacherDashboardPage
content = content.replace(
  /<Route path="teacher-dashboard"(\s+)element={<TeacherDashboardPage \/>} \/>/,
  '<Route path="teacher-dashboard"$1element={<PrivateRoute allowedRoles={["teacher", "univ_teacher", "school_mentor"]}><TeacherDashboardPage /></PrivateRoute>} />'
);

// Journals list
content = content.replace(
  /<Route path="journals"(\s+)element={<JournalListPage \/>} \/>/,
  '<Route path="journals"$1element={<PrivateRoute allowedRoles={["student", "teacher", "univ_teacher", "school_mentor"]}><JournalListPage /></PrivateRoute>} />'
);

// Journals new
content = content.replace(
  /<Route path="journals\/new"(\s+)element={<JournalEditorPage \/>} \/>/,
  '<Route path="journals/new"$1element={<PrivateRoute allowedRoles={["student"]}><JournalEditorPage /></PrivateRoute>} />'
);

// Journals id edit
content = content.replace(
  /<Route path="journals\/:journalId\/edit"(\s+)element={<JournalEditorPage \/>} \/>/,
  '<Route path="journals/:journalId/edit"$1element={<PrivateRoute allowedRoles={["student"]}><JournalEditorPage /></PrivateRoute>} />'
);

// Journals id 
content = content.replace(
  /<Route path="journals\/:journalId"(\s+)element={<JournalDetailPage \/>} \/>/,
  '<Route path="journals/:journalId"$1element={<PrivateRoute allowedRoles={["student", "teacher", "univ_teacher", "school_mentor"]}><JournalDetailPage /></PrivateRoute>} />'
);

// Journal workflow
content = content.replace(
  /<Route path="journal-workflow"(\s+)element={<JournalWorkflowPage \/>} \/>/,
  '<Route path="journal-workflow"$1element={<PrivateRoute allowedRoles={["student"]}><JournalWorkflowPage /></PrivateRoute>} />'
);

content = content.replace(
  /<Route path="journal-workflow\/:journalId"(\s+)element={<JournalWorkflowPage \/>} \/>/,
  '<Route path="journal-workflow/:journalId"$1element={<PrivateRoute allowedRoles={["student"]}><JournalWorkflowPage /></PrivateRoute>} />'
);

// Growth
content = content.replace(
  /<Route path="growth"(\s+)element={<GrowthVisualizationPage \/>} \/>/,
  '<Route path="growth"$1element={<PrivateRoute allowedRoles={["student"]}><GrowthVisualizationPage /></PrivateRoute>} />'
);

// Self eval
content = content.replace(
  /<Route path="self-evaluation"(\s+)element={<SelfEvaluationPage \/>} \/>/,
  '<Route path="self-evaluation"$1element={<PrivateRoute allowedRoles={["student"]}><SelfEvaluationPage /></PrivateRoute>} />'
);

// Goals
content = content.replace(
  /<Route path="goals"(\s+)element={<GoalHistoryPage \/>} \/>/,
  '<Route path="goals"$1element={<PrivateRoute allowedRoles={["student"]}><GoalHistoryPage /></PrivateRoute>} />'
);

// Chat
content = content.replace(
  /<Route path="chat"(\s+)element={<ChatBotPage \/>} \/>/,
  '<Route path="chat"$1element={<PrivateRoute allowedRoles={["student"]}><ChatBotPage /></PrivateRoute>} />'
);

// OCR
content = content.replace(
  /<Route path="ocr"(\s+)element={<JournalOCRPage \/>} \/>/,
  '<Route path="ocr"$1element={<PrivateRoute allowedRoles={["student"]}><JournalOCRPage /></PrivateRoute>} />'
);

// Evaluations
content = content.replace(
  /<Route path="evaluations\/:journalId"(\s+)element={<EvaluationResultPage \/>} \/>/,
  '<Route path="evaluations/:journalId"$1element={<PrivateRoute allowedRoles={["evaluator", "researcher", "admin", "collaborator", "board_observer", "student", "teacher", "univ_teacher", "school_mentor"]}><EvaluationResultPage /></PrivateRoute>} />'
);

content = content.replace(
  /<Route path="evaluations\/:journalId\/human"(\s+)element={<HumanEvaluationPage \/>} \/>/,
  '<Route path="evaluations/:journalId/human"$1element={<PrivateRoute allowedRoles={["evaluator", "researcher", "admin", "collaborator", "board_observer"]}><HumanEvaluationPage /></PrivateRoute>} />'
);

content = content.replace(
  /<Route path="comparison"(\s+)element={<ComparisonPage \/>} \/>/,
  '<Route path="comparison"$1element={<PrivateRoute allowedRoles={["evaluator", "researcher", "admin", "collaborator", "board_observer"]}><ComparisonPage /></PrivateRoute>} />'
);

content = content.replace(
  /<Route path="reliability"(\s+)element={<ReliabilityAnalysisPage \/>} \/>/,
  '<Route path="reliability"$1element={<PrivateRoute allowedRoles={["evaluator", "researcher", "admin", "collaborator", "board_observer"]}><ReliabilityAnalysisPage /></PrivateRoute>} />'
);

// Stats & Cohorts
content = content.replace(
  /<Route path="cohorts"(\s+)element={<CohortsManagementPage \/>} \/>/,
  '<Route path="cohorts"$1element={<PrivateRoute allowedRoles={["teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]}><CohortsManagementPage /></PrivateRoute>} />'
);

content = content.replace(
  /<Route path="statistics"(\s+)element={<StatisticsPage \/>} \/>/,
  '<Route path="statistics"$1element={<PrivateRoute allowedRoles={["teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]}><StatisticsPage /></PrivateRoute>} />'
);

content = content.replace(
  /<Route path="teacher-statistics"(\s+)element={<TeacherStatisticsPage \/>} \/>/,
  '<Route path="teacher-statistics"$1element={<PrivateRoute allowedRoles={["teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]}><TeacherStatisticsPage /></PrivateRoute>} />'
);

// Advanced / Research Only
content = content.replace(
  /<Route path="longitudinal"(\s+)element={<LongitudinalAnalysisPage \/>} \/>/,
  '<Route path="longitudinal"$1element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><LongitudinalAnalysisPage /></PrivateRoute>} />'
);

content = content.replace(
  /<Route path="scat"(\s+)element={<SCATAnalysisPage \/>} \/>/,
  '<Route path="scat"$1element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATAnalysisPage /></PrivateRoute>} />'
);

content = content.replace(
  /<Route path="advanced-analytics"(\s+)element={<AdvancedAnalyticsPage \/>} \/>/,
  '<Route path="advanced-analytics"$1element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><AdvancedAnalyticsPage /></PrivateRoute>} />'
);

content = content.replace(
  /<Route path="international"(\s+)element={<InternationalComparisonPage \/>} \/>/,
  '<Route path="international"$1element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><InternationalComparisonPage /></PrivateRoute>} />'
);


fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx patched. Diff chars:', content.length - original.length);

