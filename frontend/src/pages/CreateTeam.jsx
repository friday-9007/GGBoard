/**
 * Create a Team Page
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import './AuthPages.css';

export default function CreateTeam() {
  const [formData, setFormData] = useState({
    team_name: '', leader_name: '', game_id: ''
  });
  const [games, setGames] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    api.get('/games/active').then(res => setGames(res.data.games)).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/teams/create', formData);
      setSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create team.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const copyAll = (data) => {
    const text = `Team Name: ${data.team.team_name}\nTeam Unique Code: ${data.team.unique_code}\nTeam Leader Username: ${data.leader_username}\nTeam Leader Password: ${data.leader_password}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="auth-page">
      <div className="auth-bg"><div className="grid-overlay"></div></div>
      <div className="auth-container">
        <Link to="/" className="auth-back">← Back to Home</Link>
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon">➕</div>
            <h1 className="auth-title">Create a Team</h1>
            <p className="auth-subtitle">Register your squad for a tournament</p>
          </div>

          {success ? (
            <div className="auth-success" style={{ textAlign: 'left' }}>
              <h3 style={{ textAlign: 'center' }}>🎉 Team Created!</h3>
              <p style={{ textAlign: 'center', fontSize: '0.85rem' }}>Please save these credentials now. They will not be shown again.</p>
              
              <div className="credentials-card" style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                margin: '1.25rem 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Team Unique Code</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input id="display-team-code" className="form-input" style={{ fontFamily: 'monospace', flexGrow: 1, padding: '0.4rem 0.6rem', fontSize: '0.9rem' }} readOnly value={success.team.unique_code} />
                    <button id="copy-team-code-btn" type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.8rem' }} onClick={() => copyToClipboard(success.team.unique_code)}>Copy</button>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Team Leader Username</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input id="display-leader-username" className="form-input" style={{ fontFamily: 'monospace', flexGrow: 1, padding: '0.4rem 0.6rem', fontSize: '0.9rem' }} readOnly value={success.leader_username} />
                    <button id="copy-leader-username-btn" type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.8rem' }} onClick={() => copyToClipboard(success.leader_username)}>Copy</button>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Team Leader Password</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input id="display-leader-password" className="form-input" style={{ fontFamily: 'monospace', flexGrow: 1, padding: '0.4rem 0.6rem', fontSize: '0.9rem' }} readOnly value={success.leader_password} />
                    <button id="copy-leader-password-btn" type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.8rem' }} onClick={() => copyToClipboard(success.leader_password)}>Copy</button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button id="copy-all-btn" type="button" className="btn btn-secondary" style={{ flexGrow: 1 }} onClick={() => copyAll(success)}>Copy All</button>
                <Link to="/leader/login" className="btn btn-primary" style={{ flexGrow: 1, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  Login →
                </Link>
              </div>
              <p className="auth-error" style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.75rem', background: 'rgba(255, 45, 149, 0.1)', border: '1px solid rgba(255, 45, 149, 0.3)', color: 'var(--neon-pink)', padding: '0.5rem' }}>
                ⚠️ Save these credentials now — they will not be shown again
              </p>
            </div>
          ) : (
            <>
              {error && <div className="auth-error">{error}</div>}
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label className="form-label">Team Name</label>
                  <input id="create-team-name" name="team_name" className="form-input" value={formData.team_name} onChange={handleChange} placeholder="e.g. Shadow Strikers" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Your Name (Leader)</label>
                  <input id="create-leader-name" name="leader_name" className="form-input" value={formData.leader_name} onChange={handleChange} placeholder="Your display name" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Tournament</label>
                  <select id="create-game-select" name="game_id" className="form-select" value={formData.game_id} onChange={handleChange} required>
                    <option value="">Select a tournament...</option>
                    {games.map(g => (
                      <option key={g.id} value={g.id}>{g.tournament_name} ({g.game_title})</option>
                    ))}
                  </select>
                  {games.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>No active tournaments available</p>}
                </div>
                <button id="create-team-submit" type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                  {loading ? <span className="spinner"></span> : 'Create Team'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
