/**
 * Create a Team Page — the logged-in player becomes the team's leader.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './AuthPages.css';

export default function CreateTeam() {
  const [formData, setFormData] = useState({ team_name: '', game_id: '' });
  const [games, setGames] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const { login } = useAuth();

  useEffect(() => {
    api.get('/games/active').then((res) => setGames(res.data.games)).catch(() => {});
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/teams/create', formData);
      // Refresh token so it now carries the new teamId
      if (res.data.token) login(res.data.user, res.data.token);
      setSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create team.');
    } finally {
      setLoading(false);
    }
  };

  const copy = (t) => navigator.clipboard.writeText(t);

  return (
    <div className="auth-page">
      <div className="auth-bg"><div className="grid-overlay"></div></div>
      <div className="auth-container">
        <Link to="/player" className="auth-back">← Back to Player Hub</Link>
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon">➕</div>
            <h1 className="auth-title">Create a Team</h1>
            <p className="auth-subtitle">Register your squad for a tournament — you'll be the team leader</p>
          </div>

          {success ? (
            <div className="auth-success" style={{ textAlign: 'center' }}>
              <h3>🎉 Team Created!</h3>
              <p style={{ fontSize: '0.85rem' }}>Share this join code with your teammates:</p>
              <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
                <input className="form-input" readOnly value={success.team.unique_code}
                  style={{ fontFamily: 'monospace', letterSpacing: '2px', flexGrow: 1, textAlign: 'center' }} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => copy(success.team.unique_code)}>Copy</button>
              </div>
              <Link to="/player" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: '0.5rem' }}>Go to Player Hub →</Link>
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
                  <label className="form-label">Tournament</label>
                  <select id="create-game-select" name="game_id" className="form-select" value={formData.game_id} onChange={handleChange} required>
                    <option value="">Select a tournament...</option>
                    {games.map((g) => (
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
