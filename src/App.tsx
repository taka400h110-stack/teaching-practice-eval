import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import AppLayout from "./components/AppLayout";
import mockApi from "./api/client";

// lazy load pages
const LoginPage             = lazy(() => import("./pages/LoginPage"));
const DashboardPage         = lazy(() => import("./pages/DashboardPage"));
const JournalListPage       = lazy(() => import("./pages/JournalListPage"));
const JournalEditorPage     = lazy(() => import("./pages/JournalEditorPage"));
const JournalDetailPage     = lazy(() => import("./pages/JournalDetailPage"));
const EvaluationResultPage  = lazy(() => import("./pages/EvaluationResultPage"));
const GrowthVisualizationPage = lazy(() => import("./pages/GrowthVisualizationPage"));
const SelfEvaluationPage    = lazy(() => import("./pages/SelfEvaluationPage"));
const LpsDashboardPage      = lazy(() => import("./pages/LpsDashboardPage"));
const GoalHistoryPage       = lazy(() => import("./pages/GoalHistoryPage"));
const ChatBotPage           = lazy(() => import("./pages/ChatBotPage"));

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
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"            element={<DashboardPage />} />
          <Route path="journals"             element={<JournalListPage />} />
          <Route path="journals/new"         element={<JournalEditorPage />} />
          <Route path="journals/:journalId"  element={<JournalDetailPage />} />
          <Route path="journals/:journalId/edit" element={<JournalEditorPage />} />
          <Route path="evaluations/:journalId"   element={<EvaluationResultPage />} />
          <Route path="growth"               element={<GrowthVisualizationPage />} />
          <Route path="self-evaluation"      element={<SelfEvaluationPage />} />
          <Route path="lps"                  element={<LpsDashboardPage />} />
          <Route path="goals"                element={<GoalHistoryPage />} />
          <Route path="chat"                 element={<ChatBotPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
