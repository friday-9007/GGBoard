/**
 * Player Hub — ggBoard
 * Home for a logged-in player. Shows their team (or create/join options).
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function PlayerHub() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.teamId) {
      api.get('/teams/my')
        .then((res) => { setTeam(res.data.team); setPlayers(res.data.players || []); })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const copyCode = () => {
    navigator.clipboard.writeText(team.unique_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: 'var(--space-xl)' }}>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)' }}>
        <div>
          <h1 className="page-title">Hi, {user?.displayName || user?.username} 👋</h1>
          <p className="page-subtitle">Your player hub</p>
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => { logout(); navigate('/'); }}>Logout</button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}><span className="spinner spinner-lg"></span></div>
      ) : team ? (
        <section className="card card-glow">
          <h2 style={{ color: 'var(--neon-blue)', marginBottom: 'var(--space-xs)' }}>{team.team_name}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
            {team.tournament_name} · {team.game_title}
          </p>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label className="form-label">Team Join Code — share with teammates</label>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <code style={{ flexGrow: 1, background: 'var(--bg-input)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', color: 'var(--neon-cyan)', fontFamily: 'var(--font-heading)', letterSpacing: '2px' }}>
                {team.unique_code}
              </code>
              <button className="btn btn-secondary btn-sm" onClick={copyCode}>{copied ? 'Copied!' : 'Copy'}</button>
            </div>
          </div>

          <h3 style={{ marginBottom: 'var(--space-sm)' }}>Roster ({players.length})</h3>
          {players.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No teammates have joined yet — share your code above.</p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Player</th><th>In-Game Name</th></tr></thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.id}><td>{p.full_name}</td><td>{p.in_game_name}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 'var(--space-lg)' }}>
            <Link to="/scoreboard" className="btn btn-secondary btn-sm">View Scoreboard →</Link>
          </div>
        </section>
      ) : (
        <div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            You're not on a team yet. Create your own team or join one with a code.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-lg)' }}>
            <Link to="/create-team" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>➕</div>
              <h3 style={{ color: 'var(--neon-blue)', marginBottom: 'var(--space-xs)' }}>Create a Team</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Register a new team for a tournament and get a join code to share.</p>
            </Link>
            <Link to="/join-team" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🤝</div>
              <h3 style={{ color: 'var(--neon-blue)', marginBottom: 'var(--space-xs)' }}>Join a Team</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Enter a team code from your team leader to join their roster.</p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
