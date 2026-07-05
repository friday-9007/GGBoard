/**
 * Admin Panel Dashboard — ggBoard
 * The primary operations center for admins.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function AdminDashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  // Active view: 'overview' | 'games' | 'teams' | 'players' | 'scores' | 'export'
  const [activeTab, setActiveTab] = useState('overview');

  // Overview stats
  const [stats, setStats] = useState({ games: 0, teams: 0, players: 0 });

  // Toast State
  const [toast, setToast] = useState(null);

  // Common UI helper for showing toast message
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch overview stats
  const fetchStats = async () => {
    try {
      const [gRes, tRes, pRes] = await Promise.all([
        api.get('/games/all'),
        api.get('/teams/all'),
        api.get('/players/all')
      ]);
      setStats({
        games: gRes.data.games.length,
        teams: tRes.data.teams.length,
        players: pRes.data.players.length
      });
    } catch (err) {}
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchStats();
    }
  }, [activeTab]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Sidebar */}
      <aside style={{
        width: 'var(--sidebar-width)',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'col',
        flexDirection: 'column',
        padding: 'var(--space-lg)'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 'var(--space-2xl)', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', letterSpacing: '2px' }}>
            <span style={{ color: 'var(--neon-blue)' }}>GG</span>BOARD
          </h2>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Admin Console
          </span>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', flexGrow: 1 }}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`btn btn-secondary btn-sm`}
            style={{
              justifyContent: 'flex-start',
              background: activeTab === 'overview' ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
              borderColor: activeTab === 'overview' ? 'var(--neon-blue)' : 'transparent',
              color: activeTab === 'overview' ? 'var(--neon-blue)' : 'var(--text-secondary)'
            }}
          >
            📊 Dashboard Overview
          </button>

          <button
            id="tab-games"
            onClick={() => setActiveTab('games')}
            className={`btn btn-secondary btn-sm`}
            style={{
              justifyContent: 'flex-start',
              background: activeTab === 'games' ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
              borderColor: activeTab === 'games' ? 'var(--neon-blue)' : 'transparent',
              color: activeTab === 'games' ? 'var(--neon-blue)' : 'var(--text-secondary)'
            }}
          >
            🎮 Tournaments / Games
          </button>

          <button
            id="tab-teams"
            onClick={() => setActiveTab('teams')}
            className={`btn btn-secondary btn-sm`}
            style={{
              justifyContent: 'flex-start',
              background: activeTab === 'teams' ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
              borderColor: activeTab === 'teams' ? 'var(--neon-blue)' : 'transparent',
              color: activeTab === 'teams' ? 'var(--neon-blue)' : 'var(--text-secondary)'
            }}
          >
            🛡️ Team Roster
          </button>

          <button
            id="tab-players"
            onClick={() => setActiveTab('players')}
            className={`btn btn-secondary btn-sm`}
            style={{
              justifyContent: 'flex-start',
              background: activeTab === 'players' ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
              borderColor: activeTab === 'players' ? 'var(--neon-blue)' : 'transparent',
              color: activeTab === 'players' ? 'var(--neon-blue)' : 'var(--text-secondary)'
            }}
          >
            👤 Player Management
          </button>

          <button
            id="tab-scores"
            onClick={() => setActiveTab('scores')}
            className={`btn btn-secondary btn-sm`}
            style={{
              justifyContent: 'flex-start',
              background: activeTab === 'scores' ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
              borderColor: activeTab === 'scores' ? 'var(--neon-blue)' : 'transparent',
              color: activeTab === 'scores' ? 'var(--neon-blue)' : 'var(--text-secondary)'
            }}
          >
            🏆 Score Upload
          </button>

          <button
            id="tab-export"
            onClick={() => setActiveTab('export')}
            className={`btn btn-secondary btn-sm`}
            style={{
              justifyContent: 'flex-start',
              background: activeTab === 'export' ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
              borderColor: activeTab === 'export' ? 'var(--neon-blue)' : 'transparent',
              color: activeTab === 'export' ? 'var(--neon-blue)' : 'var(--text-secondary)'
            }}
          >
            📥 Data Export Tool
          </button>
        </nav>

        {/* Footer info & Logout */}
        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ marginBottom: 'var(--space-sm)' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.displayName}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Logged in as Admin</p>
          </div>
          <button
            id="btn-admin-logout"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="btn btn-danger btn-sm"
            style={{ width: '100%' }}
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flexGrow: 1, padding: 'var(--space-xl)', overflowY: 'auto', maxHeight: '100vh' }}>
        {activeTab === 'overview' && (
          <OverviewTab stats={stats} user={user} setActiveTab={setActiveTab} />
        )}
        {activeTab === 'games' && (
          <GamesTab showToast={showToast} />
        )}
        {activeTab === 'teams' && (
          <TeamsTab showToast={showToast} />
        )}
        {activeTab === 'players' && (
          <PlayersTab showToast={showToast} />
        )}
        {activeTab === 'scores' && (
          <ScoresTab showToast={showToast} />
        )}
        {activeTab === 'export' && (
          <ExportTab showToast={showToast} />
        )}
      </main>
    </div>
  );
}

