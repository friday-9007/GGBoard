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
        <section className="card card-glow" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(0, 212, 255, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: 'var(--space-md)' }}>
            <div>
              <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{team.team_name}</h2>
              <span className="badge badge-active" style={{ marginTop: '0.4rem' }}>{team.game_title}</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(0, 212, 255, 0.08)', border: '1px solid var(--border-accent)', padding: '0.3rem 0.8rem', borderRadius: 'var(--radius-xl)' }}>
              {team.tournament_name}
            </span>
          </div>

          <div style={{ background: 'rgba(6, 255, 210, 0.04)', border: '1px dashed rgba(6, 255, 210, 0.3)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: 'var(--space-xl)' }}>
            <label className="form-label" style={{ color: 'var(--neon-cyan)', marginBottom: '0.4rem' }}>🛡️ Team Join Code — share with teammates</label>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
              <code style={{ flexGrow: 1, background: 'rgba(10, 10, 18, 0.8)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', color: 'var(--neon-cyan)', fontFamily: 'var(--font-heading)', fontSize: '1.4rem', letterSpacing: '4px', textAlign: 'center', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }}>
                {team.unique_code}
              </code>
              <button className="btn btn-primary btn-sm" style={{ padding: '0.75rem 1.25rem' }} onClick={copyCode}>
                {copied ? '✓ Copied!' : '📋 Copy Code'}
              </button>
            </div>
          </div>

          <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>Squad Roster ({players.length})</h3>
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
