/**
 * Player Hub — ggBoard
 * Sidebar dashboard for a logged-in player. Accessible with or without a team.
 *  • Overview   — status + quick actions
 *  • My Team    — team + roster management (leader/member), or Create/Join when teamless
 *  • Standings  — the team's live rank / points
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// Competitive titles offered in the profile picker. Add/remove freely.
const ESPORTS_GAMES = [
  'Valorant', 'BGMI', 'Free Fire', 'CS2', 'COD Mobile', 'PUBG PC',
  'Dota 2', 'League of Legends', 'Apex Legends', 'Fortnite',
  'Rocket League', 'Rainbow Six Siege', 'Overwatch 2', 'Mobile Legends', 'eFootball',
];

// Per-game identity fields. Two stored slots (ign, uid) relabelled per game.
// `tagPrefix: '#'` renders/joins as "Name#Suffix" (Riot ID, Activision ID, BattleTag).
const RIOT_ID = { f1: 'Game Name', f2: 'Tagline', tagPrefix: '#', f2hint: 'e.g. IND' };
const GAME_ID_CONFIG = {
  'Valorant':          RIOT_ID,
  'League of Legends': RIOT_ID,
  'BGMI':              { f1: 'Character Name', f2: 'Character ID', f2hint: 'Numeric ID' },
  'Free Fire':         { f1: 'Nickname', f2: 'UID', f2hint: 'Numeric UID' },
  'CS2':               { f1: 'Steam Name', f2: 'Friend Code', f2hint: 'Steam friend code' },
  'COD Mobile':        { f1: 'Activision ID', f2: 'ID Number', tagPrefix: '#', f2hint: 'digits after #' },
  'PUBG PC':           { f1: 'In-Game Name', f2: 'Account ID' },
  'Dota 2':            { f1: 'Steam Name', f2: 'Friend ID', f2hint: 'Steam friend ID' },
  'Apex Legends':      { f1: 'In-Game Name', f2: 'Platform', f2hint: 'PC / PSN / Xbox / Switch' },
  'Fortnite':          { f1: 'Epic Username', f2: 'Platform', f2hint: 'PC / PSN / Xbox / Switch' },
  'Rocket League':     { f1: 'In-Game Name', f2: 'Platform', f2hint: 'PC / PSN / Xbox / Switch' },
  'Rainbow Six Siege': { f1: 'Ubisoft ID', f2: 'Platform', f2hint: 'PC / PSN / Xbox' },
  'Overwatch 2':       { f1: 'BattleTag', f2: 'Number', tagPrefix: '#', f2hint: 'digits after #' },
  'Mobile Legends':    { f1: 'In-Game Name', f2: 'UID', f2hint: 'UID (Server)' },
  'eFootball':         { f1: 'In-Game Name', f2: 'Platform', f2hint: 'PC / Mobile / Console' },
};
const DEFAULT_ID_CONFIG = { f1: 'In-Game Name', f2: 'UID' };
const gameCfg = (game) => GAME_ID_CONFIG[game] || DEFAULT_ID_CONFIG;

// How an identity reads for display, e.g. "Phoenix#IND" (Valorant) or "ProGamer · 51234" (BGMI).
const formatGameId = (game, ign, uid) => {
  const c = gameCfg(game);
  if (!ign && !uid) return '';
  if (c.tagPrefix) return uid ? `${ign}${c.tagPrefix}${uid}` : ign;
  return uid ? `${ign} · ${uid}` : ign;
};

// In-game roles per title (for the profile's per-game Role picker). Games not
// listed here (e.g. Fortnite, eFootball) just get a free-text role.
const GAME_ROLES = {
  'Valorant': ['Duelist', 'Initiator', 'Controller', 'Sentinel', 'IGL', 'Flex'],
  'League of Legends': ['Top', 'Jungle', 'Mid', 'ADC', 'Support'],
  'BGMI': ['Assaulter', 'Sniper', 'Support', 'IGL', 'Fragger'],
  'PUBG PC': ['Assaulter', 'Sniper', 'Support', 'IGL', 'Fragger'],
  'Free Fire': ['Rusher', 'Sniper', 'Support', 'IGL'],
  'CS2': ['Entry', 'AWPer', 'IGL', 'Support', 'Lurker'],
  'Dota 2': ['Carry', 'Mid', 'Offlane', 'Soft Support', 'Hard Support'],
  'Overwatch 2': ['Tank', 'DPS', 'Support'],
  'Apex Legends': ['Fragger', 'IGL', 'Support'],
  'Rainbow Six Siege': ['Entry', 'Support', 'Anchor', 'Flex', 'IGL'],
  'Rocket League': ['Striker', 'Midfielder', 'Defender'],
  'Mobile Legends': ['Gold Lane', 'Exp Lane', 'Mid', 'Jungler', 'Roamer'],
};

// Age from a YYYY-MM-DD date of birth.
const computeAge = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
};

// The two identity inputs, labelled for the given game. `small` = compact (profile grid).
function GameIdInputs({ game, ign, uid, onIgn, onUid, small }) {
  const c = gameCfg(game);
  const s = small ? { padding: '0.35rem 0.5rem', fontSize: '0.8rem' } : {};
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <div style={{ flex: 1 }}>
        {!small && <label className="form-label">{c.f1}</label>}
        <input className="form-input" style={s} placeholder={c.f1hint || c.f1} value={ign} onChange={(e) => onIgn(e.target.value)} required={!small} />
      </div>
      <div style={{ flex: 1 }}>
        {!small && <label className="form-label">{c.f2}</label>}
        {c.tagPrefix ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{c.tagPrefix}</span>
            <input className="form-input" style={s} placeholder={c.f2hint || c.f2} value={uid} onChange={(e) => onUid(e.target.value.replace(/^#+/, ''))} required={!small} />
          </div>
        ) : (
          <input className="form-input" style={s} placeholder={c.f2hint || c.f2} value={uid} onChange={(e) => onUid(e.target.value)} required={!small} />
        )}
      </div>
    </div>
  );
}

export default function PlayerHub() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview'); // overview | team | standings | profile
  const [myTeams, setMyTeams] = useState([]); // one team per game, each with roster + events
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [preselectGame, setPreselectGame] = useState(null); // game to preselect when creating a team

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/teams/mine');
      setMyTeams(res.data.teams || []);
    } catch {
      showToast('Failed to load your teams.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  // "Register" on an event with no matching team → go create one (game preselected).
  const goCreateTeam = (game) => { setPreselectGame(game || null); setActiveTab('team'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      {/* ── Sidebar ── */}
      <aside style={{
        width: 'var(--sidebar-width)',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-lg)',
      }}>
        <div style={{ marginBottom: 'var(--space-2xl)', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', letterSpacing: '2px' }}>
            <span style={{ color: 'var(--neon-blue)' }}>GG</span>BOARD
          </h2>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Player Hub
          </span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', flexGrow: 1 }}>
          <NavButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>📊 Overview</NavButton>
          <NavButton active={activeTab === 'team'} onClick={() => setActiveTab('team')}>🛡️ My Teams</NavButton>
          <NavButton active={activeTab === 'standings'} onClick={() => setActiveTab('standings')}>🏆 Standings</NavButton>
          <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>👤 Profile</NavButton>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ marginBottom: 'var(--space-sm)' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.displayName || user?.username}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Logged in as Player</p>
          </div>
          <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={() => { logout(); navigate('/'); }}>🚪 Logout</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flexGrow: 1, padding: 'var(--space-xl)', overflowY: 'auto', maxHeight: '100vh' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}><span className="spinner spinner-lg"></span></div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab user={user} myTeams={myTeams} setActiveTab={setActiveTab} onCreateTeam={goCreateTeam} reload={loadTeams} showToast={showToast} />
            )}
            {activeTab === 'team' && (
              <MyTeamsTab myTeams={myTeams} reload={loadTeams} showToast={showToast} preselectGame={preselectGame} clearPreselect={() => setPreselectGame(null)} setActiveTab={setActiveTab} />
            )}
            {activeTab === 'standings' && (
              <StandingsTab myTeams={myTeams} setActiveTab={setActiveTab} />
            )}
            {activeTab === 'profile' && (
              <ProfileTab showToast={showToast} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

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

// ─── OVERVIEW ─────────────────────────────────────────
function OverviewTab({ user, myTeams, setActiveTab, onCreateTeam, reload, showToast }) {
  const [feed, setFeed] = useState({ ongoing: [], upcoming: [] });
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [gate, setGate] = useState(null); // { ev } awaiting game-profile before registering
  const [busy, setBusy] = useState(false);

  const loadFeed = () => {
    setLoadingEvents(true);
    api.get('/games/events')
      .then((res) => setFeed({ ongoing: res.data.ongoing || [], upcoming: res.data.upcoming || [] }))
      .catch(() => {})
      .finally(() => setLoadingEvents(false));
  };
  useEffect(() => { loadFeed(); }, []);

  const teamForGame = (title) => myTeams.find((t) => t.game.toLowerCase() === (title || '').toLowerCase()) || null;
  const registeredIds = new Set(myTeams.flatMap((t) => (t.events || []).map((e) => e.game_id)));
  const totalEvents = myTeams.reduce((n, t) => n + (t.events?.length || 0), 0);

  const doRegister = async (ev) => {
    const mt = teamForGame(ev.game_title);
    if (!mt) { onCreateTeam(ev.game_title); return; }                 // no team for this game → create one
    if (!mt.is_leader) { showToast('Only the team leader can register.', 'error'); return; }
    setBusy(true);
    try {
      await api.post('/teams/register', { game_id: ev.id });
      showToast(`Registered for ${ev.tournament_name}!`);
      await reload();
      loadFeed();
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'GAME_PROFILE_REQUIRED') setGate({ ev });
      else if (data?.code === 'NO_TEAM_FOR_GAME') onCreateTeam(ev.game_title);
      else showToast(data?.error || 'Failed to register.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const empty = feed.ongoing.length === 0 && feed.upcoming.length === 0;

  return (
    <div style={{ animation: 'fadeIn var(--transition-base)' }}>
      <div className="page-header">
        <h1 className="page-title">Hi, {user?.displayName || user?.username} 👋</h1>
        <p className="page-subtitle">Your player command center</p>
      </div>

      {myTeams.length > 0 ? (
        <div className="stats-grid">
          <div className="stat-card" onClick={() => setActiveTab('team')} style={{ cursor: 'pointer' }}>
            <div className="stat-value">{myTeams.length}</div>
            <div className="stat-label">My Teams</div>
          </div>
          <div className="stat-card" onClick={() => setActiveTab('standings')} style={{ cursor: 'pointer' }}>
            <div className="stat-value">{totalEvents}</div>
            <div className="stat-label">Events Registered</div>
          </div>
          <div className="stat-card" onClick={() => setActiveTab('team')} style={{ cursor: 'pointer' }}>
            <div className="stat-value" style={{ fontSize: '1rem', lineHeight: 1.5 }}>{myTeams.map((t) => t.game).join(' · ')}</div>
            <div className="stat-label">Games</div>
          </div>
        </div>
      ) : (
        <div className="card card-glow" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-xs)' }}>🎮</div>
          <h3 style={{ color: 'var(--neon-blue)', marginBottom: 'var(--space-xs)' }}>You're not on a team yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
            Create a team per game on <strong>My Teams</strong> (anytime — no event needed), then register it for events below.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('team')}>Go to My Teams →</button>
        </div>
      )}

      {/* ── Events feed ── */}
      <div style={{ marginTop: 'var(--space-2xl)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)' }}>🎟️ Tournaments &amp; Events</h2>
          <Link to="/scoreboard" className="btn btn-secondary btn-sm">📊 Full Scoreboard</Link>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>
          Register a team into any event for a game you play.
        </p>

        {loadingEvents ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}><span className="spinner"></span></div>
        ) : empty ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🗓️</div>
            <p style={{ color: 'var(--text-muted)' }}>No events are open right now. Check back soon!</p>
          </div>
        ) : (
          <>
            <EventSection title="🔴 Ongoing" events={feed.ongoing} teamForGame={teamForGame} registeredIds={registeredIds} busy={busy} onAction={doRegister} />
            <EventSection title="🗓️ Upcoming" events={feed.upcoming} teamForGame={teamForGame} registeredIds={registeredIds} busy={busy} onAction={doRegister} />
          </>
        )}
      </div>

      {gate && (
        <GameGateModal
          game={gate.ev.game_title}
          showToast={showToast}
          onCancel={() => setGate(null)}
          onSaved={() => { const ev = gate.ev; setGate(null); doRegister(ev); }}
        />
      )}
    </div>
  );
}

