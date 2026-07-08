/**
 * Role Selection — step 2 of sign-up.
 * Credentials were entered on /auth; here the visitor picks Organizer or Player,
 * and the account is created in the matching table. (No role-less account is ever
 * persisted — creation happens only when a role is chosen.)
 */

import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './AuthPages.css';
import './AuthPage.css';

export default function RoleSelect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const creds = location.state; // { username, password, display_name }
  const [busy, setBusy] = useState(null); // which role is submitting
  const [error, setError] = useState('');

  // Reached without going through sign-up → send back to the sign-up form.
  if (!creds?.username || !creds?.password) return <Navigate to="/auth?mode=signup" replace />;

  const choose = async (role) => {
    setBusy(role);
    setError('');
    try {
      const res = await api.post('/auth/signup', {
        role,
        username: creds.username,
        password: creds.password,
        display_name: creds.display_name,
      });
      login(res.data.user, res.data.token);
      navigate(res.data.user.role === 'admin' ? '/admin/dashboard' : '/player');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create your account. Please try again.');
      setBusy(null);
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
            <p className="auth-subtitle">Hi {creds.display_name || creds.username} — pick your account type to finish signing up.</p>
          </div>

          {error && (
            <div className="auth-error">
              {error}{' '}
              <button type="button" className="auth-link-btn" onClick={() => navigate('/auth?mode=signup')}>Go back</button>
            </div>
          )}

          <div className="role-cards">
            <button type="button" className="role-card" disabled={!!busy} onClick={() => choose('player')}>
              <div className="role-card-icon">🎮</div>
              <h3>Player</h3>
              <p>Create or join a team and compete in tournaments.</p>
              {busy === 'player' ? <span className="spinner"></span> : <span className="role-card-cta">Continue as Player →</span>}
            </button>

            <button type="button" className="role-card" disabled={!!busy} onClick={() => choose('organizer')}>
              <div className="role-card-icon">🛡️</div>
              <h3>Organizer</h3>
              <p>Host tournaments and manage teams, players, and scores.</p>
              {busy === 'organizer' ? <span className="spinner"></span> : <span className="role-card-cta">Continue as Organizer →</span>}
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
