import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginScreen } from './features/auth/LoginScreen';
import { RegisterScreen } from './features/auth/RegisterScreen';
import { ForgotPasswordScreen } from './features/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from './features/auth/ResetPasswordScreen';
import { VerifyEmailScreen } from './features/auth/VerifyEmailScreen';
import { AccountScreen } from './features/account/AccountScreen';
import { OverviewScreen } from './features/overview/OverviewScreen';
import { InsightsScreen } from './features/insights/InsightsScreen';
import { IntelligenceScreen } from './features/intelligence/IntelligenceScreen';
import { DecisionsScreen } from './features/decisions/DecisionsScreen';
import { DatasetManagementScreen } from './features/datasets/DatasetManagementScreen';
import { AssistantScreen } from './features/assistant/AssistantScreen';
import { InteractiveMapScreen } from './features/regions/InteractiveMapScreen';
import { RegionsListScreen } from './features/regions/RegionsListScreen';
import { RegionProfileScreen } from './features/regions/RegionProfileScreen';
import { RegionComparisonScreen } from './features/insights/RegionComparisonScreen';
import { HistoricalAnalysisScreen } from './features/insights/HistoricalAnalysisScreen';
import { PriorityQueueScreen } from './features/insights/PriorityQueueScreen';
import { DataQualityScreen } from './features/insights/DataQualityScreen';
import { PredictionsScreen } from './features/intelligence/PredictionsScreen';
import { RecommendationsScreen } from './features/intelligence/RecommendationsScreen';
import { SimulatorScreen } from './features/decisions/SimulatorScreen';
import { ProjectsScreen } from './features/decisions/ProjectsScreen';
import { CitizenReportsScreen } from './features/decisions/CitizenReportsScreen';
import { AdminDashboardScreen } from './features/admin/AdminDashboardScreen';
import { AdminUsersScreen } from './features/admin/AdminUsersScreen';
import { AdminNotificationsScreen } from './features/admin/AdminNotificationsScreen';
import { LoadingSpinner } from './components/LoadingSpinner';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mist">
        <LoadingSpinner message="Authenticating session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mist">
        <LoadingSpinner message="Checking administrative permissions..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/register" element={<RegisterScreen />} />
            <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
            <Route path="/reset-password" element={<ResetPasswordScreen />} />
            <Route path="/verify-email" element={<VerifyEmailScreen />} />

            {/* Protected App Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Core Hubs */}
              <Route index element={<OverviewScreen />} />
              <Route path="insights" element={<InsightsScreen />} />
              <Route path="intelligence" element={<IntelligenceScreen />} />
              <Route path="decisions" element={<DecisionsScreen />} />

              {/* Data & AI Tools */}
              <Route path="datasets" element={<DatasetManagementScreen />} />
              <Route path="assistant" element={<AssistantScreen />} />

              {/* Regions */}
              <Route path="map" element={<InteractiveMapScreen />} />
              <Route path="regions" element={<RegionsListScreen />} />
              <Route path="regions/:id" element={<RegionProfileScreen />} />

              {/* Analytical Deep Dives */}
              <Route path="insights/comparison" element={<RegionComparisonScreen />} />
              <Route path="insights/historical" element={<HistoricalAnalysisScreen />} />
              <Route path="insights/priority" element={<PriorityQueueScreen />} />
              <Route path="insights/data-quality" element={<DataQualityScreen />} />

              {/* Decisions & Intelligence Deep Dives */}
              <Route path="intelligence/predictions" element={<PredictionsScreen />} />
              <Route path="intelligence/recommendations" element={<RecommendationsScreen />} />
              <Route path="decisions/simulator" element={<SimulatorScreen />} />
              <Route path="decisions/projects" element={<ProjectsScreen />} />
              <Route path="decisions/citizen-reports" element={<CitizenReportsScreen />} />

              {/* Account Management & Security */}
              <Route path="account" element={<AccountScreen />} />

              {/* Admin Portal (Admin Guarded) */}
              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminDashboardScreen />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <AdminRoute>
                    <AdminUsersScreen />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/notifications"
                element={
                  <AdminRoute>
                    <AdminNotificationsScreen />
                  </AdminRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
