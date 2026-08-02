/**
 * Public Scoreboard Page — ggBoard (Challonge-Style Tournament View)
 * Displays active tournaments, game format tags, round breakdown, and sorted standings.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import './PublicScoreboard.css';

export default function PublicScoreboard() {
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [scoreboardData, setScoreboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Fetch active games
  useEffect(() => {
    setLoading(true);
    api.get('/games/active')
      .then(res => {
        setGames(res.data.games);
        if (res.data.games.length > 0) {
          setSelectedGameId(res.data.games[0].id);
        }
      })
      .catch(() => setError('Failed to load tournaments.'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch score data with silent refresh
  useEffect(() => {
    if (!selectedGameId) return;

    setLoading(true);
    setError('');
    api.get(`/scores/${selectedGameId}`)
      .then(res => setScoreboardData(res.data))
      .catch(() => setError('Failed to load standings.'))
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      api.get(`/scores/${selectedGameId}`)
        .then(res => setScoreboardData(res.data))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedGameId]);

  // Filter games based on search
  const filteredGames = games.filter(g =>
    g.tournament_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    g.game_title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="c-scoreboard-page">

      {/* Header */}
      <header className="c-sb-header">
        <div>
          <Link to="/" className="c-back-link">← Back to Tournament Hub</Link>
          <h1 className="c-sb-title">🏆 Live Tournament Scoreboards</h1>
          <p className="c-sb-subtitle">Real-time round scores, standings, and ranked brackets</p>
        </div>
        <div className="c-sb-actions">
          <Link to="/join-team" className="btn btn-secondary btn-sm">Join Squad</Link>
          <Link to="/create-team" className="btn btn-primary btn-sm">+ Register Team</Link>
        </div>
      </header>

      {/* Tournament Selector Sidebar & View */}
      <div className="c-sb-layout">

        {/* Left Tournament Selection Panel */}
        <aside className="c-sb-sidebar card">
          <div className="sb-sidebar-search">
            <input
              type="text"
              className="form-input"
              placeholder="Search tournaments..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>

          <span className="sb-sidebar-label">ACTIVE TOURNAMENTS ({filteredGames.length})</span>

          <div className="sb-tournament-list">
            {filteredGames.length === 0 ? (
              <p className="sb-empty-list">No tournaments found</p>
            ) : (
              filteredGames.map(g => (
                <button
                  key={g.id}
                  className={`sb-tourn-item ${selectedGameId === g.id ? 'active' : ''}`}
                  onClick={() => setSelectedGameId(g.id)}
                >
                  <div className="tourn-item-top">
                    <span className="tourn-title">{g.tournament_name}</span>
                    <span className="badge badge-live">LIVE</span>
                  </div>
                  <span className="tourn-game">{g.game_title}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right Scoreboard View */}
        <main className="c-sb-main card">
          {error && (
            <div className="sb-error-card">
              <p>⚠️ {error}</p>
            </div>
          )}

          {loading && !scoreboardData && (
            <div className="loading-overlay">
              <div className="spinner spinner-lg"></div>
              <p>Fetching tournament standings...</p>
            </div>
          )}

          {!loading && games.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🏆</div>
              <p>No active tournaments currently listed.</p>
              <Link to="/auth?mode=signup" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
                + Host First Tournament
              </Link>
            </div>
          )}

          {scoreboardData && !error && (
            <div>
              {/* Tournament Meta Bar */}
              <div className="c-sb-meta-bar">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <h2 className="c-sb-game-title">{scoreboardData.game.tournament_name}</h2>
                    <span className="badge badge-active">{scoreboardData.game.game_title}</span>
                  </div>
                  <div className="meta-details">
                    <span><strong>Format:</strong> Round Robin</span>
                    <span>•</span>
                    <span><strong>Rounds:</strong> {scoreboardData.game.num_rounds}</span>
                    <span>•</span>
                    <span><strong>Teams:</strong> {scoreboardData.scoreboard.length} Squads</span>
                  </div>
                </div>

                <div className="live-pulse-badge">
                  <span className="pulse-dot"></span> UPDATED LIVE (15s)
                </div>
              </div>

              {/* Scoreboard Table */}
              {scoreboardData.scoreboard.length === 0 ? (
                <div className="empty-state" style={{ padding: '3rem 0' }}>
                  <p>No round scores recorded yet.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table c-standings-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px', textAlign: 'center' }}>Rank</th>
                        <th>Squad / Team Name</th>
                        {Array.from({ length: scoreboardData.game.num_rounds }).map((_, i) => (
                          <th key={i} style={{ textAlign: 'center', width: '85px' }}>R{i + 1}</th>
                        ))}
                        <th style={{ width: '100px', textAlign: 'right' }}>TOTAL PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreboardData.scoreboard.map((row) => (
                        <tr key={row.team_id} className={row.rank <= 3 ? `rank-${row.rank}` : ''}>
                          <td style={{ textAlign: 'center', fontWeight: '800' }}>
                            {row.rank === 1 ? '🥇 1' : row.rank === 2 ? '🥈 2' : row.rank === 3 ? '🥉 3' : row.rank}
                          </td>
                          <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                            {row.team_name}
                          </td>
                          {Array.from({ length: scoreboardData.game.num_rounds }).map((_, idx) => (
                            <td key={idx} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                              {row.round_scores[idx] !== undefined ? row.round_scores[idx] : 0}
                            </td>
                          ))}
                          <td style={{ textAlign: 'right', fontWeight: '900', color: 'var(--accent-orange)', fontSize: '1.1rem' }}>
                            {row.total_score}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
