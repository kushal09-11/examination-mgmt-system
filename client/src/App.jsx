import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';

// Pages
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { CoursesManagement } from './pages/CoursesManagement';
import { SubjectsManagement } from './pages/SubjectsManagement';
import { UsersManagement } from './pages/UsersManagement';
import { StudentsManagement } from './pages/StudentsManagement';
import { ExamScheduling } from './pages/ExamScheduling';
import { Timetable } from './pages/Timetable';
import { HallTickets } from './pages/HallTickets';
import { QuestionBank } from './pages/QuestionBank';
import { QuestionPapers } from './pages/QuestionPapers';
import { OnlineExamsList } from './pages/OnlineExamsList';
import { ExamRoom } from './pages/ExamRoom';
import { AttendanceManagement } from './pages/AttendanceManagement';
import { MarksEntry } from './pages/MarksEntry';
import { Moderation } from './pages/Moderation';
import { ResultsView } from './pages/ResultsView';
import { ReportsAnalytics } from './pages/ReportsAnalytics';
import { AuditLogs } from './pages/AuditLogs';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Exam room has its own focused layout */}
          <Route
            path="/exam-room/:scheduleId"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <ExamRoom />
              </ProtectedRoute>
            }
          />

          {/* Protected Main Layout Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="timetable" element={<Timetable />} />
            <Route path="hall-tickets" element={<HallTickets />} />

            {/* Academic management */}
            <Route
              path="courses"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <CoursesManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="subjects"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Faculty']}>
                  <SubjectsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <UsersManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="students"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Faculty']}>
                  <StudentsManagement />
                </ProtectedRoute>
              }
            />

            {/* Exam Operations */}
            <Route
              path="schedules"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <ExamScheduling />
                </ProtectedRoute>
              }
            />
            <Route
              path="question-bank"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Faculty']}>
                  <QuestionBank />
                </ProtectedRoute>
              }
            />
            <Route
              path="question-papers"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Faculty', 'Examiner']}>
                  <QuestionPapers />
                </ProtectedRoute>
              }
            />
            <Route
              path="attendance"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Faculty']}>
                  <AttendanceManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="marks-entry"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Faculty', 'Examiner']}>
                  <MarksEntry />
                </ProtectedRoute>
              }
            />
            <Route
              path="moderation"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Examiner']}>
                  <Moderation />
                </ProtectedRoute>
              }
            />

            {/* Student Corner */}
            <Route
              path="online-exam"
              element={
                <ProtectedRoute allowedRoles={['Student']}>
                  <OnlineExamsList />
                </ProtectedRoute>
              }
            />

            {/* Results & Reports */}
            <Route path="results" element={<ResultsView />} />
            <Route
              path="reports"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Faculty', 'Examiner']}>
                  <ReportsAnalytics />
                </ProtectedRoute>
              }
            />

            {/* Admin Management */}
            <Route
              path="audit-logs"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
