/**
 * Landing Page — ggBoard
 * Esports-themed entry point with animated background
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showPlayerMenu, setShowPlayerMenu] = useState(false);

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
              animationDuration: `${3 + Math.random() * 4}s`
            }}></div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="landing-content">
        <div className="landing-hero">
          <div className="logo-container">
            <div className="logo-glow"></div>
            <h1 className="logo-text">
              <span className="logo-gg">GG</span>
              <span className="logo-board">BOARD</span>
            </h1>
          </div>
          <p className="landing-tagline">ESPORTS EVENT MANAGEMENT PLATFORM</p>
          <div className="landing-divider">
            <div className="divider-line"></div>
            <div className="divider-dot"></div>
            <div className="divider-line"></div>
          </div>
        </div>

        <div className="landing-actions">
          {/* Admin Login */}
          <button
            id="btn-admin-login"
            className="action-card"
            onClick={() => navigate('/admin/login')}
          >
            <div className="action-icon">🛡️</div>
            <div className="action-info">
              <h3>Admin Login</h3>
              <p>Tournament management & control</p>
            </div>
            <div className="action-arrow">→</div>
          </button>

          {/* Player / Team */}
          <div className="action-card-group">
            <button
              id="btn-player-team"
              className="action-card"
              onClick={() => setShowPlayerMenu(!showPlayerMenu)}
            >
              <div className="action-icon">🎮</div>
              <div className="action-info">
                <h3>Player / Team</h3>
                <p>Join, create, or manage your team</p>
              </div>
              <div className={`action-arrow ${showPlayerMenu ? 'rotated' : ''}`}>→</div>
            </button>

            {showPlayerMenu && (
              <div className="sub-menu">
                <button id="btn-leader-login" className="sub-menu-item" onClick={() => navigate('/leader/login')}>
                  <span className="sub-icon">👑</span> Login as Team Leader
                </button>
                <button id="btn-create-team" className="sub-menu-item" onClick={() => navigate('/create-team')}>
                  <span className="sub-icon">➕</span> Create a Team
                </button>
                <button id="btn-join-team" className="sub-menu-item" onClick={() => navigate('/join-team')}>
                  <span className="sub-icon">🤝</span> Join a Team
                </button>
              </div>
            )}
          </div>

          {/* Scoreboard */}
          <button
            id="btn-scoreboard"
            className="action-card"
            onClick={() => navigate('/scoreboard')}
          >
            <div className="action-icon">🏆</div>
            <div className="action-info">
              <h3>Scoreboard</h3>
              <p>View live tournament standings</p>
            </div>
            <div className="action-arrow">→</div>
          </button>
        </div>

        <footer className="landing-footer">
          <p>© 2026 ggBoard — Built for competitive gaming</p>
        </footer>
      </div>
    </div>
  );
}
