import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import AppLayout from "./components/AppLayout";
import mockApi from "./api/client";

// lazy load pages
const LoginPage               = lazy(() => import("./pages/LoginPage"));
const OnboardingPage          = lazy(() => import("./pages/OnboardingPage"));
const DashboardPage           = lazy(() => import("./pages/DashboardPage"));
const TeacherDashboardPage    = lazy(() => import("./pages/TeacherDashboardPage"));
const AdminDashboardPage      = lazy(() => import("./pages/AdminDashboardPage"));
const JournalListPage         = lazy(() => import("./pages/JournalListPage"));
const JournalEditorPage       = lazy(() => import("./pages/JournalEditorPage"));
const JournalDetailPage       = lazy(() => import("./pages/JournalDetailPage"));
const EvaluationResultPage    = lazy(() => import("./pages/EvaluationResultPage"));
const EvaluationsPage         = lazy(() => import("./pages/EvaluationsPage"));
const HumanEvaluationPage     = lazy(() => import("./pages/HumanEvaluationPage"));
const ComparisonPage          = lazy(() => import("./pages/ComparisonPage"));
const GrowthVisualizationPage = lazy(() => import("./pages/GrowthVisualizationPage"));
const LongitudinalAnalysisPage= lazy(() => import("./pages/LongitudinalAnalysisPage"));
const AdvancedAnalysisPage    = lazy(() => import("./pages/AdvancedAnalysisPage"));
const StatisticsPage          = lazy(() => import("./pages/StatisticsPage"));
const TeacherStatisticsPage   = lazy(() => import("./pages/TeacherStatisticsPage"));
const CohortsManagementPage   = lazy(() => import("./pages/CohortsManagementPage"));
const Paper2AnalysisPage      = lazy(() => import("./pages/Paper2AnalysisPage"));
const SCATAnalysisPage        = lazy(() => import("./pages/SCATAnalysisPage"));
const ReliabilityAnalysisPage = lazy(() => import("./pages/ReliabilityAnalysisPage"));
const SelfEvaluationPage      = lazy(() => import("./pages/SelfEvaluationPage"));
const LpsDashboardPage        = lazy(() => import("./pages/LpsDashboardPage"));
const GoalHistoryPage         = lazy(() => import("./pages/GoalHistoryPage"));
const ChatBotPage             = lazy(() => import("./pages/ChatBotPage"));

const Spinner = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
    <CircularProgress />
  </Box>
);

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (!mockApi.isAuthenticated()) return <Navigate to="/login" replace />;
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
          <Route path="dashboard"              element={<DashboardPage />} />
          <Route path="teacher-dashboard"      element={<TeacherDashboardPage />} />
          <Route path="admin"                  element={<AdminDashboardPage />} />
          {/* 日誌 */}
          <Route path="journals"               element={<JournalListPage />} />
          <Route path="journals/new"           element={<JournalEditorPage />} />
          <Route path="journals/:journalId"    element={<JournalDetailPage />} />
          <Route path="journals/:journalId/edit" element={<JournalEditorPage />} />
          {/* 評価 */}
          <Route path="evaluations"            element={<EvaluationsPage />} />
          <Route path="evaluations/:journalId" element={<EvaluationResultPage />} />
          <Route path="evaluations/:journalId/human" element={<HumanEvaluationPage />} />
          <Route path="comparison"             element={<ComparisonPage />} />
          {/* 分析 */}
          <Route path="growth"                 element={<GrowthVisualizationPage />} />
          <Route path="longitudinal"           element={<LongitudinalAnalysisPage />} />
          <Route path="advanced-analysis"      element={<AdvancedAnalysisPage />} />
          <Route path="statistics"             element={<StatisticsPage />} />
          <Route path="teacher-statistics"     element={<TeacherStatisticsPage />} />
          <Route path="cohorts"                element={<CohortsManagementPage />} />
          <Route path="paper2"                 element={<Paper2AnalysisPage />} />
          <Route path="scat"                   element={<SCATAnalysisPage />} />
          <Route path="reliability"            element={<ReliabilityAnalysisPage />} />
          {/* 個人 */}
          <Route path="self-evaluation"        element={<SelfEvaluationPage />} />
          <Route path="lps"                    element={<LpsDashboardPage />} />
          <Route path="goals"                  element={<GoalHistoryPage />} />
          <Route path="chat"                   element={<ChatBotPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
