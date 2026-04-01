import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CircularProgress, Box, Typography } from "@mui/material";
import AppLayout from "./components/AppLayout";
import apiClient from "./api/client";

// ── ページ (lazy load) ──
const ExportsPage             = lazy(() => import("./pages/ExportsPage"));
const AdminExportsPage        = lazy(() => import("./pages/AdminExportsPage"));

const LoginPage               = lazy(() => import("./pages/LoginPage"));
// 実習生
const DashboardPage           = lazy(() => import("./pages/DashboardPage"));
// 教員・メンター・評価者
const TeacherDashboardPage    = lazy(() => import("./pages/TeacherDashboardPage"));
// 管理者・研究者
const AdminDashboardPage      = lazy(() => import("./pages/AdminDashboardPage"));
// 日誌
const JournalListPage         = lazy(() => import("./pages/JournalListPage"));
const JournalEditorPage       = lazy(() => import("./pages/JournalEditorPage"));
const JournalDetailPage       = lazy(() => import("./pages/JournalDetailPage"));
const JournalWorkflowPage     = lazy(() => import("./pages/JournalWorkflowPage"));
// 評価 (RQ2)
const EvaluationResultPage    = lazy(() => import("./pages/EvaluationResultPage"));
const EvaluationsPage         = lazy(() => import("./pages/EvaluationsPage"));
const HumanEvaluationPage     = lazy(() => import("./pages/HumanEvaluationPage"));
const ComparisonPage          = lazy(() => import("./pages/ComparisonPage"));
const ReliabilityAnalysisPage = lazy(() => import("./pages/ReliabilityAnalysisPage"));
// 成長・分析 (RQ3)
const GrowthVisualizationPage = lazy(() => import("./pages/GrowthVisualizationPage"));
const LongitudinalAnalysisPage= lazy(() => import("./pages/LongitudinalAnalysisPage"));
const PlatformAnalyticsPage   = lazy(() => import("./pages/PlatformAnalyticsPage"));
const StatisticsPage          = lazy(() => import("./pages/StatisticsPage"));
const CohortsManagementPage   = lazy(() => import("./pages/CohortsManagementPage"));
const SCATAnalysisPage        = lazy(() => import("./pages/SCATAnalysisPage"));
const SCATBatchAnalysisPage   = lazy(() => import("./pages/SCATBatchAnalysisPage"));
const SCATNetworkAnalysisPage = lazy(() => import("./pages/SCATNetworkAnalysisPage"));
const SCATTimelinePage        = lazy(() => import("./pages/SCATTimelinePage"));
const AdvancedAnalyticsPage   = lazy(() => import("./pages/AdvancedAnalyticsPage"));
// 個人
const SelfEvaluationPage      = lazy(() => import("./pages/SelfEvaluationPage"));
const GoalHistoryPage         = lazy(() => import("./pages/GoalHistoryPage"));
const ChatBotPage             = lazy(() => import("./pages/ChatBotPage"));
// ユーザー登録
const UserRegistrationPage    = lazy(() => import("./pages/UserRegistrationPage"));
// Analysis Pages
const JournalSCATPage         = lazy(() => import("./pages/analysis/JournalSCATPage"));
const JournalISMPage          = lazy(() => import("./pages/analysis/JournalISMPage"));
const JournalSPTablePage      = lazy(() => import("./pages/analysis/JournalSPTablePage"));
const JournalTransmissionPage = lazy(() => import("./pages/analysis/JournalTransmissionPage"));

// OCR
const JournalOCRPage          = lazy(() => import("./pages/JournalOCRPage"));
// 教員統計
const TeacherStatisticsPage   = lazy(() => import("./pages/TeacherStatisticsPage"));
// 国際比較
const InternationalComparisonPage = lazy(() => import("./pages/InternationalComparisonPage"));