// ─── 1. OVERVIEW TAB ──────────────────────────────────
function OverviewTab({ stats, user, setActiveTab }) {
  return (
    <div style={{ animation: 'fadeIn var(--transition-base)' }}>
      <div className="page-header">
        <h1 className="page-title">Welcome Back, {user?.displayName}!</h1>
        <p className="page-subtitle">Tournament command center overview and real-time operations stats.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => setActiveTab('games')} style={{ cursor: 'pointer' }}>
          <div className="stat-value">{stats.games}</div>
          <div className="stat-label">Active Tournaments</div>
        </div>
        <div className="stat-card" onClick={() => setActiveTab('teams')} style={{ cursor: 'pointer' }}>
          <div className="stat-value">{stats.teams}</div>
          <div className="stat-label">Registered Teams</div>
        </div>
        <div className="stat-card" onClick={() => setActiveTab('players')} style={{ cursor: 'pointer' }}>
          <div className="stat-value">{stats.players}</div>
          <div className="stat-label">Total Players</div>
        </div>
      </div>

      <div className="card card-glow" style={{ marginTop: 'var(--space-xl)' }}>
        <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--neon-blue)' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('games')}>➕ Create New Tournament</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('scores')}>✏️ Update Team Standings</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('export')}>📊 Export CSV Records</button>
        </div>
      </div>
    </div>
  );
}

