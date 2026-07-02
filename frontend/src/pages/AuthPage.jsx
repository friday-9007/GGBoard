/**
 * Unified Auth Page — ggBoard
 * One page for Sign In + Sign Up. On Sign Up, choose Organizer or Player.
 */

import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './AuthPages.css';
import './AuthPage.css';

export default function AuthPage() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'signup' : 'signin');
  const [role, setRole] = useState('player'); // signup only: 'player' | 'organizer'
  const [form, setForm] = useState({ username: '', password: '', confirm: '', display_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const routeByRole = (user) => {
    if (user.role === 'admin') navigate('/admin/dashboard');
    else navigate('/player');
  };

  const switchMode = (m) => { setMode(m); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.username.trim().length < 3) return setError('Username must be at least 3 characters.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (mode === 'signup' && form.password !== form.confirm) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const res = mode === 'signup'
        ? await api.post('/auth/register', {
            role,
            username: form.username.trim(),
            password: form.password,
            display_name: form.display_name.trim() || form.username.trim(),
          })
        : await api.post('/auth/login', { username: form.username.trim(), password: form.password });

      login(res.data.user, res.data.token);
      routeByRole(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg"><div className="grid-overlay"></div></div>
      <div className="auth-container">
        <Link to="/" className="auth-back">← Back to Home</Link>
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon">🎮</div>
            <h1 className="auth-title">{mode === 'signup' ? 'Create Account' : 'Welcome Back'}</h1>
            <p className="auth-subtitle">
              {mode === 'signup' ? 'Join GGBoard as an organizer or a player' : 'Sign in to your GGBoard account'}
            </p>
          </div>

          <div className="auth-tabs">
            <button type="button" className={`auth-tab ${mode === 'signin' ? 'active' : ''}`} onClick={() => switchMode('signin')}>Sign In</button>
            <button type="button" className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => switchMode('signup')}>Sign Up</button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">I am registering as</label>
                <div className="role-toggle">
                  <button type="button" className={`role-option ${role === 'player' ? 'active' : ''}`} onClick={() => setRole('player')}>
                    🎮 Player
                    <span>Join or create a team</span>
                  </button>
                  <button type="button" className={`role-option ${role === 'organizer' ? 'active' : ''}`} onClick={() => setRole('organizer')}>
                    🛡️ Organizer
                    <span>Host tournaments</span>
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">{role === 'organizer' ? 'Organization / Display Name' : 'Display Name'}</label>
                <input name="display_name" className="form-input" value={form.display_name} onChange={onChange}
                  placeholder={role === 'organizer' ? 'e.g. Apex Esports' : 'e.g. ShadowStriker'} />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Username</label>
              <input id="auth-username" name="username" className="form-input" value={form.username} onChange={onChange} placeholder="Your username" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input id="auth-password" name="password" type="password" className="form-input" value={form.password} onChange={onChange}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} required />
            </div>
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input name="confirm" type="password" className="form-input" value={form.confirm} onChange={onChange} placeholder="Re-enter password" required />
              </div>
            )}

            <button id="auth-submit" type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? <span className="spinner"></span> : (mode === 'signup' ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" className="auth-link-btn" onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}>
              {mode === 'signup' ? 'Sign in' : 'Sign up'} →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
