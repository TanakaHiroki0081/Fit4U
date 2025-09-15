import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StripeProvider } from './components/StripeProvider';
import { Layout } from './components/Layout';
import { AuthPage } from './pages/AuthPage';
import AdminLoginPage from './pages/AdminLoginPage';
import { HomePage } from './pages/HomePage';
import { LessonsPage } from './pages/LessonsPage';
import { CreateLessonPage } from './pages/CreateLessonPage';
import { LessonDetailPage } from './pages/LessonDetailPage';
import { BookingsPage } from './pages/BookingsPage';
import { TrainerProfilePage } from './pages/TrainerProfilePage';
import { ReviewPage } from './pages/ReviewPage';
import { PasswordResetPage } from './pages/PasswordResetPage';
import { PasswordResetConfirmPage } from './pages/PasswordResetConfirmPage';
import { PaymentSuccessPage } from './pages/PaymentSuccessPage';
import { PaymentCancelPage } from './pages/PaymentCancelPage';
import { BankAccountPage } from './pages/BankAccountPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminRefundsPage } from './pages/AdminRefundsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminPayoutsPage } from './pages/AdminPayoutsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminPaymentsPage } from './pages/AdminPaymentsPage';
import { AdminIdentityVerificationsPage } from './pages/AdminIdentityVerificationsPage';
import { PayoutRequestsPage } from './pages/PayoutRequestsPage';
import { PayoutRequestSuccessPage } from './pages/PayoutRequestSuccessPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { MyPage } from './pages/MyPage';
import { IdentityVerificationPage } from './pages/IdentityVerificationPage';
import { LessonParticipantsPage } from './pages/LessonParticipantsPage';
import { ParticipantProfilePage } from './pages/ParticipantProfilePage';
import { ReviewSelectionPage } from './pages/ReviewSelectionPage';
import { ReviewTrainerPage } from './pages/ReviewTrainerPage';
import { ReviewConfirmPage } from './pages/ReviewConfirmPage';
import { ReviewSuccessPage } from './pages/ReviewSuccessPage';
import { MyReviewsPage } from './pages/MyReviewsPage';
import { TrainerReviewsPage } from './pages/TrainerReviewsPage';
import { LessonCancelPage } from './pages/LessonCancelPage';

console.log('App.tsx loaded v9');
// ==== DEBUG: who is calling /rest/v1/bookings? ====
if (typeof window !== 'undefined' && !(window as any).__BOOKINGS_TRACE__) {
  (window as any).__BOOKINGS_TRACE__ = true;
  const origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : (input as any).url ?? String(input);

    if (typeof url === 'string' && url.includes('/rest/v1/bookings')) {
      console.groupCollapsed('[TRACE] /bookings request', url);
      console.trace(); // ここに発火元の .tsx ファイル名/行が出ます
      console.groupEnd();
    }
    return origFetch(input as any, init);
  };
}
// ================================================
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  console.log('ProtectedRoute - user:', user?.name || 'null', 'loading:', loading);

  if (loading) {
    console.log('Showing loading screen...');
    return (
      <div className="min-h-screen bg-default-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-secondary">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('No user, redirecting to auth...');
    return <Navigate to="/auth" replace />;
  }

  console.log('User authenticated, showing protected content...');
  return <Layout>{children}</Layout>;
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();
  
  console.log('AppRoutes - user:', user?.name || 'null', 'loading:', loading);

  if (loading) {
    console.log('AppRoutes showing loading...');
    return (
      <div className="min-h-screen bg-default-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-secondary">読み込み中...</p>
          <p className="mt-1 text-xs text-secondary">認証情報を確認しています...</p>
        </div>
      </div>
    );
  }

  console.log('AppRoutes rendering routes...');
  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/admin/login" 
        element={user ? <Navigate to="/" replace /> : <AdminLoginPage />}
      />
      <Route 
        path="/auth" 
        element={user ? <Navigate to="/" replace /> : <AuthPage />}
      />
      <Route 
        path="/reset-password" 
        element={user ? <Navigate to="/" replace /> : <PasswordResetPage />}
      />
      <Route 
        path="/reset-password-confirm" 
        element={<PasswordResetConfirmPage />}
      />
      <Route 
        path="/payment-success" 
        element={<PaymentSuccessPage />}
      />
      <Route 
        path="/payment-cancel" 
        element={<PaymentCancelPage />}
      />
      <Route 
        path="/terms" 
        element={<TermsOfServicePage />}
      />
      
      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {user?.role === 'admin' ? <AdminDashboardPage /> : <HomePage />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/lessons"
        element={
          <ProtectedRoute>
            <LessonsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lessons/:id"
        element={
          <ProtectedRoute>
            <LessonDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-lesson"
        element={
          <ProtectedRoute>
            <CreateLessonPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <ProtectedRoute>
            <BookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trainer/:id"
        element={
          <ProtectedRoute>
            <TrainerProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/review/:lessonId"
        element={
          <ProtectedRoute>
            <ReviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mypage"
        element={
          <ProtectedRoute>
            <MyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bank-account"
        element={
          <ProtectedRoute>
            <BankAccountPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payout-requests"
        element={
          <ProtectedRoute>
            <PayoutRequestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payout-request-success"
        element={
          <ProtectedRoute>
            <PayoutRequestSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/identity-verification"
        element={
          <ProtectedRoute>
            <IdentityVerificationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lesson-participants/:lessonId"
        element={
          <ProtectedRoute>
            <LessonParticipantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/participant/:id"
        element={
          <ProtectedRoute>
            <ParticipantProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/review-selection"
        element={
          <ProtectedRoute>
            <ReviewSelectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/review-trainer/:trainerId"
        element={
          <ProtectedRoute>
            <ReviewTrainerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/review-confirm"
        element={
          <ProtectedRoute>
            <ReviewConfirmPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/review-success"
        element={
          <ProtectedRoute>
            <ReviewSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-reviews"
        element={
          <ProtectedRoute>
            <MyReviewsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trainer-reviews"
        element={
          <ProtectedRoute>
            <TrainerReviewsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lesson-cancel/:lessonId"
        element={
          <ProtectedRoute>
            <LessonCancelPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/refunds"
        element={
          <ProtectedRoute>
            <AdminRefundsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payouts"
        element={
          <ProtectedRoute>
            <AdminPayoutsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/identity-verifications"
        element={
          <ProtectedRoute>
            <AdminIdentityVerificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute>
            <AdminPaymentsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <StripeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </StripeProvider>
  );
}

export default App;