function EventSection({ title, events, teamForGame, registeredIds, busy, onAction }) {
  if (!events || events.length === 0) return null;
  return (
    <section style={{ marginBottom: 'var(--space-xl)' }}>
      <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>{title} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({events.length})</span></h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
        {events.map((ev) => (
          <EventCard key={ev.id} ev={ev} team={teamForGame(ev.game_title)} registered={registeredIds.has(ev.id)} busy={busy} onAction={onAction} />
        ))}
      </div>
    </section>
  );
}

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function EventCard({ ev, team, registered, busy, onAction }) {
  const start = fmtDate(ev.start_date);
  const deadline = fmtDate(ev.registration_deadline);
  const closed = ev.registration_open === false;
  const hasTeam = !!team;               // the caller's team for THIS game (or null)
  const isLeader = hasTeam && team.is_leader;
  const canAct = !registered && !closed && (!hasTeam || isLeader);

  let label;
  if (registered) label = '✓ Registered';
  else if (closed) label = 'Registration closed';
  else if (!hasTeam) label = '➕ Create a team to enter';
  else if (isLeader) label = '➕ Register this team';
  else label = 'Only your captain can register';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
        <div>
          <span className="badge badge-active" style={{ fontFamily: 'var(--font-heading)' }}>{ev.game_title}</span>
          <h3 style={{ margin: 'var(--space-xs) 0 0', color: 'var(--neon-blue)' }}>{ev.tournament_name}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>by {ev.organizer_name}</p>
        </div>
        {ev.prize_pool && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Prize</div>
            <div style={{ fontWeight: 700, color: 'var(--neon-cyan)' }}>{ev.prize_pool}</div>
          </div>
        )}
      </div>

      {ev.description && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{ev.description}</p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        {start && <span>🗓️ {start}</span>}
        <span>🛡️ {ev.registered_teams} team{ev.registered_teams === 1 ? '' : 's'} registered</span>
        <span>🎯 {ev.num_rounds} rounds</span>
      </div>

      {deadline && (
        <p style={{ margin: 0, fontSize: '0.75rem', color: closed ? 'var(--neon-red, #ff4d5e)' : 'var(--text-muted)' }}>
          {closed ? '⛔ Registration closed' : `⏳ Register by ${deadline}`}
        </p>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 'var(--space-sm)' }}>
        <button
          className={`btn btn-sm ${registered ? 'btn-secondary' : 'btn-primary'}`}
          style={{ width: '100%' }}
          disabled={!canAct || busy}
          onClick={() => onAction(ev)}
        >
          {label}
        </button>
      </div>
    </div>
  );
}

