/**
 * Authentication & Authorization Middleware
 * Handles JWT verification and role-based access control.
 */

const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('\n❌ FATAL: JWT_SECRET is not set.');
  console.error('   Copy backend/.env.example to backend/.env and set a strong JWT_SECRET.');
  console.error('   Generate one: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n');
  process.exit(1);
}

/**
 * Verify JWT token from Authorization header.
 * Attaches decoded user info to req.user
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role, teamId }
    next();
  } catch (err) {
    // 401 = authentication failure (bad/expired token); 403 is reserved for
    // authorization denials so clients can tell "re-login" apart from "not allowed"
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Require authenticated user (any role)
 */
function requireAuth(req, res, next) {
  verifyToken(req, res, next);
}

/**
 * Require admin (organizer) role
 */
function requireAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  });
}

/**
 * Require team leader (player) role
 */
function requireTeamLeader(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'team_leader') {
      return res.status(403).json({ error: 'Team leader access required.' });
    }
    next();
  });
}

/**
 * Require admin OR team leader
 */
function requireAdminOrLeader(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'team_leader') {
      return res.status(403).json({ error: 'Admin or team leader access required.' });
    }
    next();
  });
}

/**
 * Generate a JWT. `role` is 'admin' (organizer account) or 'team_leader' (player account),
 * which also tells us which account table the id lives in.
 */
function generateToken({ id, username, role }) {
  return jwt.sign({ id, username, role }, JWT_SECRET, { expiresIn: '24h' });
}

module.exports = {
  verifyToken,
  requireAuth,
  requireAdmin,
  requireTeamLeader,
  requireAdminOrLeader,
  generateToken
};
