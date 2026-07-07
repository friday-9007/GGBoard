/**
 * Admin Panel Dashboard — ggBoard
 * The primary operations center for admins.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// ─── Shared helpers ───────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

// Date-driven lifecycle phase for a tournament.
function eventPhase(g) {
  if (g.status !== 'active') return { label: 'Inactive', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.06)' };
  const now = Date.now();
  const s = g.start_date ? new Date(g.start_date).getTime() : null;
  const e = g.end_date ? new Date(g.end_date).getTime() : null;
  if (e && e < now) return { label: 'Completed', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.06)' };
  if (s && s > now) return { label: 'Upcoming', color: 'var(--neon-blue)', bg: 'rgba(0,212,255,0.12)' };
  return { label: 'Ongoing', color: 'var(--neon-cyan)', bg: 'rgba(6,255,210,0.12)' };
}

function PhaseBadge({ g }) {
  const p = eventPhase(g);
  return <span className="badge" style={{ background: p.bg, color: p.color, border: `1px solid ${p.color}` }}>{p.label}</span>;
}

// Sidebar nav item with an active accent bar (matches the player dashboard).
function NavButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="btn btn-secondary btn-sm"
      style={{
        justifyContent: 'flex-start',
        gap: '0.55rem',
        border: '1px solid transparent',
        borderLeft: `3px solid ${active ? 'var(--neon-blue)' : 'transparent'}`,
        borderRadius: 'var(--radius-sm)',
        background: active ? 'linear-gradient(90deg, rgba(0, 212, 255, 0.16), rgba(0, 212, 255, 0.02))' : 'transparent',
        color: active ? 'var(--neon-blue)' : 'var(--text-secondary)',
        boxShadow: active ? 'inset 0 0 20px rgba(0, 212, 255, 0.08)' : 'none',
        backdropFilter: 'none',
      }}
    >
      {children}
    </button>
  );
}

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
        flexDirection: 'column',
        padding: 'var(--space-lg)'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 'var(--space-2xl)', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', letterSpacing: '2px' }}>
            <span style={{ color: 'var(--neon-blue)' }}>GG</span>BOARD
          </h2>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Organizer Console
          </span>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', flexGrow: 1 }}>
          <NavButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>📊 Overview</NavButton>
          <NavButton active={activeTab === 'games'} onClick={() => setActiveTab('games')}>🎮 Tournaments</NavButton>
          <NavButton active={activeTab === 'teams'} onClick={() => setActiveTab('teams')}>🛡️ Teams</NavButton>
          <NavButton active={activeTab === 'players'} onClick={() => setActiveTab('players')}>👤 Players</NavButton>
          <NavButton active={activeTab === 'scores'} onClick={() => setActiveTab('scores')}>🏆 Scores</NavButton>
          <NavButton active={activeTab === 'export'} onClick={() => setActiveTab('export')}>📥 Export</NavButton>
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
function OverviewTab({ user, setActiveTab }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/games/all').then((res) => setGames(res.data.games || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const ongoing = games.filter((g) => eventPhase(g).label === 'Ongoing').length;
  const upcoming = games.filter((g) => eventPhase(g).label === 'Upcoming').length;
  const totalReg = games.reduce((n, g) => n + (g.team_count || 0), 0);
  const order = { Ongoing: 0, Upcoming: 1, Completed: 2, Inactive: 3 };
  const sorted = [...games].sort((a, b) => order[eventPhase(a).label] - order[eventPhase(b).label]);

  return (
    <div style={{ animation: 'fadeIn var(--transition-base)' }}>
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user?.displayName}!</h1>
        <p className="page-subtitle">Your tournaments, registrations, and standings at a glance.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => setActiveTab('games')} style={{ cursor: 'pointer' }}>
          <div className="stat-value">{games.length}</div>
          <div className="stat-label">Tournaments</div>
        </div>
        <div className="stat-card" onClick={() => setActiveTab('games')} style={{ cursor: 'pointer' }}>
          <div className="stat-value">{ongoing}</div>
          <div className="stat-label">Ongoing</div>
        </div>
        <div className="stat-card" onClick={() => setActiveTab('games')} style={{ cursor: 'pointer' }}>
          <div className="stat-value">{upcoming}</div>
          <div className="stat-label">Upcoming</div>
        </div>
        <div className="stat-card" onClick={() => setActiveTab('teams')} style={{ cursor: 'pointer' }}>
          <div className="stat-value">{totalReg}</div>
          <div className="stat-label">Registered Teams</div>
        </div>
      </div>

      <section className="card" style={{ marginTop: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h3 style={{ margin: 0 }}>Your Tournaments</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('games')}>➕ New Tournament</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}><span className="spinner"></span></div>
        ) : games.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎮</div>
            <p className="empty-state-text">No tournaments yet — create your first one.</p>
            <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('games')}>Create Tournament</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
            {sorted.map((g) => (
              <div key={g.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--surface-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{g.tournament_name}</div>
                    <span className="badge badge-active" style={{ fontFamily: 'var(--font-heading)', marginTop: 4 }}>{g.game_title}</span>
                  </div>
                  <PhaseBadge g={g} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 0.9rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>🛡️ {g.team_count || 0} teams</span>
                  <span>🎯 {g.num_rounds} rounds</span>
                  {fmtDate(g.start_date) && <span>🗓️ {fmtDate(g.start_date)}</span>}
                  {g.prize_pool && <span style={{ color: 'var(--neon-cyan)' }}>🏆 {g.prize_pool}</span>}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto' }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1, padding: '0.35rem' }} onClick={() => setActiveTab('scores')}>Scores</button>
                  <Link to="/scoreboard" className="btn btn-secondary btn-sm" style={{ flex: 1, padding: '0.35rem', textAlign: 'center' }}>Scoreboard</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
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
                    <th style={{ width: '110px' }}>Phase</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Teams</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>Rounds</th>
                    <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map(g => (
                    <tr key={g.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{g.game_title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{g.tournament_name}</div>
                        {(fmtDate(g.start_date) || g.prize_pool) && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {fmtDate(g.start_date) && <span>🗓️ {fmtDate(g.start_date)}</span>}
                            {g.prize_pool && <span style={{ color: 'var(--neon-cyan)', marginLeft: 8 }}>🏆 {g.prize_pool}</span>}
                          </div>
                        )}
                      </td>
                      <td><PhaseBadge g={g} /></td>
                      <td style={{ textAlign: 'center' }}><span className="badge badge-active">{g.team_count || 0}</span></td>
                      <td style={{ textAlign: 'center' }}>{g.num_rounds}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Link to="/scoreboard" className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', marginRight: '4px' }} title="Public scoreboard">📊</Link>
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
  const [viewTeam, setViewTeam] = useState(null); // registration row being drilled into

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
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', marginRight: '4px' }} title="View roster" onClick={() => setViewTeam(t)}>👁️</button>
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

      {viewTeam && <TeamRosterModal reg={viewTeam} onClose={() => setViewTeam(null)} />}
    </div>
  );

  function gLabel(t) {
    return t.tournament_name && t.tournament_name.length > 25
      ? t.tournament_name.substring(0, 25) + '...'
      : t.tournament_name;
  }
}

// Drill into a registered team: its roster within this tournament + leader + code.
function TeamRosterModal({ reg, onClose }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/players/all?team_id=${reg.team_id}&game_id=${reg.game_id}`)
      .then((res) => setPlayers(res.data.players || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reg.team_id, reg.game_id]);

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 620 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
          <div>
            <h2 className="modal-title" style={{ marginBottom: 4 }}>{reg.team_name}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{reg.game} · {reg.tournament_name}</p>
          </div>
          <span className="badge badge-active" style={{ fontFamily: 'var(--font-heading)' }}>{reg.game}</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 1.2rem', fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 'var(--space-md) 0' }}>
          <span>👑 Leader: <strong>{reg.leader_name || '—'}</strong> {reg.leader_username && <span style={{ color: 'var(--text-muted)' }}>@{reg.leader_username}</span>}</span>
          <span>🔑 Code: <code style={{ color: 'var(--neon-cyan)', fontFamily: 'var(--font-heading)', letterSpacing: '1px' }}>{reg.unique_code}</code></span>
        </div>

        <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-sm)' }}>Roster ({players.length})</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-lg)' }}><span className="spinner"></span></div>
        ) : players.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No roster members have joined yet.</p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Player</th><th>In-Game Name</th><th>Contact</th></tr></thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.full_name}</td>
                    <td><span className="badge badge-active" style={{ fontFamily: 'var(--font-heading)' }}>{p.in_game_name}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div>{p.email || '—'}</div>
                      <div>{p.phone || '—'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-primary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
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

  const [editing, setEditing] = useState(null);
  const saveEdit = async (id, data) => {
    try {
      await api.patch(`/players/${id}`, data);
      showToast('Player updated.');
      setEditing(null);
      fetchPlayers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update player.', 'error');
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
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', marginRight: '4px' }} onClick={() => setEditing(p)}>✏️</button>
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

      {editing && <EditPlayerModal player={editing} onCancel={() => setEditing(null)} onSave={saveEdit} />}
    </div>
  );
}

// Inline edit for an existing roster player (admin).
function EditPlayerModal({ player, onCancel, onSave }) {
  const [form, setForm] = useState({
    full_name: player.full_name || '', in_game_name: player.in_game_name || '',
    email: player.email || '', phone: player.phone || '',
  });
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 className="modal-title">Edit Player</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>{player.team_name} · {player.game_title}</p>
        <form onSubmit={(e) => { e.preventDefault(); onSave(player.id, form); }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input name="full_name" className="form-input" value={form.full_name} onChange={change} required />
          </div>
          <div className="form-group">
            <label className="form-label">In-Game Name</label>
            <input name="in_game_name" className="form-input" value={form.in_game_name} onChange={change} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-input" value={form.email} onChange={change} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input name="phone" className="form-input" value={form.phone} onChange={change} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">Save Changes</button>
          </div>
        </form>
      </div>
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
const FIELD_LABELS = {
  team_name: 'Team', full_name: 'Full Name', in_game_name: 'In-Game Name',
  email: 'Email', phone: 'Phone', game_title: 'Game', round_scores: 'Round Scores', total_score: 'Total Score',
};
const FIELDS_BY_TYPE = {
  combined: ['team_name', 'full_name', 'in_game_name', 'round_scores', 'total_score', 'game_title'],
  players: ['team_name', 'full_name', 'in_game_name', 'email', 'phone', 'game_title'],
  scores: ['team_name', 'round_scores', 'total_score', 'game_title'],
};

function ExportTab({ showToast }) {
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [dataType, setDataType] = useState('combined');
  const [fields, setFields] = useState(FIELDS_BY_TYPE.combined);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    api.get('/games/all').then(res => {
      setGames(res.data.games);
    }).catch(() => {});
  }, []);

  const pickType = (dt) => { setDataType(dt); setFields(FIELDS_BY_TYPE[dt]); };
  const toggleField = (k) => setFields((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const response = await api.post('/export', {
        data_type: dataType,
        game_id: selectedGameId ? parseInt(selectedGameId) : null,
        fields: FIELDS_BY_TYPE[dataType].filter((k) => fields.includes(k)), // canonical order
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
              <input type="radio" name="exportType" checked={dataType === 'combined'} onChange={() => pickType('combined')} />
              <span>Combined (roster + scoreboard totals)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
              <input type="radio" name="exportType" checked={dataType === 'players'} onChange={() => pickType('players')} />
              <span>Player rosters only</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
              <input type="radio" name="exportType" checked={dataType === 'scores'} onChange={() => pickType('scores')} />
              <span>Scoreboard standings only</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">2. Columns ({fields.length} selected)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--space-xs)' }}>
            {FIELDS_BY_TYPE[dataType].map((k) => {
              const on = fields.includes(k);
              return (
                <label key={k} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                  padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-md)', fontSize: '0.82rem',
                  border: `1px solid ${on ? 'var(--neon-blue)' : 'var(--border-color)'}`,
                  background: on ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
                  color: on ? 'var(--neon-blue)' : 'var(--text-secondary)',
                }}>
                  <input type="checkbox" checked={on} onChange={() => toggleField(k)} style={{ accentColor: 'var(--neon-blue)' }} />
                  {FIELD_LABELS[k] || k}
                </label>
              );
            })}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">3. Filter by Tournament (Optional)</label>
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
            disabled={exportLoading || fields.length === 0}
          >
            {exportLoading ? <span className="spinner"></span> : fields.length === 0 ? 'Select at least one column' : '📥 Download CSV Export'}
          </button>
        </div>
      </section>
    </div>
  );
}
