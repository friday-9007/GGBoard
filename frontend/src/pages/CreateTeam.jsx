/**
 * Create a Team Page
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import './AuthPages.css';

export default function CreateTeam() {
  const [formData, setFormData] = useState({
    team_name: '', leader_name: '', username: '', password: '', game_id: ''
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

  const copyCode = () => {
    navigator.clipboard.writeText(success.team.unique_code);
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
            <div className="auth-success">
              <h3>🎉 Team Created!</h3>
              <p>Share this code with your players to join:</p>
              <div className="team-code-display" onClick={copyCode} title="Click to copy">
                {success.team.unique_code}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click the code to copy</p>
              <Link to="/leader/login" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
                Login as Team Leader →
              </Link>
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
                  <label className="form-label">Username</label>
                  <input id="create-username" name="username" className="form-input" value={formData.username} onChange={handleChange} placeholder="Choose a login username" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input id="create-password" name="password" type="password" className="form-input" value={formData.password} onChange={handleChange} placeholder="Min 4 characters" required minLength={4} />
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
