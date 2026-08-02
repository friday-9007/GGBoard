import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AnimatedBackground from './components/AnimatedBackground';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import RoleSelect from './pages/RoleSelect';
import CreateTeam from './pages/CreateTeam';
import JoinTeam from './pages/JoinTeam';
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

  // Signed up but hasn't chosen a role yet — force the selection step first
  if (user?.rolePending) {
    return <Navigate to="/auth/role" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <AnimatedBackground />
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
          <Route
            path="/create-team"
            element={
              <ProtectedRoute requiredRole="team_leader">
                <CreateTeam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/join-team"
            element={
              <ProtectedRoute requiredRole="team_leader">
                <JoinTeam />
              </ProtectedRoute>
            }
          />

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
