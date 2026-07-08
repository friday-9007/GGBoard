/**
 * Unified Auth Page — ggBoard
 * One page for Sign In + Sign Up. Sign Up is role-first: pick Organizer or
 * Player, then enter credentials — the account is created in the matching table.
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
  const dest = (user) => (user.role === 'admin' ? '/admin/dashboard' : '/player');

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
        // Credentials only here — the role is chosen on the next page, where the
        // account is actually created. Check the username now so a duplicate shows here.
        const { data } = await api.get('/auth/username-available', { params: { username } });
        if (!data.available) { setError('That username is already taken.'); setLoading(false); return; }
        navigate('/auth/role', { state: { username, password: form.password, display_name: form.display_name.trim() || username } });
        return;
      }

      const res = await api.post('/auth/login', { username, password: form.password });
      login(res.data.user, res.data.token);
      navigate(dest(res.data.user));
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
              {mode === 'signup' ? "Create your account — you'll pick your role next" : 'Sign in to your GGBoard account'}
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