const Spinner = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
    <CircularProgress />
  </Box>
);

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  if (!apiClient.isAuthenticated()) return <Navigate to="/login" replace />;
    
  if (allowedRoles && allowedRoles.length > 0) {
    const user = apiClient.getCurrentUser();
    // 下位互換対応
    const userRoles = (user as any)?.roles || [(user as any)?.role || "student"];
    const hasRole = userRoles.some((r: string) => allowedRoles.includes(r));
    if (!user || !hasRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
                <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* ダッシュボード */}
          <Route path="dashboard"         element={<PrivateRoute allowedRoles={["student"]}><DashboardPage /></PrivateRoute>} />
          <Route path="teacher-dashboard" element={<PrivateRoute allowedRoles={["teacher", "univ_teacher", "school_mentor"]}><TeacherDashboardPage /></PrivateRoute>} />
          <Route path="admin"             element={<PrivateRoute allowedRoles={["admin", "researcher"]}><AdminDashboardPage /></PrivateRoute>} />

          {/* 日誌 */}
          <Route path="journals"                    element={<PrivateRoute allowedRoles={["student", "teacher", "univ_teacher", "school_mentor"]}><JournalListPage /></PrivateRoute>} />
          <Route path="journals/new"                element={<PrivateRoute allowedRoles={["student"]}><JournalEditorPage /></PrivateRoute>} />
          <Route path="journals/:journalId"         element={<PrivateRoute allowedRoles={["student", "teacher", "univ_teacher", "school_mentor"]}><JournalDetailPage /></PrivateRoute>} />
          <Route path="journals/:journalId/edit"    element={<PrivateRoute allowedRoles={["student"]}><JournalEditorPage /></PrivateRoute>} />

          {/* 実習ワークフロー（日誌+AI評価+チャット統合） */}
          <Route path="journal-workflow"              element={<PrivateRoute allowedRoles={["student"]}><JournalWorkflowPage /></PrivateRoute>} />
          <Route path="journal-workflow/:journalId"   element={<PrivateRoute allowedRoles={["student"]}><JournalWorkflowPage /></PrivateRoute>} />

          {/* 評価 (RQ2) */}
          <Route path="evaluations"                         element={<PrivateRoute allowedRoles={["admin", "researcher", "evaluator", "teacher", "univ_teacher", "school_mentor"]}><EvaluationsPage /></PrivateRoute>} />
          <Route path="evaluations/:journalId"              element={<PrivateRoute allowedRoles={["evaluator", "researcher", "admin", "collaborator", "board_observer", "student", "teacher", "univ_teacher", "school_mentor"]}><EvaluationResultPage /></PrivateRoute>} />
          <Route path="evaluations/:journalId/human"        element={<PrivateRoute allowedRoles={["evaluator", "researcher", "admin", "collaborator", "board_observer"]}><HumanEvaluationPage /></PrivateRoute>} />
          <Route path="comparison"                          element={<PrivateRoute allowedRoles={["evaluator", "researcher", "admin", "collaborator", "board_observer"]}><ComparisonPage /></PrivateRoute>} />
          <Route path="reliability"                         element={<PrivateRoute allowedRoles={["evaluator", "researcher", "admin", "collaborator", "board_observer"]}><ReliabilityAnalysisPage /></PrivateRoute>} />

          {/* 成長・分析 (RQ3) */}
          <Route path="growth"            element={<PrivateRoute allowedRoles={["student"]}><GrowthVisualizationPage /></PrivateRoute>} />
          <Route path="longitudinal"      element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><LongitudinalAnalysisPage /></PrivateRoute>} />
          <Route path="statistics"        element={<PrivateRoute allowedRoles={["teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]}><StatisticsPage /></PrivateRoute>} />
          <Route path="advanced-analytics"          element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><AdvancedAnalyticsPage /></PrivateRoute>} />
          <Route path="platform-analytics"          element={<PrivateRoute allowedRoles={["admin", "researcher"]}><PlatformAnalyticsPage /></PrivateRoute>} />
          <Route path="cohorts"           element={<PrivateRoute allowedRoles={["teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]}><CohortsManagementPage /></PrivateRoute>} />
          <Route path="scat"              element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATAnalysisPage /></PrivateRoute>} />
          <Route path="scat-batch"        element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATBatchAnalysisPage /></PrivateRoute>} />
          <Route path="scat-network"      element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATNetworkAnalysisPage /></PrivateRoute>} />
          <Route path="scat-timeline"     element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATTimelinePage /></PrivateRoute>} />
                              
          
          {/* エクスポート */}
          <Route path="exports"           element={<PrivateRoute allowedRoles={["researcher", "collaborator", "board_observer", "admin"]}><ExportsPage /></PrivateRoute>} />
          <Route path="admin/exports"     element={<PrivateRoute allowedRoles={["admin"]}><AdminExportsPage /></PrivateRoute>} />

          
          {/* Analysis Pages */}
          <Route path="research/journals/:journalId/scat" element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><JournalSCATPage /></PrivateRoute>} />
          <Route path="research/journals/:journalId/ism" element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><JournalISMPage /></PrivateRoute>} />
          <Route path="research/journals/:journalId/sp-table" element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><JournalSPTablePage /></PrivateRoute>} />
          <Route path="research/journals/:journalId/transmission" element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><JournalTransmissionPage /></PrivateRoute>} />

          {/* 個人 */}
          <Route path="self-evaluation"   element={<PrivateRoute allowedRoles={["student"]}><SelfEvaluationPage /></PrivateRoute>} />
          <Route path="goals"             element={<PrivateRoute allowedRoles={["student"]}><GoalHistoryPage /></PrivateRoute>} />
          <Route path="chat"              element={<PrivateRoute allowedRoles={["student"]}><ChatBotPage /></PrivateRoute>} />

          {/* ユーザー登録 */}
          <Route path="register"          element={<PrivateRoute allowedRoles={["admin"]}><UserRegistrationPage /></PrivateRoute>} />

          {/* OCR読み込み */}
          <Route path="ocr"               element={<PrivateRoute allowedRoles={["student"]}><JournalOCRPage /></PrivateRoute>} />

          {/* 教員統計 */}
          <Route path="teacher-statistics" element={<PrivateRoute allowedRoles={["teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]}><TeacherStatisticsPage /></PrivateRoute>} />

          {/* 国際比較（RQ1） */}
          <Route path="international"     element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><InternationalComparisonPage /></PrivateRoute>} />
        </Route>
        <Route path="unauthorized" element={<Box p={4}><Typography variant="h5" color="error">アクセス権限がありません (403)</Typography><Typography>このページへのアクセス権限がありません。</Typography></Box>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