// ─── MY TEAMS (one per game, with a game switcher) ────
const chipStyle = (active) => ({
  border: `1px solid ${active ? 'var(--neon-blue)' : 'var(--border-color)'}`,
  background: active ? 'rgba(0, 212, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
  color: active ? 'var(--neon-blue)' : 'var(--text-secondary)',
  borderRadius: 'var(--radius-md)',
  padding: '0.45rem 0.9rem',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.82rem',
  transition: 'all .15s',
});

function MyTeamsTab({ myTeams, reload, showToast, preselectGame, clearPreselect, setActiveTab }) {
  const [selected, setSelected] = useState(() => (myTeams.length ? myTeams[0].id : 'new'));

  // External request to create a team (from an Overview event card)
  useEffect(() => { if (preselectGame) setSelected('new'); }, [preselectGame]);

  // Keep selection valid as the list changes (after create/join/disband/leave)
  useEffect(() => {
    if (selected === '__newest__') {
      setSelected(myTeams.length ? myTeams[myTeams.length - 1].id : 'new');
    } else if (selected !== 'new' && !myTeams.some((t) => t.id === selected)) {
      setSelected(myTeams.length ? myTeams[myTeams.length - 1].id : 'new');
    }
  }, [myTeams, selected]);

  const current = myTeams.find((t) => t.id === selected) || null;
  const showCreate = selected === 'new' || myTeams.length === 0;
  const onDone = () => { clearPreselect?.(); setSelected('__newest__'); };

  return (
    <div style={{ animation: 'fadeIn var(--transition-base)' }}>
      <div className="page-header">
        <h1 className="page-title">My Teams</h1>
        <p className="page-subtitle">One team per game — switch between them below.</p>
      </div>

      {/* Game switcher chips */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-lg)' }}>
        {myTeams.map((t) => (
          <button key={t.id} type="button" onClick={() => setSelected(t.id)} style={chipStyle(selected === t.id)}>
            {t.game} · {t.team_name}
          </button>
        ))}
        <button type="button" onClick={() => { clearPreselect?.(); setSelected('new'); }} style={chipStyle(showCreate)}>
          ➕ New team
        </button>
      </div>

      {showCreate
        ? <CreateJoinPanel reload={reload} showToast={showToast} preselectGame={preselectGame} existingGames={myTeams.map((t) => t.game)} onDone={onDone} />
        : current
          ? <TeamDetail team={current} reload={reload} showToast={showToast} setActiveTab={setActiveTab} />
          : null}
    </div>
  );
}

