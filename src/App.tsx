import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import AppLayout from "./components/AppLayout";
import mockApi from "./api/client";

// ── ページ (lazy load) ──
const LoginPage               = lazy(() => import("./pages/LoginPage"));
const OnboardingPage          = lazy(() => import("./pages/OnboardingPage"));
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
const AdvancedAnalyticsPage   = lazy(() => import("./pages/AdvancedAnalyticsPage"));
// 個人
const SelfEvaluationPage      = lazy(() => import("./pages/SelfEvaluationPage"));
const GoalHistoryPage         = lazy(() => import("./pages/GoalHistoryPage"));
const ChatBotPage             = lazy(() => import("./pages/ChatBotPage"));
// ユーザー登録
const UserRegistrationPage    = lazy(() => import("./pages/UserRegistrationPage"));
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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (!mockApi.isAuthenticated()) return <Navigate to="/login" replace />;
  if (mockApi.requiresOnboarding()) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
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
          <Route path="dashboard"         element={<DashboardPage />} />
          <Route path="teacher-dashboard" element={<TeacherDashboardPage />} />
          <Route path="admin"             element={<AdminDashboardPage />} />

          {/* 日誌 */}
          <Route path="journals"                    element={<JournalListPage />} />
          <Route path="journals/new"                element={<JournalEditorPage />} />
          <Route path="journals/:journalId"         element={<JournalDetailPage />} />
          <Route path="journals/:journalId/edit"    element={<JournalEditorPage />} />

          {/* 実習ワークフロー（日誌+AI評価+チャット統合） */}
          <Route path="journal-workflow"              element={<JournalWorkflowPage />} />
          <Route path="journal-workflow/:journalId"   element={<JournalWorkflowPage />} />

          {/* 評価 (RQ2) */}
          <Route path="evaluations"                         element={<EvaluationsPage />} />
          <Route path="evaluations/:journalId"              element={<EvaluationResultPage />} />
          <Route path="evaluations/:journalId/human"        element={<HumanEvaluationPage />} />
          <Route path="comparison"                          element={<ComparisonPage />} />
          <Route path="reliability"                         element={<ReliabilityAnalysisPage />} />

          {/* 成長・分析 (RQ3) */}
          <Route path="growth"            element={<GrowthVisualizationPage />} />
          <Route path="longitudinal"      element={<LongitudinalAnalysisPage />} />
          <Route path="statistics"        element={<StatisticsPage />} />
          <Route path="advanced"          element={<AdvancedAnalyticsPage />} />
          <Route path="platform"          element={<PlatformAnalyticsPage />} />
          <Route path="cohorts"           element={<CohortsManagementPage />} />
          <Route path="scat"              element={<SCATAnalysisPage />} />

          {/* 個人 */}
          <Route path="self-evaluation"   element={<SelfEvaluationPage />} />
          <Route path="goals"             element={<GoalHistoryPage />} />
          <Route path="chat"              element={<ChatBotPage />} />

          {/* ユーザー登録 */}
          <Route path="register"          element={<UserRegistrationPage />} />

          {/* OCR読み込み */}
          <Route path="ocr"               element={<JournalOCRPage />} />

          {/* 教員統計 */}
          <Route path="teacher-statistics" element={<TeacherStatisticsPage />} />

          {/* 国際比較（RQ1） */}
          <Route path="international"     element={<InternationalComparisonPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
