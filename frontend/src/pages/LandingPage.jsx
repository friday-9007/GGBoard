/**
 * Landing Page — GGBoard Bento-Style Portal
 * Asymmetric grid layout with embedded live demos, marquee ticker, and bold hero.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LIVE_TICKER_ITEMS = [
  '🔴 VALORANT Champions — Sentinels vs Fnatic — LIVE',
  '🏆 CS2 Major Qualifier — Round 3 of 5',
  '⚡ Apex Global Series — 20 teams competing',
  '🔴 Rocket League Cup — Quarter-Finals LIVE',
  '👑 LoL Invitational — Final standings posted',
  '⚔️ DOTA 2 Pro Circuit — Registration open',
];

const DEMO_STANDINGS = [
  { rank: 1, name: 'Sentinels', pts: 75, icon: '🥇' },
  { rank: 2, name: 'Fnatic', pts: 67, icon: '🥈' },
  { rank: 3, name: 'Paper Rex', pts: 60, icon: '🥉' },
  { rank: 4, name: 'DRX Esports', pts: 52, icon: '4' },
  { rank: 5, name: 'LOUD', pts: 48, icon: '5' },
];

const DEMO_BRACKET = [
  { team1: 'Sentinels', s1: 2, team2: 'Fnatic', s2: 1, done: true },
  { team1: 'Paper Rex', s1: 2, team2: 'DRX', s2: 0, done: true },
  { team1: 'Sentinels', s1: 1, team2: 'Paper Rex', s2: 0, done: false },
];

export default function LandingPage() {
  const [tickerOffset, setTickerOffset] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTickerOffset(prev => prev - 1), 30);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bento-landing">

      {/* ─── Floating Nav ─── */}
      <nav className="bl-nav">
        <Link to="/" className="bl-brand">
          <span className="bl-logo-mark">GG</span>
          <span className="bl-logo-text">BOARD</span>
        </Link>
        <div className="bl-nav-links">
          <Link to="/scoreboard" className="bl-nav-link">Scoreboards</Link>
          <Link to="/auth?mode=signin" className="bl-nav-link">Log In</Link>
          <Link to="/auth?mode=signup" className="bl-nav-cta">Get Started</Link>
        </div>
      </nav>

      {/* ─── Live Tournament Marquee ─── */}
      <div className="bl-marquee-bar">
        <div className="bl-marquee-track" style={{ transform: `translateX(${tickerOffset}px)` }}>
          {[...LIVE_TICKER_ITEMS, ...LIVE_TICKER_ITEMS, ...LIVE_TICKER_ITEMS].map((item, i) => (
            <span key={i} className="bl-marquee-item">{item}</span>
          ))}
        </div>
      </div>

      {/* ─── Hero ─── */}
      <header className="bl-hero">
        <div className="bl-hero-orb bl-hero-orb-1"></div>
        <div className="bl-hero-orb bl-hero-orb-2"></div>

        <p className="bl-hero-tag">Tournament Infrastructure for Esports</p>
        <h1 className="bl-hero-title">
          Run tournaments<br />
          <span className="bl-gradient-text">like the pros do.</span>
        </h1>
        <p className="bl-hero-desc">
          Brackets, live scoreboards, team passcodes, and instant standings — all in one platform. Free to start.
        </p>
        <div className="bl-hero-btns">
          <Link to="/auth?mode=signup" className="bl-btn-primary">Create Tournament →</Link>
          <Link to="/scoreboard" className="bl-btn-ghost">View Live Scores</Link>
        </div>
      </header>

      {/* ─── Bento Feature Grid ─── */}
      <section className="bl-bento-grid">

        {/* Cell 1: Live Bracket Preview — spans 2 cols */}
        <div className="bl-bento-cell bl-cell-wide bl-cell-bracket">
          <div className="cell-label">Live Bracket Engine</div>
          <div className="cell-bracket-demo">
            <div className="bracket-round">
              <span className="round-label">Semis</span>
              {DEMO_BRACKET.slice(0, 2).map((m, i) => (
                <div key={i} className="mini-match">
                  <div className={`mm-team ${m.done && m.s1 > m.s2 ? 'mm-winner' : ''}`}>
                    <span>{m.team1}</span><span className="mm-score">{m.s1}</span>
                  </div>
                  <div className={`mm-team ${m.done && m.s2 > m.s1 ? 'mm-winner' : ''}`}>
                    <span>{m.team2}</span><span className="mm-score">{m.s2}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="bracket-arrow">→</div>
            <div className="bracket-round">
              <span className="round-label">Grand Final</span>
              <div className="mini-match mm-final">
                <div className="mm-team mm-winner">
                  <span>{DEMO_BRACKET[2].team1}</span><span className="mm-score">{DEMO_BRACKET[2].s1}</span>
                </div>
                <div className="mm-team">
                  <span>{DEMO_BRACKET[2].team2}</span><span className="mm-score">{DEMO_BRACKET[2].s2}</span>
                </div>
                <span className="mm-live-dot">● LIVE</span>
              </div>
            </div>
          </div>
          <p className="cell-caption">Single & double elimination brackets generated instantly. Auto-seeding, bye rounds, and loser bracket support.</p>
        </div>

        {/* Cell 2: Standings Table */}
        <div className="bl-bento-cell bl-cell-standings">
          <div className="cell-label">Live Standings</div>
          <div className="cell-standings-table">
            {DEMO_STANDINGS.map(s => (
              <div key={s.rank} className={`st-row ${s.rank <= 3 ? 'st-podium' : ''}`}>
                <span className="st-rank">{s.icon}</span>
                <span className="st-name">{s.name}</span>
                <span className="st-pts">{s.pts} pts</span>
              </div>
            ))}
          </div>
          <p className="cell-caption">Real-time leaderboards updated every 15 seconds via automatic scoring sync.</p>
        </div>

        {/* Cell 3: Passcode Join */}
        <div className="bl-bento-cell bl-cell-passcode">
          <div className="cell-label">Squad Passcodes</div>
          <div className="cell-passcode-demo">
            <div className="passcode-display">
              <span className="pc-hash">#</span>
              <span className="pc-code">GG-VAL-2026</span>
            </div>
            <div className="pc-avatars">
              <span className="pc-avatar">T</span>
              <span className="pc-avatar">Z</span>
              <span className="pc-avatar">S</span>
              <span className="pc-avatar pc-avatar-add">+</span>
            </div>
          </div>
          <p className="cell-caption">Share one code. Teammates join instantly. No emails, no invites.</p>
        </div>

        {/* Cell 4: Formats */}
        <div className="bl-bento-cell bl-cell-formats">
          <div className="cell-label">Bracket Formats</div>
          <div className="cell-format-list">
            <div className="fmt-chip">🥊 Single Elim</div>
            <div className="fmt-chip">⚔️ Double Elim</div>
            <div className="fmt-chip">🔄 Round Robin</div>
            <div className="fmt-chip">🛡️ Swiss System</div>
          </div>
          <p className="cell-caption">Every major competitive format, auto-configured with proper seeding logic.</p>
        </div>

        {/* Cell 5: Stats — spans 2 cols */}
        <div className="bl-bento-cell bl-cell-wide bl-cell-stats">
          <div className="stats-row">
            <div className="stat-block">
              <span className="stat-num">1,400+</span>
              <span className="stat-lbl">Competitors</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-block">
              <span className="stat-num">24</span>
              <span className="stat-lbl">Active Tournaments</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-block">
              <span className="stat-num">&lt;50ms</span>
              <span className="stat-lbl">Score Sync</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-block">
              <span className="stat-num">$300K+</span>
              <span className="stat-lbl">Prize Pools Managed</span>
            </div>
          </div>
        </div>

      </section>

      {/* ─── Featured Tournaments ─── */}
      <section className="bl-tournaments-section">
        <h2 className="bl-section-title">Happening Now</h2>
        <div className="bl-tournament-row">
          {[
            { title: 'VALORANT Champions', game: 'VALORANT', status: 'LIVE', color: '#ff4655', icon: '🎯', teams: '32 teams' },
            { title: 'CS2 Major Qualifier', game: 'CS2', status: 'LIVE', color: '#f59e0b', icon: '💥', teams: '16 teams' },
            { title: 'Apex Global Series', game: 'APEX', status: 'Soon', color: '#ef4444', icon: '⚡', teams: '20 teams' },
            { title: 'DOTA 2 Pro Circuit', game: 'DOTA 2', status: 'Open', color: '#ea580c', icon: '⚔️', teams: '24 teams' },
          ].map((t, i) => (
            <Link to="/scoreboard" key={i} className="bl-tourn-card" style={{ '--card-accent': t.color }}>
              <div className="tc-top">
                <span className="tc-icon">{t.icon}</span>
                {t.status === 'LIVE' && <span className="tc-live-badge">● LIVE</span>}
              </div>
              <h3 className="tc-title">{t.title}</h3>
              <div className="tc-meta">
                <span>{t.game}</span>
                <span>·</span>
                <span>{t.teams}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="bl-cta">
        <h2>Start running tournaments<br /><span className="bl-gradient-text">in under 2 minutes.</span></h2>
        <p>Free. No credit card. Works with any game.</p>
        <Link to="/auth?mode=signup" className="bl-btn-primary bl-btn-lg">Create Your First Tournament →</Link>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bl-footer">
        <span>🏆 GGBOARD</span>
        <div className="bl-footer-links">
          <Link to="/scoreboard">Scoreboards</Link>
          <Link to="/auth?mode=signin">Sign In</Link>
          <Link to="/auth?mode=signup">Register</Link>
        </div>
      </footer>
    </div>
  );
}
