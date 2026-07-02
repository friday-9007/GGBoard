/**
 * Organizer (Admin) Sign Up Page
 * Creates an organizer account that manages only its own tournaments.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './AuthPages.css';

export default function AdminRegister() {
  const [form, setForm] = useState({ username: '', display_name: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.username.trim().length < 3) {
      return setError('Username must be at least 3 characters.');
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    if (form.password !== form.confirm) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/admin/register', {
        username: form.username.trim(),
        password: form.password,
        display_name: form.display_name.trim() || form.username.trim(),
      });
      // Auto-login with the returned token
      login(res.data.user, res.data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create account. Please try again.');
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
            <div className="auth-icon">🛡️</div>
            <h1 className="auth-title">Organizer Sign Up</h1>
            <p className="auth-subtitle">Create an account to host and manage your own tournaments</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Organization / Display Name</label>
              <input id="reg-display-name" name="display_name" className="form-input" value={form.display_name} onChange={onChange} placeholder="e.g. Apex Esports" />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input id="reg-username" name="username" className="form-input" value={form.username} onChange={onChange} placeholder="Choose a username" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input id="reg-password" name="password" type="password" className="form-input" value={form.password} onChange={onChange} placeholder="At least 6 characters" required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input id="reg-confirm" name="confirm" type="password" className="form-input" value={form.confirm} onChange={onChange} placeholder="Re-enter password" required />
            </div>
            <button id="reg-submit" type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Create Organizer Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Already an organizer?{' '}
            <Link to="/admin/login" style={{ color: 'var(--neon-blue)', fontWeight: 600 }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
