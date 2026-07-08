import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import RoleSelect from './pages/RoleSelect';
import PlayerHub from './pages/PlayerHub';
import PublicScoreboard from './pages/PublicScoreboard';
import AdminDashboard from './pages/AdminDashboard';

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
    return <Navigate to="/auth" replace />;
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
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/role" element={<RoleSelect />} />
          <Route path="/scoreboard" element={<PublicScoreboard />} />

          {/* Legacy auth entry points → unified /auth */}
          <Route path="/admin/login" element={<Navigate to="/auth?mode=signin" replace />} />
          <Route path="/admin/register" element={<Navigate to="/auth?mode=signup" replace />} />
          <Route path="/leader/login" element={<Navigate to="/auth?mode=signin" replace />} />

          {/* Protected Player Routes */}
          <Route
            path="/player"
            element={
              <ProtectedRoute requiredRole="team_leader">
                <PlayerHub />
              </ProtectedRoute>
            }
          />
          {/* Create/Join now live inside the player dashboard (My Teams) */}
          <Route path="/create-team" element={<Navigate to="/player" replace />} />
          <Route path="/join-team" element={<Navigate to="/player" replace />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Legacy leader dashboard → player hub */}
          <Route path="/leader/dashboard" element={<Navigate to="/player" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
