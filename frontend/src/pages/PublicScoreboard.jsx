/**
 * Public Scoreboard Page — ggBoard
 * Displays active game titles and their sorted descending scoreboards.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function PublicScoreboard() {
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [scoreboardData, setScoreboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all active games on mount
  useEffect(() => {
    setLoading(true);
    api.get('/games/active')
      .then(res => {
        setGames(res.data.games);
        if (res.data.games.length > 0) {
          // Default to the most recent game
          setSelectedGameId(res.data.games[0].id);
        }
      })
      .catch(() => setError('Failed to load tournaments.'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch scoreboard when selected game changes, then keep it live (15s polling)
  useEffect(() => {
    if (!selectedGameId) return;

    setLoading(true);
    setError('');
    api.get(`/scores/${selectedGameId}`)
      .then(res => {
        setScoreboardData(res.data);
      })
      .catch(() => setError('Failed to load scoreboard data.'))
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      // Silent refresh — no spinner, keep stale data on transient failures
      api.get(`/scores/${selectedGameId}`)
        .then(res => setScoreboardData(res.data))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedGameId]);

  return (
    <div className="page-container" style={{ paddingBottom: 'var(--space-3xl)' }}>
      {/* Header */}
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <Link to="/" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-sm)' }}>
            ← Back to Home
          </Link>
          <h1 className="page-title">Live Scoreboard</h1>
          <p className="page-subtitle">Real-time tournament standings and match updates</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <Link to="/auth?mode=signin" className="btn btn-secondary btn-sm">Sign In</Link>
          <Link to="/auth?mode=signup" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Game Selector */}
        <section className="card" style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-lg)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Tournament / Game</label>
            <select
              id="scoreboard-game-select"
              className="form-select"
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              disabled={loading && games.length === 0}
            >
              {games.length === 0 && <option value="">No active tournaments found</option>}
              {games.map(g => (
                <option key={g.id} value={g.id}>
                  {g.tournament_name} — {g.game_title}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Error State */}
        {error && (
          <div className="card" style={{ borderColor: 'var(--neon-pink)', background: 'rgba(255, 45, 149, 0.05)', textAlign: 'center', padding: 'var(--space-2xl)' }}>
            <p style={{ color: 'var(--neon-pink)' }}>{error}</p>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && !scoreboardData && (
          <div className="loading-overlay">
            <div className="spinner spinner-lg"></div>
            <p>Fetching scores...</p>
          </div>
        )}

        {/* Scoreboard Data */}
        {scoreboardData && !error && (
          <section className="card card-glow" style={{ animation: 'slideUp 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-blue)', marginBottom: '4px' }}>
                  {scoreboardData.game.tournament_name}
                </h2>
                <span className="badge badge-active">{scoreboardData.game.game_title}</span>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Format: {scoreboardData.game.num_rounds} Rounds</span>
              </div>
            </div>

            {/* Podium — top 3 */}
            {scoreboardData.scoreboard.length > 0 && (
              <Podium teams={scoreboardData.scoreboard.slice(0, 3)} />
            )}

            {/* Scoreboard Table */}
            {scoreboardData.scoreboard.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏆</div>
                <p className="empty-state-text">No team scores uploaded for this tournament yet.</p>
                <p style={{ fontSize: '0.8rem' }}>Check back soon as admin updates scores!</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                      <th>Team Name</th>
                      {/* Dynamically create round headers up to num_rounds */}
                      {Array.from({ length: scoreboardData.game.num_rounds }).map((_, i) => (
                        <th key={i} style={{ textAlign: 'center', width: '100px' }}>Round {i + 1}</th>
                      ))}
                      <th style={{ width: '120px', textAlign: 'center', color: 'var(--neon-cyan)' }}>Total Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreboardData.scoreboard.map((row) => {
                      // Highlight top 3 styles
                      let rankStyle = {};
                      let rankBadge = row.rank;
                      if (row.rank === 1) {
                        rankStyle = { color: 'var(--neon-yellow)', fontWeight: 'bold' };
                        rankBadge = '🥇';
                      } else if (row.rank === 2) {
                        rankStyle = { color: 'var(--text-primary)', fontWeight: 'bold' };
                        rankBadge = '🥈';
                      } else if (row.rank === 3) {
                        rankStyle = { color: 'var(--neon-orange)', fontWeight: 'bold' };
                        rankBadge = '🥉';
                      }

                      return (
                        <tr key={row.team_id} style={row.rank <= 3 ? { background: 'rgba(0, 212, 255, 0.02)' } : {}}>
                          <td style={{ textAlign: 'center', ...rankStyle, fontSize: row.rank <= 3 ? '1.1rem' : '0.9rem' }}>
                            {rankBadge}
                          </td>
                          <td style={{ fontWeight: row.rank <= 3 ? 600 : 400 }}>
                            {row.team_name}
                          </td>
                          {/* Render per-round scores, filling missing rounds with 0 */}
                          {Array.from({ length: scoreboardData.game.num_rounds }).map((_, idx) => {
                            const roundScore = row.round_scores[idx] !== undefined ? row.round_scores[idx] : 0;
                            return (
                              <td key={idx} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                {roundScore}
                              </td>
                            );
                          })}
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--neon-cyan)', fontSize: '1.05rem' }}>
                            {row.total_score}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

// Top-3 podium (displayed 2nd · 1st · 3rd, gold/silver/bronze pedestals)
function Podium({ teams }) {
  const medal = ['🥇', '🥈', '🥉'];
  const accent = ['var(--neon-yellow)', '#cbd5e1', 'var(--neon-orange)'];
  const heights = [156, 122, 100];
  const order = [1, 0, 2]; // render 2nd, 1st, 3rd for the classic podium shape

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 'var(--space-md)', flexWrap: 'wrap', margin: '0 auto var(--space-xl)' }}>
      {order.map((rank) => {
        const t = teams[rank];
        if (!t) return null;
        const c = accent[rank];
        return (
          <div key={t.team_id} style={{ width: 190, maxWidth: '42vw', textAlign: 'center' }}>
            <div style={{ fontSize: '2.1rem', filter: `drop-shadow(0 0 10px ${c}66)` }}>{medal[rank]}</div>
            <div style={{ fontWeight: 700, margin: '0.15rem 0', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.team_name}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--neon-cyan)' }}>{t.total_score}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.4rem' }}>points</div>
            <div style={{
              height: heights[rank],
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              background: `linear-gradient(180deg, ${c}26, transparent)`,
              border: `1px solid ${c}55`,
              borderBottom: 'none',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: '0.6rem',
              color: c,
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '1.7rem',
              boxShadow: `inset 0 0 30px ${c}18`,
            }}>
              #{rank + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}
