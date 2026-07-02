/**
 * Admin Login Page
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './AuthPages.css';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/admin/login', { username, password });
      login(res.data.user, res.data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="grid-overlay"></div>
      </div>
      <div className="auth-container">
        <Link to="/" className="auth-back">← Back to Home</Link>
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon">🛡️</div>
            <h1 className="auth-title">Admin Login</h1>
            <p className="auth-subtitle">Tournament management access</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                id="admin-username"
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="admin-password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            <button id="admin-login-submit" type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Access Admin Panel'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            New organizer?{' '}
            <Link to="/admin/register" style={{ color: 'var(--neon-blue)', fontWeight: 600 }}>
              Create an account →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
