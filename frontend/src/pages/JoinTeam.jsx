/**
 * Join a Team Page
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import './AuthPages.css';

export default function JoinTeam() {
  const [formData, setFormData] = useState({
    full_name: '', in_game_name: '', email: '', phone: '', team_code: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/players/join', formData);
      setSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join team.');
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
            <div className="auth-icon">🤝</div>
            <h1 className="auth-title">Join a Team</h1>
            <p className="auth-subtitle">Enter your details and team code</p>
          </div>

          {success ? (
            <div className="auth-success">
              <h3>🎉 You're In!</h3>
              <p>Successfully joined <strong>{success.team_name}</strong></p>
              <Link to="/scoreboard" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
                View Scoreboard →
              </Link>
            </div>
          ) : (
            <>
              {error && <div className="auth-error">{error}</div>}
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input id="join-full-name" name="full_name" className="form-input" value={formData.full_name} onChange={handleChange} placeholder="Your full name" required />
                </div>
                <div className="form-group">
                  <label className="form-label">In-Game Name</label>
                  <input id="join-ign" name="in_game_name" className="form-input" value={formData.in_game_name} onChange={handleChange} placeholder="Your in-game username / ID" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email (Optional)</label>
                  <input id="join-email" name="email" type="email" className="form-input" value={formData.email} onChange={handleChange} placeholder="your@email.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone (Optional)</label>
                  <input id="join-phone" name="phone" className="form-input" value={formData.phone} onChange={handleChange} placeholder="+1 234 567 890" />
                </div>
                <div className="form-group">
                  <label className="form-label">Team Code</label>
                  <input id="join-team-code" name="team_code" className="form-input" value={formData.team_code} onChange={handleChange} placeholder="Enter the code from your team leader" required style={{ fontFamily: 'var(--font-heading)', letterSpacing: '3px', textTransform: 'uppercase' }} />
                </div>
                <button id="join-team-submit" type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                  {loading ? <span className="spinner"></span> : 'Join Team'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
