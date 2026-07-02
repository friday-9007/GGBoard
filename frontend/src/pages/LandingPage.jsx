/**
 * Landing Page — ggBoard
 * Introduction / marketing page explaining what GGBoard is, with
 * Sign In (Team Leader login) and Sign Up (Create Team) entry points.
 */

import { Link } from 'react-router-dom';
import './LandingPage.css';

const FEATURES = [
  {
    icon: '🛡️',
    title: 'Tournament Control',
    desc: 'Admins create games & tournaments, set custom round counts, toggle status, and export rosters or standings to CSV.',
  },
  {
    icon: '🎮',
    title: 'Instant Team Registration',
    desc: 'Sign up as a player, create a team, and instantly get a unique join code to share with your teammates.',
  },
  {
    icon: '🤝',
    title: 'Easy Player Onboarding',
    desc: 'Players join their squad in seconds using only the team code. Rosters update automatically.',
  },
  {
    icon: '🏆',
    title: 'Live Ranked Scoreboards',
    desc: 'Per-round scoring with automatic totals and live rankings that spotlight the top three teams.',
  },
];

const STEPS = [
  { n: '01', title: 'Organizer creates a tournament', desc: 'An organizer signs up and sets the game, tournament name, and number of rounds.' },
  { n: '02', title: 'Player creates a team', desc: 'A player signs up, creates a team for a tournament, and gets a unique join code.' },
  { n: '03', title: 'Teammates join', desc: 'Other players sign up and enter the team code to join the roster.' },
  { n: '04', title: 'Scores go live', desc: 'The organizer posts round scores; the public scoreboard ranks teams in real time.' },
];

export default function LandingPage() {
  return (
    <div className="landing">
      {/* Animated background */}
      <div className="landing-bg">
        <div className="grid-overlay"></div>
        <div className="particle p1"></div>
        <div className="particle p2"></div>
        <div className="particle p3"></div>
        <div className="particle p4"></div>
        <div className="particle p5"></div>
        <div className="particle p6"></div>
        <div className="hex-grid">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="hex" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}></div>
          ))}
        </div>
      </div>

      <div className="landing-content">
        {/* ─── Top Navigation ─── */}
        <nav className="landing-nav">
          <Link to="/" className="nav-logo">
            <span className="logo-gg">GG</span><span className="logo-board">BOARD</span>
          </Link>
          <div className="nav-links">
            <Link to="/scoreboard" className="nav-link">Scoreboard</Link>
            <Link to="/auth?mode=signin" className="nav-link">Sign In</Link>
            <Link to="/auth?mode=signup" id="nav-get-started" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        </nav>

        {/* ─── Hero ─── */}
        <header className="hero">
          <span className="hero-eyebrow">🎮 Esports Event Management Platform</span>
          <h1 className="hero-title">
            Run Esports Tournaments,<br />
            <span className="hero-accent">End&nbsp;to&nbsp;End.</span>
          </h1>
          <p className="hero-desc">
            <strong>GGBoard</strong> is an all-in-one platform for hosting competitive esports events.
            Organizers spin up tournaments, players sign up and register teams in seconds,
            teammates join with a code, and fans follow live, auto-ranked scoreboards — all in one place.
          </p>
          <div className="hero-cta">
            <Link to="/auth?mode=signup" id="hero-get-started" className="btn btn-primary">Get Started →</Link>
            <Link to="/scoreboard" className="btn btn-secondary">View Live Scoreboard</Link>
          </div>
          <p className="hero-signin">
            Already have an account? <Link to="/auth?mode=signin">Sign in →</Link>
          </p>
        </header>

        {/* ─── Features ─── */}
        <section className="section" id="features">
          <h2 className="section-title">Everything you need to run an event</h2>
          <p className="section-subtitle">From the first bracket to the final podium.</p>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <article key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── How it works ─── */}
        <section className="section">
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle">Four simple steps from setup to live standings.</p>
          <div className="steps-grid">
            {STEPS.map((s) => (
              <article key={s.n} className="step-card">
                <span className="step-num">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="cta-band">
          <h2>Ready to run your tournament?</h2>
          <p>Register a team to get started, or explore a live scoreboard first.</p>
          <div className="hero-cta">
            <Link to="/auth?mode=signup" className="btn btn-primary">Get Started</Link>
            <Link to="/scoreboard" className="btn btn-secondary">View Scoreboard</Link>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="landing-footer">
          <div className="footer-brand">
            <span className="logo-gg">GG</span><span className="logo-board">BOARD</span>
          </div>
          <div className="footer-links">
            <Link to="/auth?mode=signin">Sign In</Link>
            <Link to="/auth?mode=signup">Get Started</Link>
            <Link to="/scoreboard">Scoreboard</Link>
          </div>
          <p className="footer-copy">© 2026 GGBoard — Built for competitive gaming</p>
        </footer>
      </div>
    </div>
  );
}
