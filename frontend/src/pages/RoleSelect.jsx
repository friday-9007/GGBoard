/**
 * Role Selection — step 2 of sign-up (and forced on next sign-in if skipped).
 * The account already exists (created at /auth/signup) in a pending state; here
 * the user picks Organizer or Player, which finalises the role on the account.
 */

import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './AuthPages.css';
import './AuthPage.css';

export default function RoleSelect() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, login } = useAuth();
  const [role, setRole] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (authLoading) return null;
  // Must be signed in to have a pending account to finalise
  if (!isAuthenticated) return <Navigate to="/auth?mode=signup" replace />;
  // Role already chosen → nothing to do here
  if (user && !user.rolePending) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/player'} replace />;
  }

  const choose = async (picked) => {
    setRole(picked);
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/select-role', { role: picked });
      login(res.data.user, res.data.token);
      navigate(res.data.user.role === 'admin' ? '/admin/dashboard' : '/player');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not set your account type. Please try again.');
      setRole(null);
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg"><div className="grid-overlay"></div></div>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon">🎮</div>
            <h1 className="auth-title">How will you use GGBoard?</h1>
            <p className="auth-subtitle">Hi {user?.displayName || user?.username} — pick your account type to finish setting up. This step is required.</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="role-cards">
            <button type="button" className="role-card" disabled={loading} onClick={() => choose('player')}>
              <div className="role-card-icon">🎮</div>
              <h3>Player</h3>
              <p>Create or join a team and compete in tournaments.</p>
              {loading && role === 'player' ? <span className="spinner"></span> : <span className="role-card-cta">Continue as Player →</span>}
            </button>

            <button type="button" className="role-card" disabled={loading} onClick={() => choose('organizer')}>
              <div className="role-card-icon">🛡️</div>
              <h3>Organizer</h3>
              <p>Host tournaments and manage teams, players, and scores.</p>
              {loading && role === 'organizer' ? <span className="spinner"></span> : <span className="role-card-cta">Continue as Organizer →</span>}
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            You can't change this later without a new account, so choose the one that matches how you'll use GGBoard.
          </p>
        </div>
      </div>
    </div>
  );
}
