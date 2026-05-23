import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/AdminLogin';
import LeaderLogin from './pages/LeaderLogin';
import CreateTeam from './pages/CreateTeam';
import JoinTeam from './pages/JoinTeam';
import PublicScoreboard from './pages/PublicScoreboard';
import AdminDashboard from './pages/AdminDashboard';
import LeaderDashboard from './pages/LeaderDashboard';

// Protected Route Guard
function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner spinner-lg"></div>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/leader/login" element={<LeaderLogin />} />
          <Route path="/create-team" element={<CreateTeam />} />
          <Route path="/join-team" element={<JoinTeam />} />
          <Route path="/scoreboard" element={<PublicScoreboard />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Team Leader Routes */}
          <Route
            path="/leader/dashboard"
            element={
              <ProtectedRoute requiredRole="team_leader">
                <LeaderDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