// ─── 2. GAMES TAB (CRUD) ──────────────────────────────
function GamesTab({ showToast }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ game_title: '', tournament_name: '', num_rounds: 3, status: 'active', description: '', start_date: '', end_date: '', registration_deadline: '', prize_pool: '' });
  const [editingId, setEditingId] = useState(null);

  // ISO (UTC) → value for <input type="datetime-local"> (local wall-clock, "YYYY-MM-DDTHH:mm")
  const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const fetchGames = () => {
    setLoading(true);
    api.get('/games/all')
      .then(res => setGames(res.data.games))
      .catch(() => showToast('Failed to load games.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.name === 'num_rounds' ? parseInt(e.target.value) : e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.patch(`/games/${editingId}`, formData);
        showToast('Tournament updated successfully.');
      } else {
        await api.post('/games/create', formData);
        showToast('New tournament created.');
      }
      setFormData({ game_title: '', tournament_name: '', num_rounds: 3, status: 'active', description: '', start_date: '', end_date: '', registration_deadline: '', prize_pool: '' });
      setEditingId(null);
      fetchGames();
    } catch (err) {
      showToast('Failed to save tournament.', 'error');
    }
  };

  const startEdit = (g) => {
    setEditingId(g.id);
    setFormData({
      game_title: g.game_title, tournament_name: g.tournament_name, num_rounds: g.num_rounds, status: g.status,
      description: g.description || '', prize_pool: g.prize_pool || '',
      start_date: toLocalInput(g.start_date), end_date: toLocalInput(g.end_date), registration_deadline: toLocalInput(g.registration_deadline),
    });
  };

  const deleteGame = async (id) => {
    if (!window.confirm('Delete this tournament? This will delete all registered teams, players, and scoreboard scores!')) return;
    try {
      await api.delete(`/games/${id}`);
      showToast('Tournament deleted successfully.');
      fetchGames();
    } catch (err) {
      showToast('Failed to delete tournament.', 'error');
    }
  };

  return (
    <div style={{ animation: 'fadeIn var(--transition-base)' }}>
      <div className="page-header">
        <h1 className="page-title">Manage Tournaments</h1>
        <p className="page-subtitle">Configure games, set tournament rounds, and toggle status</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
        {/* Form */}
        <section className="card">
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>{editingId ? 'Edit Tournament' : 'Create Tournament'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Game Title</label>
              <input id="game-title-input" name="game_title" className="form-input" value={formData.game_title} onChange={handleChange} placeholder="e.g. Valorant, PUBG, CS2" required />
            </div>
            <div className="form-group">
              <label className="form-label">Tournament Label / Name</label>
              <input id="game-tourney-input" name="tournament_name" className="form-input" value={formData.tournament_name} onChange={handleChange} placeholder="e.g. Summer Esports Championship" required />
            </div>
            <div className="form-group">
              <label className="form-label">Number of Rounds</label>
              <input id="game-rounds-input" name="num_rounds" type="number" min="1" max="10" className="form-input" value={formData.num_rounds} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select name="status" className="form-select" value={formData.status} onChange={handleChange}>
                <option value="active">Active (visible to players)</option>
                <option value="inactive">Inactive (hidden / draft)</option>
              </select>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', margin: 'var(--space-md) 0', paddingTop: 'var(--space-sm)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Event details (shown to players)</p>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea name="description" className="form-input" rows="3" value={formData.description} onChange={handleChange} placeholder="What's this tournament about — format, rules, who can join…" />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Start Date</label>
                <input name="start_date" type="datetime-local" className="form-input" value={formData.start_date} onChange={handleChange} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">End Date (optional)</label>
                <input name="end_date" type="datetime-local" className="form-input" value={formData.end_date} onChange={handleChange} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Registration Deadline</label>
                <input name="registration_deadline" type="datetime-local" className="form-input" value={formData.registration_deadline} onChange={handleChange} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Prize Pool</label>
                <input name="prize_pool" className="form-input" value={formData.prize_pool} onChange={handleChange} placeholder="e.g. $5,000" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button id="game-save-btn" type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Create'}</button>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setEditingId(null);
                  setFormData({ game_title: '', tournament_name: '', num_rounds: 3, status: 'active', description: '', start_date: '', end_date: '', registration_deadline: '', prize_pool: '' });
                }}>Cancel</button>
              )}
            </div>
          </form>
        </section>

        {/* List */}
        <section className="card">
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>Active Tournaments</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}><span className="spinner"></span></div>
          ) : games.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No tournaments created yet.</p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title / Name</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Rounds</th>
                    <th style={{ width: '100px' }}>Status</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map(g => (
                    <tr key={g.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{g.game_title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{g.tournament_name}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{g.num_rounds}</td>
                      <td>
                        <span className={`badge badge-${g.status}`}>
                          {g.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', marginRight: '4px' }} onClick={() => startEdit(g)}>✏️</button>
                        <button className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => deleteGame(g.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── 3. TEAMS TAB (CRUD) ──────────────────────────────
function TeamsTab({ showToast }) {
  const [teams, setTeams] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ team_name: '', leader_name: '', game_id: '' });
  const [success, setSuccess] = useState(null);

  const fetchTeams = () => {
    setLoading(true);
    api.get('/teams/all')
      .then(res => setTeams(res.data.teams))
      .catch(() => showToast('Failed to load teams.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTeams();
    api.get('/games/all').then(res => setGames(res.data.games)).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/teams/create', formData);
      setSuccess(res.data);
      showToast('New team manually created!');
      setFormData({ team_name: '', leader_name: '', game_id: '' });
      fetchTeams();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create team.', 'error');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const copyAll = (data) => {
    const text = `Team Name: ${data.team.team_name}\nTeam Unique Code: ${data.team.unique_code}\nTeam Leader Username: ${data.leader_username}\nTeam Leader Password: ${data.leader_password}`;
    navigator.clipboard.writeText(text);
  };

  const unregisterTeam = async (t) => {
    if (!window.confirm(`Remove "${t.team_name}" from ${t.tournament_name}?`)) return;
    try {
      await api.delete(`/teams/${t.team_id}/registration/${t.game_id}`);
      showToast('Team removed from the tournament.');
      fetchTeams();
    } catch (err) {
      showToast('Failed to remove team.', 'error');
    }
  };

  return (
    <div style={{ animation: 'fadeIn var(--transition-base)' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Registered Teams</h1>
          <p className="page-subtitle">Teams registered across your tournaments — one row per registration</p>
        </div>
        <button id="btn-add-team-modal" className="btn btn-primary btn-sm" onClick={() => { setSuccess(null); setShowModal(true); }}>➕ Add Team Manually</button>
      </div>

      {/* Roster Table */}
      <section className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}><span className="spinner"></span></div>
        ) : teams.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛡️</div>
            <p className="empty-state-text">No teams registered yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Team Name</th>
                  <th>Join Code</th>
                  <th>Game / Tournament</th>
                  <th>Team Leader</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Players</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map(t => (
                  <tr key={t.registration_id}>
                    <td style={{ fontWeight: 600 }}>{t.team_name}</td>
                    <td>
                      <code style={{ color: 'var(--neon-cyan)', fontFamily: 'var(--font-heading)', letterSpacing: '1px' }}>
                        {t.unique_code}
                      </code>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{gLabel(t)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.game_title}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{t.leader_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>@{t.leader_username}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-active">{t.player_count}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }} title="Remove from this tournament" onClick={() => unregisterTeam(t)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Manual Add Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            {success ? (
              <>
                <h2 className="modal-title">🎉 Team Created Manually!</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Please save these credentials to pass to the team leader:
                </p>
                <div className="credentials-card" style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Team Unique Code</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input id="modal-display-team-code" className="form-input" style={{ fontFamily: 'monospace', flexGrow: 1, padding: '0.3rem 0.5rem', fontSize: '0.85rem' }} readOnly value={success.team.unique_code} />
                      <button id="modal-copy-team-code-btn" type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem' }} onClick={() => copyToClipboard(success.team.unique_code)}>Copy</button>
                    </div>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Team Leader Username</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input id="modal-display-leader-username" className="form-input" style={{ fontFamily: 'monospace', flexGrow: 1, padding: '0.3rem 0.5rem', fontSize: '0.85rem' }} readOnly value={success.leader_username} />
                      <button id="modal-copy-leader-username-btn" type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem' }} onClick={() => copyToClipboard(success.leader_username)}>Copy</button>
                    </div>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Team Leader Password</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input id="modal-display-leader-password" className="form-input" style={{ fontFamily: 'monospace', flexGrow: 1, padding: '0.3rem 0.5rem', fontSize: '0.85rem' }} readOnly value={success.leader_password} />
                      <button id="modal-copy-leader-password-btn" type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem' }} onClick={() => copyToClipboard(success.leader_password)}>Copy</button>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button id="modal-copy-all-btn" type="button" className="btn btn-secondary btn-sm" style={{ flexGrow: 1 }} onClick={() => copyAll(success)}>Copy All</button>
                  <button id="modal-done-btn" type="button" className="btn btn-primary btn-sm" style={{ flexGrow: 1 }} onClick={() => { setShowModal(false); setSuccess(null); }}>Done</button>
                </div>
              </>
            ) : (
              <>
                <h2 className="modal-title">Add Team Manually</h2>
                <form onSubmit={handleCreate}>
                  <div className="form-group">
                    <label className="form-label">Team Name</label>
                    <input id="modal-team-name" name="team_name" className="form-input" value={formData.team_name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Leader Display Name</label>
                    <input id="modal-leader-name" name="leader_name" className="form-input" value={formData.leader_name} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Game / Tournament</label>
                    <select name="game_id" className="form-select" value={formData.game_id} onChange={handleChange} required>
                      <option value="">Select a tournament...</option>
                      {games.filter(g => g.status === 'active').map(g => (
                        <option key={g.id} value={g.id}>{g.tournament_name} ({g.game_title})</option>
                      ))}
                    </select>
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
                    <button id="modal-submit-btn" type="submit" className="btn btn-primary btn-sm">Add Team</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  function gLabel(t) {
    return t.tournament_name && t.tournament_name.length > 25
      ? t.tournament_name.substring(0, 25) + '...'
      : t.tournament_name;
  }
}

// ─── 4. PLAYERS TAB (CRUD) ────────────────────────────
function PlayersTab({ showToast }) {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTeam, setFilterTeam] = useState('');

  // Manual Add State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', in_game_name: '', email: '', phone: '', team_id: '' });

  const fetchPlayers = () => {
    setLoading(true);
    let url = '/players/all';
    const params = [];
    if (filterTeam) params.push(`team_id=${filterTeam}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    api.get(url)
      .then(res => setPlayers(res.data.players))
      .catch(() => showToast('Failed to load players.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlayers();
  }, [search, filterTeam]);

  useEffect(() => {
    api.get('/teams/all').then(res => setTeams(res.data.teams)).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/players/add', formData);
      showToast('Player manually added successfully!');
      setShowModal(false);
      setFormData({ full_name: '', in_game_name: '', email: '', phone: '', team_id: '' });
      fetchPlayers();
    } catch (err) {
      showToast('Failed to add player.', 'error');
    }
  };

  const deletePlayer = async (id) => {
    if (!window.confirm('Remove this player from the tournament roster?')) return;
    try {
      await api.delete(`/players/${id}`);
      showToast('Player removed.');
      fetchPlayers();
    } catch (err) {
      showToast('Failed to remove player.', 'error');
    }
  };

  return (
    <div style={{ animation: 'fadeIn var(--transition-base)' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Manage Player Roster</h1>
          <p className="page-subtitle">View, filter, or manually add players into tournament squads</p>
        </div>
        <button id="btn-add-player-modal" className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>➕ Add Player Manually</button>
      </div>

      {/* Filter / Search Bar */}
      <section className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <div style={{ flexGrow: 1, minWidth: '200px' }}>
            <input
              id="search-player-input"
              className="form-input"
              placeholder="🔍 Search players by name or in-game ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ width: '220px' }}>
            <select
              id="filter-team-select"
              className="form-select"
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
            >
              <option value="">All Teams</option>
              {Array.from(new Map(teams.map(t => [t.team_id, t])).values()).map(t => (
                <option key={t.team_id} value={t.team_id}>{t.team_name} ({t.game})</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* List */}
      <section className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}><span className="spinner"></span></div>
        ) : players.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <p className="empty-state-text">No players found matching current filters.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Player Details</th>
                  <th>In-Game Name</th>
                  <th>Contact Info</th>
                  <th>Assigned Team</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.full_name}</div>
                    </td>
                    <td>
                      <span className="badge badge-active" style={{ fontFamily: 'var(--font-heading)' }}>
                        {p.in_game_name}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div>{p.email || '—'}</div>
                      <div>{p.phone || '—'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.team_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.game_title}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => deletePlayer(p.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2 className="modal-title">Add Player Manually</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input id="modal-player-name" name="full_name" className="form-input" value={formData.full_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">In-Game Name (IGN)</label>
                <input id="modal-player-ign" name="in_game_name" className="form-input" value={formData.in_game_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email (Optional)</label>
                <input id="modal-player-email" name="email" type="email" className="form-input" value={formData.email} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone (Optional)</label>
                <input id="modal-player-phone" name="phone" className="form-input" value={formData.phone} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Team Squad</label>
                <select name="team_id" className="form-select" value={formData.team_id} onChange={handleChange} required>
                  <option value="">Select a team...</option>
                  {Array.from(new Map(teams.map(t => [t.team_id, t])).values()).map(t => (
                    <option key={t.team_id} value={t.team_id}>{t.team_name} — {t.game}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
                <button id="modal-player-submit" type="submit" className="btn btn-primary btn-sm">Add Player</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 5. SCORES TAB (UPLOAD) ───────────────────────────
function ScoresTab({ showToast }) {
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);

  // Holds unsaved round scores. Structure: { [teamId]: [r1, r2, r3] }
  const [draftScores, setDraftScores] = useState({});

  useEffect(() => {
    api.get('/games/all').then(res => {
      setGames(res.data.games);
      if (res.data.games.length > 0) {
        setSelectedGameId(res.data.games[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedGameId) return;

    setLoading(true);
    // Find complete game object
    const g = games.find(x => x.id === parseInt(selectedGameId));
    setSelectedGame(g);

    api.get(`/scores/${selectedGameId}`)
      .then(res => {
        setScores(res.data.scoreboard);
        // Scaffolding draft scores with database scores or empty arrays
        const draft = {};
        res.data.scoreboard.forEach(s => {
          draft[s.team_id] = Array.from({ length: g.num_rounds }).map((_, idx) => (
            s.round_scores[idx] !== undefined ? s.round_scores[idx] : 0
          ));
        });
        setDraftScores(draft);
      })
      .catch(() => showToast('Failed to load scoreboard.', 'error'))
      .finally(() => setLoading(false));
  }, [selectedGameId, games]);

  const handleScoreChange = (teamId, roundIndex, value) => {
    const parsed = parseInt(value) || 0;
    const current = [...(draftScores[teamId] || [])];
    current[roundIndex] = parsed;
    setDraftScores({ ...draftScores, [teamId]: current });
  };

  const saveTeamScore = async (teamId) => {
    const rounds = draftScores[teamId] || [];
    try {
      await api.post('/scores/update', {
        team_id: teamId,
        game_id: parseInt(selectedGameId),
        round_scores: rounds
      });
      showToast('Standings updated successfully.');

      // Refresh scoreboard to verify total aggregation updates
      const res = await api.get(`/scores/${selectedGameId}`);
      setScores(res.data.scoreboard);
    } catch (err) {
      showToast('Failed to update scores.', 'error');
    }
  };

  return (
    <div style={{ animation: 'fadeIn var(--transition-base)' }}>
      <div className="page-header">
        <h1 className="page-title">Upload Round Scores</h1>
        <p className="page-subtitle">Upload points per round per squad; rankings aggregate automatically</p>
      </div>

      {/* Select game */}
      <section className="card" style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-lg)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Select Tournament</label>
          <select
            id="score-game-selector"
            className="form-select"
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
          >
            {games.map(g => (
              <option key={g.id} value={g.id}>{g.tournament_name} — {g.game_title}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Input Form */}
      {selectedGame && (
        <section className="card">
          <h3 style={{ marginBottom: 'var(--space-lg)', color: 'var(--neon-blue)' }}>
            Squad Standings — {selectedGame.tournament_name} ({selectedGame.num_rounds} Rounds Format)
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}><span className="spinner"></span></div>
          ) : scores.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏆</div>
              <p className="empty-state-text">No teams registered under this tournament yet.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px', textAlign: 'center' }}>Current Rank</th>
                    <th>Team Name</th>
                    {Array.from({ length: selectedGame.num_rounds }).map((_, idx) => (
                      <th key={idx} style={{ textAlign: 'center', width: '120px' }}>Round {idx + 1} Points</th>
                    ))}
                    <th style={{ textAlign: 'center', width: '100px', color: 'var(--neon-cyan)' }}>Aggregate Total</th>
                    <th style={{ textAlign: 'right', width: '120px' }}>Sync</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((row) => (
                    <tr key={row.team_id}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{row.rank}</td>
                      <td style={{ fontWeight: 600 }}>{row.team_name}</td>
                      {Array.from({ length: selectedGame.num_rounds }).map((_, idx) => (
                        <td key={idx} style={{ textAlign: 'center' }}>
                          <input
                            id={`score-input-${row.team_id}-${idx}`}
                            type="number"
                            min="0"
                            className="form-input"
                            style={{ width: '80px', textAlign: 'center', padding: '0.4rem 0.5rem', margin: '0 auto' }}
                            value={draftScores[row.team_id]?.[idx] !== undefined ? draftScores[row.team_id][idx] : 0}
                            onChange={(e) => handleScoreChange(row.team_id, idx, e.target.value)}
                          />
                        </td>
                      ))}
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--neon-cyan)', fontSize: '1.05rem' }}>
                        {row.total_score}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          id={`score-save-btn-${row.team_id}`}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '0.4rem 0.8rem' }}
                          onClick={() => saveTeamScore(row.team_id)}
                        >
                          💾 Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ─── 6. EXPORT TAB ───────────────────────────────────
function ExportTab({ showToast }) {
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [dataType, setDataType] = useState('combined');
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    api.get('/games/all').then(res => {
      setGames(res.data.games);
    }).catch(() => {});
  }, []);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const response = await api.post('/export', {
        data_type: dataType,
        game_id: selectedGameId ? parseInt(selectedGameId) : null
      }, { responseType: 'blob' });

      // Create blob download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ggboard_export_${dataType}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('CSV downloaded successfully.');
    } catch (err) {
      showToast('Export failed. Verify tournament database entries.', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn var(--transition-base)' }}>
      <div className="page-header">
        <h1 className="page-title">CSV Data Export Center</h1>
        <p className="page-subtitle">Configure columns, export team rosters, player details, or score summaries</p>
      </div>

      <section className="card card-glow" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h3 style={{ marginBottom: 'var(--space-lg)', color: 'var(--neon-blue)' }}>Export Setup</h3>

        <div className="form-group">
          <label className="form-label">1. Choose Data Category</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
              <input type="radio" name="exportType" checked={dataType === 'combined'} onChange={() => setDataType('combined')} />
              <span>Combined Data (Squad Roster + aggregate scoreboard standing points)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
              <input type="radio" name="exportType" checked={dataType === 'players'} onChange={() => setDataType('players')} />
              <span>Squad Player roster lists only</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
              <input type="radio" name="exportType" checked={dataType === 'scores'} onChange={() => setDataType('scores')} />
              <span>Live aggregates scoreboard standings only</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">2. Filter by Tournament (Optional)</label>
          <select
            id="export-game-select"
            className="form-select"
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
          >
            <option value="">All Tournaments (Combined)</option>
            {games.map(g => (
              <option key={g.id} value={g.id}>{g.tournament_name} ({g.game_title})</option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 'var(--space-xl)' }}>
          <button
            id="btn-export-download"
            onClick={handleExport}
            className="btn btn-primary"
            style={{ width: '100%', padding: '1rem' }}
            disabled={exportLoading}
          >
            {exportLoading ? <span className="spinner"></span> : '📥 Download CSV Export'}
          </button>
        </div>
      </section>
    </div>
  );
}
