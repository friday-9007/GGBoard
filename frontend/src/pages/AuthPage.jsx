/**
 * Unified Auth Page — ggBoard
 * One page for Sign In + Sign Up. Sign Up collects credentials, then hands off
 * to /auth/role where the visitor chooses Organizer or Player (account is
 * created there, so we never persist a role-less account).
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
  const [form, setForm] = useState({ username: '', password: '', confirm: '', display_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const switchMode = (m) => { setMode(m); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const username = form.username.trim();
    if (username.length < 3) return setError('Username must be at least 3 characters.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (mode === 'signup' && form.password !== form.confirm) return setError('Passwords do not match.');

    setLoading(true);
    try {
      if (mode === 'signup') {
        // Create the account now (so duplicate-username shows here), then go pick a role.
        const res = await api.post('/auth/signup', {
          username,
          password: form.password,
          display_name: form.display_name.trim() || username,
        });
        login(res.data.user, res.data.token); // authenticated, role still pending
        navigate('/auth/role');
        return;
      }

      const res = await api.post('/auth/login', { username, password: form.password });
      login(res.data.user, res.data.token);
      if (res.data.user.rolePending) navigate('/auth/role');
      else navigate(res.data.user.role === 'admin' ? '/admin/dashboard' : '/player');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <Link to="/" className="auth-back">← Back to Home</Link>
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon">🎮</div>
            <h1 className="auth-title">{mode === 'signup' ? 'Create Account' : 'Welcome Back'}</h1>
            <p className="auth-subtitle">
              {mode === 'signup' ? 'Create your GGBoard account — you\'ll pick your role next' : 'Sign in to your GGBoard account'}
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
                <label className="form-label">Display Name</label>
                <input name="display_name" className="form-input" value={form.display_name} onChange={onChange} placeholder="e.g. ShadowStriker" />
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
              {loading ? <span className="spinner"></span> : (mode === 'signup' ? 'Continue →' : 'Sign In')}
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
