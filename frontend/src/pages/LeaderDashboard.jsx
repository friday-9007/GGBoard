/**
 * Team Leader Dashboard Page — ggBoard
 */

import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LeaderDashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', justifyContent: 'center', alignItems: 'center' }}>
      <div className="card card-glow" style={{ maxWidth: '500px', textAlign: 'center' }}>
        <h1 className="page-title" style={{ fontSize: '2rem' }}>Team Console</h1>
        <p className="page-subtitle" style={{ marginBottom: 'var(--space-lg)' }}>
          Welcome back, Captain {user?.displayName || 'Leader'}! Scoped Team Leader dashboard is ready.
        </p>
        <button
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="btn btn-danger"
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}