// Detail view for a single team (roster + registered events + management)
function TeamDetail({ team, reload, showToast, setActiveTab }) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);

  const players = team.players || [];
  const events = team.events || [];
  const isLeader = !!team.is_leader;
  const myRow = players.find((p) => p.user_id === user?.id) || null;

  const copyCode = () => { navigator.clipboard.writeText(team.unique_code); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const handleRename = async (newName) => {
    try { await api.patch(`/teams/${team.id}`, { team_name: newName }); setRenameOpen(false); showToast('Team name updated.'); reload(); }
    catch (err) { showToast(err.response?.data?.error || 'Failed to rename team.', 'error'); }
  };
  const handleSavePlayer = async (id, data) => {
    try { await api.patch(`/players/${id}`, data); setEditPlayer(null); showToast('Player updated.'); reload(); }
    catch (err) { showToast(err.response?.data?.error || 'Failed to update player.', 'error'); }
  };
  const handleRemove = async (p) => {
    if (!window.confirm(`Remove ${p.full_name} from the team?`)) return;
    try { await api.delete(`/players/${p.id}`); showToast('Player removed.'); reload(); }
    catch (err) { showToast(err.response?.data?.error || 'Failed to remove player.', 'error'); }
  };
  const handleLeave = async () => {
    if (!myRow || !window.confirm(`Leave ${team.team_name}?`)) return;
    try { await api.delete(`/players/${myRow.id}`); showToast('You left the team.'); reload(); }
    catch (err) { showToast(err.response?.data?.error || 'Failed to leave team.', 'error'); }
  };
  const handleDisband = async () => {
    if (!window.confirm(`Disband ${team.team_name}? This deletes the team and all its registrations. This can't be undone.`)) return;
    try { await api.delete(`/teams/${team.id}`); showToast('Team disbanded.'); reload(); }
    catch (err) { showToast(err.response?.data?.error || 'Failed to disband team.', 'error'); }
  };

  return (
    <div>
      <section className="card card-glow" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <h2 style={{ color: 'var(--neon-blue)' }}>{team.team_name}</h2>
            <span className="badge badge-active" style={{ fontFamily: 'var(--font-heading)' }}>{team.game}</span>
            {isLeader && <span className="badge badge-active">Team Leader</span>}
          </div>
          {isLeader && (
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setRenameOpen(true)}>✏️ Rename</button>
              <button className="btn btn-danger btn-sm" onClick={handleDisband}>🗑️ Disband</button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 'var(--space-lg)' }}>
          <label className="form-label">Team Join Code — share with teammates</label>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <code style={{ flexGrow: 1, background: 'var(--bg-input)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', color: 'var(--neon-cyan)', fontFamily: 'var(--font-heading)', letterSpacing: '2px' }}>
              {team.unique_code}
            </code>
            <button className="btn btn-secondary btn-sm" onClick={copyCode}>{copied ? 'Copied!' : 'Copy'}</button>
          </div>
        </div>
      </section>

      {/* Registered events */}
      <section className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
          <h3 style={{ margin: 0 }}>Registered Events ({events.length})</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('overview')}>➕ Register for an event</button>
        </div>
        {events.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Not registered for any events yet — head to <strong>Overview</strong> to enter {team.game} tournaments.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {events.map((e) => (
              <div key={e.game_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-sm)', padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{e.tournament_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{e.total_teams} teams · {e.num_rounds} rounds</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--neon-blue)', fontFamily: 'var(--font-heading)' }}>#{e.rank}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{e.total_score} pts</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Roster */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
          <h3 style={{ margin: 0 }}>Roster ({players.length})</h3>
          {!isLeader && myRow && <button className="btn btn-danger btn-sm" onClick={handleLeave}>🚪 Leave Team</button>}
        </div>

        {players.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No teammates on the roster yet — share your code above so players can join.
          </p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Player</th><th>In-Game Name</th><th>Contact</th><th style={{ width: 140, textAlign: 'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const isMe = p.user_id === user?.id;
                  const canEdit = isLeader || isMe;
                  return (
                    <tr key={p.id}>
                      <td><div style={{ fontWeight: 600 }}>{p.full_name} {isMe && <span style={{ fontSize: '0.7rem', color: 'var(--neon-cyan)' }}>(you)</span>}</div></td>
                      <td><span className="badge badge-active" style={{ fontFamily: 'var(--font-heading)' }}>{p.in_game_name}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><div>{p.email || '—'}</div><div>{p.phone || '—'}</div></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {canEdit && <button className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', marginRight: 4 }} onClick={() => setEditPlayer(p)}>✏️</button>}
                        {isLeader && !isMe && <button className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleRemove(p)}>🗑️</button>}
                        {isMe && !isLeader && <button className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={handleLeave}>🚪</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {renameOpen && <RenameModal current={team.team_name} onCancel={() => setRenameOpen(false)} onSave={handleRename} />}
      {editPlayer && <EditPlayerModal player={editPlayer} onCancel={() => setEditPlayer(null)} onSave={handleSavePlayer} />}
    </div>
  );
}

// ─── CREATE / JOIN a team (one per game) ───
function CreateJoinPanel({ reload, showToast, preselectGame, existingGames = [], onDone }) {
  const [mode, setMode] = useState('create'); // create | join

  return (
    <section className="card card-glow" style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border-color)' }}>
        <TabButton active={mode === 'create'} onClick={() => setMode('create')}>➕ Create a Team</TabButton>
        <TabButton active={mode === 'join'} onClick={() => setMode('join')}>🤝 Join a Team</TabButton>
      </div>

      {mode === 'create'
        ? <CreateTeamForm reload={reload} showToast={showToast} preselectGame={preselectGame} existingGames={existingGames} onDone={onDone} />
        : <JoinTeamForm reload={reload} showToast={showToast} onDone={onDone} />}
    </section>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${active ? 'var(--neon-blue)' : 'transparent'}`,
        color: active ? 'var(--neon-blue)' : 'var(--text-secondary)',
        padding: '0.5rem 0.9rem',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.9rem',
      }}
    >
      {children}
    </button>
  );
}

function CreateTeamForm({ reload, showToast, preselectGame, existingGames = [], onDone }) {
  const [game, setGame] = useState(preselectGame || null);
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const taken = new Set(existingGames.map((g) => g.toLowerCase()));
  const available = ESPORTS_GAMES.filter((g) => !taken.has(g.toLowerCase()));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/teams/create', { team_name: teamName, game });
      showToast('Team created! Register it for events from Overview.');
      await reload();
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create team.');
      setLoading(false);
    }
  };

  // ── Step 1: which game does your team play? ──
  if (!game) {
    return (
      <div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>Which game does your team play?</p>
        {available.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>You already have a team for every listed game. 🎉</p>
        ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-sm)' }}>
          {available.map((g) => (
            <button
              type="button"
              key={g}
              onClick={() => setGame(g)}
              style={{
                cursor: 'pointer', textAlign: 'center', padding: '0.7rem 0.5rem',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                background: 'transparent', color: 'var(--neon-blue)', fontWeight: 700, fontSize: '0.85rem', transition: 'all .15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--neon-blue)'; e.currentTarget.style.background = 'rgba(0,212,255,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'transparent'; }}
            >
              {g}
            </button>
          ))}
        </div>
        )}
      </div>
    );
  }

  // ── Step 2: name the team ──
  return (
    <form onSubmit={submit}>
      <button type="button" onClick={() => setGame(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, marginBottom: 'var(--space-sm)', fontSize: '0.8rem' }}>← Change game</button>
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <span className="badge badge-active" style={{ fontFamily: 'var(--font-heading)' }}>{game}</span>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 'var(--space-md)' }}>{error}</div>}

      <div className="form-group">
        <label className="form-label">Team Name</label>
        <input className="form-input" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Shadow Strikers" required />
      </div>
      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
        {loading ? <span className="spinner"></span> : 'Create Team'}
      </button>
      <p style={{ marginTop: 'var(--space-sm)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        You'll register for {game} tournaments from the Overview tab.
      </p>
    </form>
  );
}

// Prompts for a game's IGN/UID when registering requires it, saves, then retries.
function GameGateModal({ game, showToast, onCancel, onSaved }) {
  const [ign, setIgn] = useState('');
  const [uid, setUid] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/auth/profile/game', { game, ign, uid });
      showToast(`${game} profile saved.`);
      onSaved();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save game profile.', 'error');
      setSaving(false);
    }
  };

  const c = gameCfg(game);
  const preview = formatGameId(game, ign, uid);

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 className="modal-title">Complete your {game} profile</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
          To register for this {game} event, add your {c.f1} and {c.f2}. This saves to your profile for next time.
        </p>
        <form onSubmit={save}>
          <div className="form-group">
            <GameIdInputs game={game} ign={ign} uid={uid} onIgn={setIgn} onUid={setUid} />
            {preview && (
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Shows as <span style={{ color: 'var(--neon-cyan)', fontWeight: 600 }}>{preview}</span>
              </p>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !ign.trim() || !uid.trim()}>
              {saving ? <span className="spinner"></span> : 'Save & Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JoinTeamForm({ reload, showToast, onDone }) {
  const [form, setForm] = useState({ in_game_name: '', email: '', phone: '', team_code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/players/join', form);
      showToast(`Joined ${res.data.team_name || 'the team'}!`);
      await reload();
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join team.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {error && <div className="auth-error" style={{ marginBottom: 'var(--space-md)' }}>{error}</div>}
      <div className="form-group">
        <label className="form-label">In-Game Name</label>
        <input name="in_game_name" className="form-input" value={form.in_game_name} onChange={change} placeholder="Your in-game username / ID" required />
      </div>
      <div className="form-group">
        <label className="form-label">Team Code</label>
        <input name="team_code" className="form-input" value={form.team_code} onChange={change} placeholder="Code from your team leader" required
          style={{ fontFamily: 'var(--font-heading)', letterSpacing: '3px', textTransform: 'uppercase' }} />
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Email (optional)</label>
          <input name="email" type="email" className="form-input" value={form.email} onChange={change} placeholder="your@email.com" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Phone (optional)</label>
          <input name="phone" className="form-input" value={form.phone} onChange={change} placeholder="+1 234 567 890" />
        </div>
      </div>
      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
        {loading ? <span className="spinner"></span> : 'Join Team'}
      </button>
    </form>
  );
}

// ─── STANDINGS ────────────────────────────────────────
function StandingsTab({ myTeams, setActiveTab }) {
  const rows = myTeams.flatMap((t) => (t.events || []).map((e) => ({ ...e, team_name: t.team_name, game: t.game })));

  return (
    <div style={{ animation: 'fadeIn var(--transition-base)' }}>
      <div className="page-header">
        <h1 className="page-title">Standings</h1>
        <p className="page-subtitle">Your teams across all their events</p>
      </div>

      {myTeams.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🏆</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>You need a team to have a standing.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('team')}>Go to My Teams →</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🏆</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>None of your teams are registered for events yet.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('overview')}>Browse events →</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
          {rows.map((e) => (
            <section key={`${e.game_id}`} className="card card-glow">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)', flexWrap: 'wrap' }}>
                <span className="badge badge-active" style={{ fontFamily: 'var(--font-heading)' }}>{e.game}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.team_name}</span>
              </div>
              <h3 style={{ color: 'var(--neon-blue)', marginBottom: 'var(--space-xs)' }}>{e.tournament_name}</h3>
              <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--neon-blue)', fontFamily: 'var(--font-heading)' }}>#{e.rank}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>of {e.total_teams}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--neon-cyan)', fontFamily: 'var(--font-heading)' }}>{e.total_score}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>points</div>
                </div>
                <div style={{ flexGrow: 1, minWidth: 140 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.3rem' }}>Per-round</div>
                  {e.round_scores && e.round_scores.length > 0 ? (
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {e.round_scores.map((r, i) => <span key={i} className="badge badge-active" title={`Round ${i + 1}`}>R{i + 1}: {r}</span>)}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Awaiting scores.</span>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 'var(--space-md)' }}>
                <Link to="/scoreboard" className="btn btn-secondary btn-sm">Full Scoreboard →</Link>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────
function ProfileTab({ showToast }) {
  const { updateUser } = useAuth();
  const [form, setForm] = useState({
    display_name: '', email: '', phone: '', games: [],
    date_of_birth: '', country: '', city: '', gender: '', language: '',
    looking_for_team: false, preferred_role: '', bio: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then((res) => {
        const u = res.data.user;
        setForm({
          display_name: u.displayName || '', email: u.email || '', phone: u.phone || '', games: u.games || [],
          date_of_birth: u.dateOfBirth || '', country: u.country || '', city: u.city || '', gender: u.gender || '', language: u.language || '',
          looking_for_team: !!u.lookingForTeam, preferred_role: u.preferredRole || '', bio: u.bio || '',
        });
      })
      .catch(() => showToast('Failed to load profile.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const toggleGame = (g) =>
    setForm((f) => {
      const exists = f.games.some((e) => e.game === g);
      return { ...f, games: exists ? f.games.filter((e) => e.game !== g) : [...f.games, { game: g, ign: '', uid: '', rank: '', role: '' }] };
    });
  const setGameField = (g, field, val) =>
    setForm((f) => ({ ...f, games: f.games.map((e) => (e.game === g ? { ...e, [field]: val } : e)) }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/auth/profile', form);
      updateUser({ displayName: res.data.user.displayName }); // keep sidebar greeting in sync
      showToast('Profile saved.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Completion = mobile + email + at least one game with IGN & UID filled
  const completeGames = form.games.filter((g) => g.ign?.trim() && g.uid?.trim()).length;
  const filled = [form.phone, form.email].filter(Boolean).length + (completeGames ? 1 : 0);
  const pct = Math.round((filled / 3) * 100);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}><span className="spinner spinner-lg"></span></div>;
  }

  return (
    <div style={{ animation: 'fadeIn var(--transition-base)' }}>
      <div className="page-header">
        <h1 className="page-title">Profile &amp; Settings</h1>
        <p className="page-subtitle">Complete your profile so organisers and teammates can reach you.</p>
      </div>

      <form onSubmit={save} style={{ maxWidth: 700 }}>
        <section className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              <span>Profile completion</span><span>{pct}%</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-input)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--neon-blue)', transition: 'width .3s' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input name="display_name" className="form-input" value={form.display_name} onChange={change} placeholder="Your name" />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
              <label className="form-label">Mobile Number</label>
              <input name="phone" className="form-input" value={form.phone} onChange={change} placeholder="+91 98765 43210" />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
              <label className="form-label">Email</label>
              <input name="email" type="email" className="form-input" value={form.email} onChange={change} placeholder="you@example.com" />
            </div>
          </div>
        </section>

        <section className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ marginBottom: 'var(--space-md)' }}>Player Details</h3>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">
                Date of Birth
                {computeAge(form.date_of_birth) != null && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · age {computeAge(form.date_of_birth)}</span>}
              </label>
              <input name="date_of_birth" type="date" className="form-input" value={form.date_of_birth} onChange={change} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">Gender</label>
              <select name="gender" className="form-select" value={form.gender} onChange={change}>
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
              <label className="form-label">Country</label>
              <input name="country" className="form-input" value={form.country} onChange={change} placeholder="e.g. India" />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
              <label className="form-label">City</label>
              <input name="city" className="form-input" value={form.city} onChange={change} placeholder="e.g. Mumbai" />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
              <label className="form-label">Language</label>
              <input name="language" className="form-input" value={form.language} onChange={change} placeholder="e.g. English, Hindi" />
            </div>
          </div>
        </section>

        <section className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ marginBottom: 'var(--space-md)' }}>Availability &amp; About</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', marginBottom: 'var(--space-md)' }}>
            <input type="checkbox" checked={form.looking_for_team} onChange={(e) => setForm({ ...form, looking_for_team: e.target.checked })} style={{ accentColor: 'var(--neon-blue)' }} />
            <span style={{ fontWeight: 600, color: form.looking_for_team ? 'var(--neon-blue)' : 'var(--text-secondary)' }}>🔎 I'm looking for a team</span>
          </label>
          <div className="form-group">
            <label className="form-label">Preferred Role</label>
            <input name="preferred_role" className="form-input" value={form.preferred_role} onChange={change} placeholder="e.g. IGL, Entry Fragger, Support" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Bio</label>
            <textarea name="bio" className="form-input" rows="3" value={form.bio} onChange={change} placeholder="A short intro — your experience, achievements, what you're looking for…" />
          </div>
        </section>

        <section className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ marginBottom: 'var(--space-xs)' }}>Games you play competitively</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 'var(--space-md)' }}>
            Pick the games you compete in and add your in-game name &amp; UID for each. These are optional here, but
            <strong> required to register for an event of that game</strong>. ({completeGames}/{form.games.length} completed)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
            {ESPORTS_GAMES.map((g) => {
              const entry = form.games.find((e) => e.game === g);
              const on = !!entry;
              const incomplete = on && !(entry.ign?.trim() && entry.uid?.trim());
              return (
                <div
                  key={g}
                  style={{
                    border: `1px solid ${on ? 'var(--neon-blue)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '0.6rem 0.75rem',
                    background: on ? 'rgba(0, 212, 255, 0.05)' : 'transparent',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: on ? 'var(--neon-blue)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={on} onChange={() => toggleGame(g)} style={{ accentColor: 'var(--neon-blue)' }} />
                    {g}
                    {incomplete && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>IGN/UID pending</span>}
                  </label>
                  {on && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <GameIdInputs game={g} ign={entry.ign} uid={entry.uid} onIgn={(v) => setGameField(g, 'ign', v)} onUid={(v) => setGameField(g, 'uid', v)} small />
                      {formatGameId(g, entry.ign, entry.uid) && (
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Shows as <span style={{ color: 'var(--neon-cyan)', fontWeight: 600 }}>{formatGameId(g, entry.ign, entry.uid)}</span>
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <input className="form-input" style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', flex: 1 }} placeholder="Current rank (optional)" value={entry.rank || ''} onChange={(e) => setGameField(g, 'rank', e.target.value)} />
                        {GAME_ROLES[g] ? (
                          <select className="form-select" style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', flex: 1 }} value={entry.role || ''} onChange={(e) => setGameField(g, 'role', e.target.value)}>
                            <option value="">Role (optional)</option>
                            {GAME_ROLES[g].map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : (
                          <input className="form-input" style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', flex: 1 }} placeholder="Role (optional)" value={entry.role || ''} onChange={(e) => setGameField(g, 'role', e.target.value)} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner"></span> : '💾 Save Profile'}
        </button>
      </form>
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────
function RenameModal({ current, onCancel, onSave }) {
  const [name, setName] = useState(current);
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 className="modal-title">Rename Team</h2>
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave(name.trim()); }}>
          <div className="form-group">
            <label className="form-label">Team Name</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!name.trim() || name.trim() === current}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditPlayerModal({ player, onCancel, onSave }) {
  const [form, setForm] = useState({
    full_name: player.full_name || '',
    in_game_name: player.in_game_name || '',
    email: player.email || '',
    phone: player.phone || '',
  });
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 className="modal-title">Edit Player</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSave(player.id, form); }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input name="full_name" className="form-input" value={form.full_name} onChange={change} required />
          </div>
          <div className="form-group">
            <label className="form-label">In-Game Name (IGN)</label>
            <input name="in_game_name" className="form-input" value={form.in_game_name} onChange={change} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email (optional)</label>
            <input name="email" type="email" className="form-input" value={form.email} onChange={change} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone (optional)</label>
            <input name="phone" className="form-input" value={form.phone} onChange={change} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
