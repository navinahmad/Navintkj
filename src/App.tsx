/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/app/DashboardPage';
import EmployeeAttendancePage from './pages/app/EmployeeAttendancePage';
import RecapEmployeePage from './pages/app/RecapEmployeePage';
import RecapStudentPage from './pages/app/RecapStudentPage';
import StudentAttendancePage from './pages/app/StudentAttendancePage';
import StudentsDataPage from './pages/app/StudentsDataPage';
import UserManagementPage from './pages/app/UserManagementPage';
import type { UserRole } from './types/app';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm font-medium text-slate-600">Memuat sesi portal...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<LoginPage />} />

          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="absensi-karyawan" element={<EmployeeAttendancePage />} />
            <Route
              path="absensi-siswa"
              element={
                <RequireRole roles={['admin', 'guru']}>
                  <StudentAttendancePage />
                </RequireRole>
              }
            />
            <Route
              path="rekap/karyawan"
              element={
                <RequireRole roles={['admin']}>
                  <RecapEmployeePage />
                </RequireRole>
              }
            />
            <Route
              path="rekap/siswa"
              element={
                <RequireRole roles={['admin', 'guru']}>
                  <RecapStudentPage />
                </RequireRole>
              }
            />
            <Route
              path="data-siswa"
              element={
                <RequireRole roles={['admin']}>
                  <StudentsDataPage />
                </RequireRole>
              }
            />
            <Route
              path="user-management"
              element={
                <RequireRole roles={['admin']}>
                  <UserManagementPage />
                </RequireRole>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
